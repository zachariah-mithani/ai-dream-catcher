/**
 * Comprehensive Error Handling Middleware
 * Handles all types of errors with proper logging and user-friendly responses
 */

import { ZodError } from 'zod';

// Error types for consistent handling
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class BillingError extends AppError {
  constructor(message, details = null) {
    super(message, 402, 'BILLING_ERROR');
    this.details = details;
  }
}

// Logging utility
function logError(error, req = null) {
  const timestamp = new Date().toISOString();
  const method = req?.method || 'UNKNOWN';
  const url = req?.url || 'UNKNOWN';
  const userAgent = req?.get('User-Agent') || 'UNKNOWN';
  const userId = req?.user?.id || 'ANONYMOUS';
  
  console.error(`[${timestamp}] ERROR: ${error.name}`);
  console.error(`Method: ${method}, URL: ${url}`);
  console.error(`User ID: ${userId}, User Agent: ${userAgent}`);
  console.error(`Message: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  
  if (error.details) {
    console.error(`Details:`, error.details);
  }
}

// Main error handler middleware
export function errorHandler(error, req, res, next) {
  // Log the error
  logError(error, req);
  
  // Handle different error types
  if (error instanceof AppError) {
    // Operational errors - send to client
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
  
  if (error instanceof ZodError) {
    // Validation errors from Zod
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details
    });
  }
  
  if (error.name === 'StripeError' || error.type === 'StripeInvalidRequestError') {
    // Stripe API errors
    return res.status(400).json({
      error: 'Payment processing error',
      code: 'STRIPE_ERROR',
      message: error.message
    });
  }
  
  if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
    // Database constraint errors
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'CONFLICT_ERROR'
    });
  }
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    // Network errors
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    // File upload errors
    return res.status(413).json({
      error: 'File too large',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
    
  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      originalError: error.message 
    })
  });
}

// Async error wrapper
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path
  });
}

// Graceful shutdown handler
export function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Error boundary for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Error boundary for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit the process as it's in an undefined state
  process.exit(1);
});
