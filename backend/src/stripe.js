import Stripe from 'stripe';

// Initialize Stripe with fallback for development
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeKey);

// Stripe product and price IDs (configure these in your Stripe dashboard)
export const STRIPE_CONFIG = {
  PRODUCT_ID: process.env.STRIPE_PRODUCT_ID || 'prod_premium_dream_catcher',
  PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || 'price_monthly_premium',
  PRICE_ID_YEARLY: process.env.STRIPE_PRICE_ID_YEARLY || 'price_yearly_premium',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
};

/**
 * Create a Stripe customer for a user
 */
export async function createCustomer(userId, email, name) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: userId.toString()
      }
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(customerId, priceId, successUrl, cancelUrl, trialDays = 7) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          source: 'dream_catcher_app'
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession(customerId, returnUrl) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

/**
 * Get customer's subscription status
 */
export async function getCustomerSubscription(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      return null;
    }
    
    return subscriptions.data[0];
  } catch (error) {
    console.error('Error getting customer subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId, immediately = false) {
  try {
    let subscription;
    
    if (immediately) {
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}

/**
 * Handle successful subscription events
 */
export async function handleSubscriptionEvent(subscription) {
  const customerId = subscription.customer;
  const status = subscription.status;
  
  // Get customer metadata to find user ID
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata?.userId;
  
  if (!userId) {
    console.error('No userId found in customer metadata:', customerId);
    return;
  }
  
  // Update user's subscription status based on Stripe subscription
  const { db } = await import('./database.js');
  
  if (status === 'active' || status === 'trialing') {
    // Set user to premium
    // Convert Stripe epoch seconds to ISO safely. During trialing, current_period_end can be undefined.
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
    const currentPeriodEndIso = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : (subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null);
    await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?')
      .run('premium', trialEnd, userId);
    
    // Store subscription ID for future reference (SQLite vs Postgres upsert)
    if (db.isPostgres) {
      await db.prepare(`
        INSERT INTO user_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          status = EXCLUDED.status,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        userId,
        customerId,
        subscription.id,
        status,
        currentPeriodEndIso
      );
    } else {
      await db.prepare(`
        INSERT OR REPLACE INTO user_subscriptions 
        (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        userId,
        customerId,
        subscription.id,
        status,
        currentPeriodEndIso
      );
    }
    
    console.log(`User ${userId} upgraded to premium via Stripe subscription ${subscription.id}`);
  } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
    // Downgrade user to free
    await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?')
      .run('free', null, userId);
    
    console.log(`User ${userId} downgraded to free - subscription ${subscription.id} status: ${status}`);
  }
}

/**
 * Get subscription pricing information
 */
export function getPricingInfo() {
  return {
    monthly: {
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Unlimited dream entries',
        'Unlimited AI analysis',
        'Unlimited chat with Dream Analyst',
        'Advanced mood tracking',
        'Detailed statistics & insights',
        'Priority support'
      ]
    },
    yearly: {
      price: 99.99,
      currency: 'USD',
      interval: 'year',
      savings: 17, // 17% savings
      features: [
        'Everything in Monthly',
        '17% savings',
        'Annual insights report',
        'Exclusive features'
      ]
    }
  };
}
