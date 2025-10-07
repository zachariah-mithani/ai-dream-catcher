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
  STRIPE_CONFIG,
  verifyWebhookSignature
} from '../stripe.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const billingRouter = express.Router();

// ---- Apple IAP verification helpers ----
async function callAppleVerify(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  return data;
}

async function verifyAppleReceipt(receiptData) {
  if (!process.env.APPLE_SHARED_SECRET) {
    throw new Error('APPLE_SHARED_SECRET not configured');
  }
  const payload = { 'receipt-data': receiptData, password: process.env.APPLE_SHARED_SECRET, 'exclude-old-transactions': true };
  // Try production first
  let data = await callAppleVerify('https://buy.itunes.apple.com/verifyReceipt', payload);
  // If receipt is from sandbox (status 21007), retry sandbox
  if (data?.status === 21007) {
    data = await callAppleVerify('https://sandbox.itunes.apple.com/verifyReceipt', payload);
  }
  if (data?.status !== 0) {
    const code = typeof data?.status === 'number' ? data.status : 'unknown';
    throw new Error(`Apple verifyReceipt failed (status ${code})`);
  }
  // Extract latest expiration
  const infos = data?.latest_receipt_info || data?.receipt?.in_app || [];
  let latestMs = 0;
  for (const r of infos) {
    const ms = Number(r?.expires_date_ms || r?.expiration_intent || 0);
    const candidate = Number(r?.expires_date_ms || r?.expires_date || 0);
    const exp = isNaN(candidate) ? 0 : candidate;
    if (exp > latestMs) latestMs = exp;
  }
  return { expiresAt: latestMs ? new Date(Number(latestMs)).toISOString() : null };
}

// Exportable webhook handler so it can be mounted before body parsers
export async function billingWebhook(req, res) {
  try {
    const signature = req.headers['stripe-signature'];
    const event = verifyWebhookSignature(req.body, signature);
    console.log('Received Stripe webhook:', event.type);
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        // Get the subscription from the checkout session
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log('Retrieved subscription from checkout session:', subscription.id, 'status:', subscription.status);
          await handleSubscriptionEvent(subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionEvent(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object;
        await handleSubscriptionEvent(deletedSubscription);
        break;
      }
      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object.id);
        break;
      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
}

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

// Public success/cancel endpoints for Stripe Checkout redirects
billingRouter.get('/success', (req, res) => {
  const sessionId = req.query.session_id || '';
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment successful</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; line-height: 1.5; }
      .wrap { max-width: 560px; margin: 0 auto; text-align: center; }
      .btn { display: inline-block; margin-top: 16px; padding: 10px 14px; background: #4CAF50; color: #fff; text-decoration: none; border-radius: 6px; }
      code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h2>🎉 Payment successful</h2>
      <p>Your subscription is now active. You can close this tab and return to the app.</p>
      ${sessionId ? `<p>Session ID: <code>${sessionId}</code></p>` : ''}
      <a href="#" class="btn" onclick="window.close(); return false;">Close</a>
    </div>
    <script>
      try { window.opener && window.opener.postMessage({ type: 'stripe_checkout_success', sessionId: '${sessionId}' }, '*'); } catch (e) {}
    </script>
  </body>
</html>`);
});

billingRouter.get('/cancel', (req, res) => {
  res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Checkout canceled</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; line-height: 1.5; }
      .wrap { max-width: 560px; margin: 0 auto; text-align: center; }
      .btn { display: inline-block; margin-top: 16px; padding: 10px 14px; background: #333; color: #fff; text-decoration: none; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h2>Checkout canceled</h2>
      <p>No charges were made. You can close this tab and return to the app.</p>
      <a href="#" class="btn" onclick="window.close(); return false;">Close</a>
    </div>
    <script>
      try { window.opener && window.opener.postMessage({ type: 'stripe_checkout_canceled' }, '*'); } catch (e) {}
    </script>
  </body>
</html>`);
});

// (Webhook route is mounted at the app level before JSON parsing.)

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

// Verify Apple IAP receipt and grant premium
const appleVerifySchema = z.object({ receiptData: z.string().min(10) });
billingRouter.post('/apple/verify', async (req, res) => {
  try {
    const parse = appleVerifySchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
    const { receiptData } = parse.data;

    const { expiresAt } = await verifyAppleReceipt(receiptData);
    if (!expiresAt) return res.status(400).json({ error: 'Receipt has no active subscription' });

    // Store or update subscription expiry for this user
    await db
      .prepare('INSERT INTO user_subscriptions (user_id, apple_expires_at, status) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET apple_expires_at = ?, status = ?')
      .run(req.user.id, expiresAt, 'active', expiresAt, 'active');

    // Mark user premium while active
    await db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('premium', req.user.id);

    res.json({ ok: true, plan: 'premium', expires_at: expiresAt });
  } catch (e) {
    console.error('Apple verify failed:', e);
    res.status(400).json({ error: e.message || 'Verification failed' });
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
      await db.prepare('INSERT INTO user_subscriptions (user_id, stripe_customer_id, status) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ?, status = ?')
        .run(req.user.id, customerId, 'pending', customerId, 'pending');
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
      priceId: priceId,
      customerId: customerId || 'unknown'
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
      return res.status(404).json({ error: 'No Stripe customer found for this user' });
    }
    
    const returnUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:4000'}/billing`;
    const session = await createBillingPortalSession(subscription.stripe_customer_id, returnUrl);
    
    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Billing portal creation failed:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// (moved public webhook handler above)

// Manually reconcile subscription status for the current user
billingRouter.post('/reconcile', async (req, res) => {
  try {
    const subRow = await db
      .prepare('SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ?')
      .get(req.user.id);
    if (!subRow?.stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found for this user' });
    }
    const subscription = await getCustomerSubscription(subRow.stripe_customer_id);
    if (!subscription) {
      return res.status(404).json({ error: 'No Stripe subscription found for this customer' });
    }
    await handleSubscriptionEvent(subscription);
    const status = await db
      .prepare('SELECT plan, trial_end FROM users WHERE id = ?')
      .get(req.user.id);
    return res.json({ ok: true, plan: status?.plan || 'free', trial_end: status?.trial_end || null });
  } catch (error) {
    console.error('Reconcile failed:', error);
    return res.status(500).json({ error: 'Failed to reconcile subscription status' });
  }
});

// Cancel the active subscription (at period end by default)
const cancelSchema = z.object({ immediately: z.boolean().optional().default(false) });
billingRouter.post('/cancel', async (req, res) => {
  try {
    const parse = cancelSchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
    const { immediately } = parse.data;

    const sub = await db.prepare('SELECT stripe_subscription_id FROM user_subscriptions WHERE user_id = ?').get(req.user.id);
    if (!sub?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active Stripe subscription found' });
    }

    const result = await cancelSubscription(sub.stripe_subscription_id, immediately);
    res.json({ ok: true, status: result.status, cancel_at_period_end: result.cancel_at_period_end || false });
  } catch (error) {
    console.error('Subscription cancel failed:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
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


