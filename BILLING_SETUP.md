# AI Dream Catcher - Billing Setup Guide

This guide will help you set up the complete paid plan functionality for your AI Dream Catcher app.

## 🎯 Overview

The billing system includes:
- ✅ **Usage tracking and limits enforcement** for free users
- ✅ **Stripe payment processing** with subscription management
- ✅ **Trial management** with automatic expiration
- ✅ **Billing portal** for subscription management
- ✅ **Upgrade prompts** throughout the app
- ✅ **Webhook handling** for real-time subscription updates

## 🔧 Environment Setup

### 1. Backend Environment Variables

Add these to your backend `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PRODUCT_ID=prod_... # Your Stripe product ID
STRIPE_PRICE_ID_MONTHLY=price_... # Monthly subscription price ID
STRIPE_PRICE_ID_YEARLY=price_... # Yearly subscription price ID
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret

# App Configuration
APP_PUBLIC_URL=https://your-app-domain.com # Your production domain
```

### 2. Stripe Dashboard Setup

#### Create Products and Prices

1. **Go to Stripe Dashboard → Products**
2. **Create a new product:**
   - Name: "Dream Explorer+"
   - Description: "Premium subscription for AI Dream Catcher"

3. **Create Monthly Price:**
   - Price: $9.99
   - Billing period: Monthly
   - Copy the Price ID (starts with `price_`)

4. **Create Yearly Price:**
   - Price: $99.99
   - Billing period: Yearly
   - Copy the Price ID (starts with `price_`)

5. **Copy the Product ID** (starts with `prod_`)

#### Set Up Webhooks

1. **Go to Stripe Dashboard → Webhooks**
2. **Add endpoint:** `https://your-app-domain.com/billing/webhook`
3. **Select events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Copy the webhook secret** (starts with `whsec_`)

## 🚀 Deployment Steps

### 1. Database Migration

Run the database initialization to create the new subscription tables:

```bash
cd backend
npm run init:db
```

This will create the `user_subscriptions` table automatically.

### 2. Install Dependencies

The Stripe dependency is already installed, but verify:

```bash
cd backend
npm install stripe
```

### 3. Test the Integration

#### Test Free Plan Limits

1. Create a free account
2. Try to create 11 dreams (should fail at 11th)
3. Try to run 6 AI analyses (should fail at 6th)
4. Try to send 4 chat messages in one day (should fail at 4th)

#### Test Stripe Integration

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. Test the complete flow:
   - Click upgrade button
   - Complete Stripe checkout
   - Verify subscription is created
   - Test that limits are removed

## 📱 Frontend Integration

### Key Features Implemented

1. **BillingContext** - Manages subscription status and usage
2. **UpgradePrompt Components** - Shows upgrade options when limits reached
3. **BillingScreen** - Full subscription management interface
4. **PaywallScreen** - Updated with Stripe checkout
5. **Usage tracking** - Automatic tracking in all protected routes

### Usage in Your App

The billing system is automatically integrated into:
- **Journal Screen** - Shows upgrade prompt for dream creation limits
- **Chat Screen** - Shows upgrade prompt for daily chat limits  
- **Analysis Screen** - Shows upgrade prompt for AI analysis limits
- **Settings Screen** - Links to billing management

## 🔒 Security Considerations

### Webhook Security

The webhook endpoint verifies Stripe signatures to prevent fraud:

```javascript
// Automatically handled in /billing/webhook endpoint
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  STRIPE_CONFIG.WEBHOOK_SECRET
);
```

### User Data Protection

- Stripe handles all payment data
- Only subscription status stored in your database
- No credit card information stored locally

## 📊 Monitoring & Analytics

### Track Key Metrics

1. **Conversion Rates:**
   - Free to trial conversions
   - Trial to paid conversions
   - Monthly vs yearly plan preferences

2. **Usage Patterns:**
   - Most hit limits (dreams, analysis, chat)
   - User engagement before upgrade
   - Churn patterns

### Stripe Dashboard

Monitor in Stripe Dashboard:
- Revenue metrics
- Failed payments
- Customer lifetime value
- Subscription churn

## 🧪 Testing Checklist

### Free Plan Testing
- [ ] Dream creation limit (10/month)
- [ ] AI analysis limit (5/month)  
- [ ] Chat message limit (3/day)
- [ ] Upgrade prompts appear correctly

### Premium Plan Testing
- [ ] All limits removed
- [ ] Subscription status persists
- [ ] Billing portal accessible
- [ ] Cancellation works

### Stripe Integration Testing
- [ ] Checkout flow works
- [ ] Webhook events processed
- [ ] Subscription status updates
- [ ] Payment failures handled

### Edge Cases
- [ ] Trial expiration
- [ ] Network failures during checkout
- [ ] Invalid webhook signatures
- [ ] Concurrent subscription attempts

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not receiving events:**
   - Check endpoint URL is correct
   - Verify webhook secret matches
   - Check server logs for errors

2. **Usage limits not enforced:**
   - Verify billing middleware is applied to routes
   - Check database has usage_counters table
   - Confirm user plan is set correctly

3. **Stripe checkout fails:**
   - Verify API keys are correct
   - Check product/price IDs match dashboard
   - Confirm webhook URL is accessible

### Debug Mode

Enable debug logging by adding to your `.env`:

```bash
DEBUG=billing:*
```

## 📈 Next Steps

### Recommended Enhancements

1. **Apple/Google Pay Integration** for mobile apps
2. **Promotional codes** for discounts
3. **Usage analytics** dashboard
4. **Email notifications** for billing events
5. **Proration** for plan changes

### Scaling Considerations

1. **Database indexing** on usage_counters table
2. **Webhook queue** for high-volume events
3. **Caching** for subscription status
4. **Rate limiting** on billing endpoints

## 📞 Support

For issues with this implementation:
1. Check the troubleshooting section above
2. Review Stripe documentation
3. Check server logs for error details
4. Test with Stripe test mode first

---

**🎉 Congratulations!** Your AI Dream Catcher app now has a complete, production-ready billing system that will help you monetize your dream journaling platform effectively.
