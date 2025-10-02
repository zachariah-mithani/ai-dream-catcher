import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';
import { 
  createCustomer, 
  createCheckoutSession, 
  createBillingPortalSession,
  getCustomerSubscription,
  cancelSubscription,
  handleSubscriptionEvent,
  getPricingInfo,
  STRIPE_CONFIG
} from '../stripe.js';

export const billingRouter = express.Router();

// Public routes (no auth required)
billingRouter.get('/pricing', async (req, res) => {
  try {
    const pricing = getPricingInfo();
    res.json(pricing);
  } catch (error) {
    console.error('Pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing information' });
  }
});

// Protected routes (auth required)
billingRouter.use(requireAuth);

function monthPeriod(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // e.g., 2025-10
}

function dayPeriod(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // e.g., 2025-10-15
}

// Get plan and usage snapshot
billingRouter.get('/status', async (req, res) => {
  try {
    const user = await db.prepare('SELECT plan, trial_end, created_at FROM users WHERE id = ?').get(req.user.id);
    const monthPeriodStr = monthPeriod();
    const dayPeriodStr = dayPeriod();
    
    // Get monthly usage (dreams, AI analysis)
    const monthlyRows = await db.prepare('SELECT metric, count FROM usage_counters WHERE user_id = ? AND period = ?').all(req.user.id, monthPeriodStr);
    const monthlyUsage = {};
    for (const r of monthlyRows) monthlyUsage[r.metric] = r.count;
    
    // Get daily usage (chat messages)
    const dailyRows = await db.prepare('SELECT metric, count FROM usage_counters WHERE user_id = ? AND period = ?').all(req.user.id, dayPeriodStr);
    const dailyUsage = {};
    for (const r of dailyRows) dailyUsage[r.metric] = r.count;
    
    // Combine usage, prioritizing daily for chat messages
    const usage = {
      ...monthlyUsage,
      ...dailyUsage // Daily usage overrides monthly for chat messages
    };
    
    res.json({ 
      plan: user?.plan || 'free', 
      trial_end: user?.trial_end || null, 
      period: monthPeriodStr,
      usage 
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load billing status' });
  }
});

// Increment a usage metric
const incSchema = z.object({ metric: z.enum(['dream_create','dream_edit','ai_analyze','chat_message']) });
billingRouter.post('/usage/increment', async (req, res) => {
  const parse = incSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const metric = parse.data.metric;
  
  // Use daily period for chat messages, monthly for others
  const period = metric === 'chat_message' ? dayPeriod() : monthPeriod();
  
  // SQLite/PG compatible upsert via wrapper
  const existing = await db.prepare('SELECT id, count FROM usage_counters WHERE user_id = ? AND metric = ? AND period = ?').get(req.user.id, metric, period);
  if (existing) {
    await db.prepare('UPDATE usage_counters SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
  } else {
    await db.prepare('INSERT INTO usage_counters (user_id, metric, period, count) VALUES (?, ?, ?, ?)').run(req.user.id, metric, period, 1);
  }
  const out = await db.prepare('SELECT metric, count FROM usage_counters WHERE user_id = ? AND metric = ? AND period = ?').get(req.user.id, metric, period);
  res.json(out);
});

// Pricing route moved to public section above

// Create Stripe checkout session
const checkoutSchema = z.object({ 
  priceId: z.enum(['monthly', 'yearly']),
  trialDays: z.number().min(0).max(14).optional().default(7)
});
billingRouter.post('/checkout', async (req, res) => {
  try {
    const parse = checkoutSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
    const { priceId, trialDays } = parse.data;
    
    // Get user info
    const user = await db.prepare('SELECT email, first_name, last_name FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if user already has a Stripe customer
    let customerId = null;
    const existingSubscription = await db.prepare('SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ?').get(req.user.id);
    
    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await createCustomer(
        req.user.id,
        user.email,
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
      );
      customerId = customer.id;
      
      // Store customer ID
      await db.prepare('INSERT OR REPLACE INTO user_subscriptions (user_id, stripe_customer_id, status) VALUES (?, ?, ?)')
        .run(req.user.id, customerId, 'pending');
    }
    
    // Create checkout session
    const priceIdMap = {
      monthly: STRIPE_CONFIG.PRICE_ID_MONTHLY,
      yearly: STRIPE_CONFIG.PRICE_ID_YEARLY
    };
    
    const successUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:4000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:4000'}/billing/cancel`;
    
    const session = await createCheckoutSession(
      customerId,
      priceIdMap[priceId],
      successUrl,
      cancelUrl,
      trialDays
    );
    
    res.json({ sessionId: session.id, sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      priceId: priceIdMap[priceId],
      customerId
    });
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
});

// Create billing portal session
billingRouter.post('/portal', async (req, res) => {
  try {
    const subscription = await db.prepare('SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ?').get(req.user.id);
    
    if (!subscription?.stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const returnUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:4000'}/billing`;
    const session = await createBillingPortalSession(subscription.stripe_customer_id, returnUrl);
    
    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Billing portal creation failed:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// Stripe webhook handler
billingRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = require('stripe').webhooks.constructEvent(
      req.body,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
    
    console.log('Received Stripe webhook:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionEvent(subscription);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionEvent(deletedSubscription);
        break;
        
      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object.id);
        break;
        
      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object.id);
        // Handle failed payment - could downgrade user or send notification
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

// Mock upgrade endpoint (for testing without Stripe)
const upgradeSchema = z.object({ plan: z.enum(['free','premium']) , trial_days: z.number().min(0).max(14).optional() });
billingRouter.post('/upgrade', async (req, res) => {
  const parse = upgradeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { plan, trial_days = 0 } = parse.data;
  let trial_end = null;
  if (trial_days > 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + trial_days);
    trial_end = d.toISOString();
  }
  await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?').run(plan, trial_end, req.user.id);
  const updated = await db.prepare('SELECT plan, trial_end FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, ...updated });
});


