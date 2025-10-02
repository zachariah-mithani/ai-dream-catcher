/**
 * Monitoring and Health Check Middleware
 * Provides comprehensive monitoring, metrics, and health checks
 */

import { db } from '../database.js';

// Health check status
let healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  uptime: process.uptime(),
  checks: {
    database: 'unknown',
    memory: 'unknown',
    disk: 'unknown'
  }
};

// Memory usage tracking
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  };
}

// Database health check
async function checkDatabase() {
  try {
    const start = Date.now();
    await db.prepare('SELECT 1 as test').get();
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Memory health check
function checkMemory() {
  const memory = getMemoryUsage();
  const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
  
  let status = 'healthy';
  if (heapUsagePercent > 90) {
    status = 'critical';
  } else if (heapUsagePercent > 80) {
    status = 'warning';
  }
  
  return {
    status,
    usage: memory,
    heapUsagePercent: Math.round(heapUsagePercent * 100) / 100
  };
}

// Request metrics tracking
const requestMetrics = {
  totalRequests: 0,
  errorRequests: 0,
  responseTimes: [],
  endpoints: {}
};

// Request tracking middleware
export function requestMetricsMiddleware(req, res, next) {
  const start = Date.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  // Increment total requests
  requestMetrics.totalRequests++;
  
  // Track endpoint usage
  if (!requestMetrics.endpoints[endpoint]) {
    requestMetrics.endpoints[endpoint] = {
      count: 0,
      totalTime: 0,
      errors: 0
    };
  }
  requestMetrics.endpoints[endpoint].count++;
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Track response time
    requestMetrics.responseTimes.push(duration);
    if (requestMetrics.responseTimes.length > 1000) {
      requestMetrics.responseTimes.shift(); // Keep only last 1000 requests
    }
    
    // Track endpoint metrics
    requestMetrics.endpoints[endpoint].totalTime += duration;
    
    // Track errors
    if (res.statusCode >= 400) {
      requestMetrics.errorRequests++;
      requestMetrics.endpoints[endpoint].errors++;
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Health check endpoint
export async function healthCheck(req, res) {
  try {
    // Update health status
    healthStatus.timestamp = new Date().toISOString();
    healthStatus.uptime = process.uptime();
    
    // Check database
    healthStatus.checks.database = await checkDatabase();
    
    // Check memory
    healthStatus.checks.memory = checkMemory();
    
    // Determine overall status
    const checks = Object.values(healthStatus.checks);
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasCritical = checks.some(check => check.status === 'critical');
    
    if (hasCritical) {
      healthStatus.status = 'critical';
    } else if (hasUnhealthy) {
      healthStatus.status = 'unhealthy';
    } else {
      healthStatus.status = 'healthy';
    }
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Metrics endpoint
export function metrics(req, res) {
  const avgResponseTime = requestMetrics.responseTimes.length > 0
    ? requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / requestMetrics.responseTimes.length
    : 0;
  
  const errorRate = requestMetrics.totalRequests > 0
    ? (requestMetrics.errorRequests / requestMetrics.totalRequests) * 100
    : 0;
  
  const topEndpoints = Object.entries(requestMetrics.endpoints)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgResponseTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      errorRate: data.count > 0 ? Math.round((data.errors / data.count) * 100) : 0
    }));
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: getMemoryUsage(),
    requests: {
      total: requestMetrics.totalRequests,
      errors: requestMetrics.errorRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime)
    },
    topEndpoints
  });
}

// System info endpoint (for debugging)
export function systemInfo(req, res) {
  res.json({
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memory: getMemoryUsage(),
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
}

// Performance monitoring middleware
export function performanceMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      console.error(`Error ${res.statusCode}: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
}

// Update health status periodically
setInterval(async () => {
  try {
    healthStatus.checks.database = await checkDatabase();
    healthStatus.checks.memory = checkMemory();
  } catch (error) {
    console.error('Health check update failed:', error);
  }
}, 30000); // Update every 30 seconds
