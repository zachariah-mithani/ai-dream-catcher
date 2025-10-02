import { db } from './database.js';

/**
 * Middleware to check and update trial status
 * Automatically downgrades expired trials to free
 */
export async function checkTrialStatus(userId) {
  const user = await db.prepare('SELECT plan, trial_end FROM users WHERE id = ?').get(userId);
  if (!user) return { plan: 'free', trial_end: null };
  
  let { plan, trial_end } = user;
  
  // Check if trial has expired
  if (trial_end && new Date(trial_end) < new Date()) {
    await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?').run('free', null, userId);
    plan = 'free';
    trial_end = null;
  }
  
  return { plan, trial_end };
}

/**
 * Check if user can perform an action based on their plan and usage
 */
export async function checkUsageLimit(userId, metric, limit, period) {
  const usage = await db.prepare('SELECT count FROM usage_counters WHERE user_id = ? AND metric = ? AND period = ?')
    .get(userId, metric, period);
  const currentCount = usage?.count || 0;
  
  return {
    allowed: currentCount < limit,
    current: currentCount,
    limit,
    remaining: Math.max(0, limit - currentCount)
  };
}

/**
 * Increment usage counter for a user
 */
export async function incrementUsage(userId, metric, period) {
  // If metric is part of AI pool, increment the pool instead
  const poolMetric = (metric === 'ai_analyze' || metric === 'chat_message') ? 'ai_pool' : metric;
  const existing = await db.prepare('SELECT id, count FROM usage_counters WHERE user_id = ? AND metric = ? AND period = ?')
    .get(userId, poolMetric, period);
  
  if (existing) {
    await db.prepare('UPDATE usage_counters SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(existing.id);
  } else {
    await db.prepare('INSERT INTO usage_counters (user_id, metric, period, count) VALUES (?, ?, ?, ?)')
      .run(userId, poolMetric, period, 1);
  }
}

/**
 * Get usage period strings
 */
export function getPeriods(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return {
    month: `${year}-${month}`,
    day: `${year}-${month}-${day}`
  };
}

/**
 * Plan limits configuration
 */
// Shared pool: ai_analyze + chat_message combined for free users
export const PLAN_LIMITS = {
  free: {
    dream_create: { limit: 10, period: 'month' },
    ai_pool: { limit: 10, period: 'month' }, // combined pool
    ai_analyze: { limit: 10, period: 'month' }, // alias for UI; enforced via ai_pool
    chat_message: { limit: 10, period: 'month' } // alias for UI; enforced via ai_pool
  },
  premium: {
    dream_create: { limit: Infinity, period: 'month' },
    ai_analyze: { limit: Infinity, period: 'month' },
    chat_message: { limit: Infinity, period: 'day' }
  }
};

/**
 * Billing middleware for protected routes
 */
export function createBillingMiddleware(metric) {
  return async (req, res, next) => {
    try {
      const { plan, trial_end } = await checkTrialStatus(req.user.id);
      const isPremium = plan === 'premium';
      
      // Premium users have unlimited access
      if (isPremium) {
        req.billing = { plan, trial_end, isPremium, unlimited: true };
        return next();
      }
      
      // Check limits for free users
      // If this metric is part of the AI pool, evaluate against ai_pool
      const poolMetric = (metric === 'ai_analyze' || metric === 'chat_message') ? 'ai_pool' : metric;
      const limits = PLAN_LIMITS.free[poolMetric];
      if (!limits) {
        return next(); // No limits defined for this metric
      }
      
      const periods = getPeriods();
      const periodKey = limits.period === 'day' ? 'day' : 'month';
      const period = periods[periodKey];
      
      const usageCheck = await checkUsageLimit(req.user.id, poolMetric, limits.limit, period);
      
      if (!usageCheck.allowed) {
        return res.status(403).json({
          error: `${metric.replace('_', ' ')} limit reached`,
          limit: limits.limit,
          used: usageCheck.current,
          period: limits.period,
          upgrade: 'Upgrade to premium for unlimited access'
        });
      }
      
      req.billing = { 
        plan, 
        trial_end, 
        isPremium, 
        unlimited: false, 
        usage: usageCheck,
        metric,
        period
      };
      
      next();
    } catch (error) {
      console.error('Billing middleware error:', error);
      res.status(500).json({ error: 'Billing check failed' });
    }
  };
}
