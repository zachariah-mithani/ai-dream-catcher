# Manual Testing Guide for AI Dream Catcher Billing System

## 🔧 **Step 1: Fix Environment Setup**

The server needs environment variables to start. Create or update your `.env` file in the backend directory:

```bash
cd backend
cp .env.example .env
```

Then edit `.env` and add these required variables:

```bash
PORT=4000
APP_ORIGIN=http://localhost:8081,http://localhost:19006
APP_PUBLIC_URL=http://localhost:4000
JWT_SECRET=your-secret-key-here
DATA_DIR=./data
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=deepseek/deepseek-chat-v3:free

# Stripe test configuration
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_PRODUCT_ID=prod_test_product
STRIPE_PRICE_ID_MONTHLY=price_test_monthly
STRIPE_PRICE_ID_YEARLY=price_test_yearly
STRIPE_WEBHOOK_SECRET=whsec_test_webhook_secret
```

## 🚀 **Step 2: Start the Backend Server**

```bash
cd backend
npm start
```

You should see output like:
```
Server running on port 4000
Database initialized
```

## 🧪 **Step 3: Test Backend API Endpoints**

### Test 1: Billing Pricing Endpoint
```bash
curl -X GET http://localhost:4000/billing/pricing
```

Expected response:
```json
{
  "monthly": {
    "price": 9.99,
    "currency": "USD",
    "interval": "month",
    "features": [...]
  },
  "yearly": {
    "price": 99.99,
    "currency": "USD",
    "interval": "year",
    "savings": 17,
    "features": [...]
  }
}
```

### Test 2: User Registration (to get auth token)
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

Save the `token` from the response for the next tests.

### Test 3: Check Billing Status
```bash
curl -X GET http://localhost:4000/billing/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
{
  "plan": "free",
  "trial_end": null,
  "period": "2025-10",
  "usage": {}
}
```

### Test 4: Test Usage Limits - Dream Creation
```bash
# Create 11 dreams to test the limit (should fail at 11th)
for i in {1..11}; do
  curl -X POST http://localhost:4000/dreams \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"Test dream $i\"}"
  echo "Dream $i created"
done
```

Expected: First 10 succeed, 11th returns:
```json
{
  "error": "Monthly dream limit reached",
  "limit": 10,
  "used": 10,
  "upgrade": "Upgrade to premium for unlimited dreams"
}
```

### Test 5: Test AI Analysis Limit
```bash
# Try to analyze 6 dreams (should fail at 6th)
for i in {1..6}; do
  curl -X POST http://localhost:4000/analysis \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"Test dream content for analysis $i\"}"
  echo "Analysis $i completed"
done
```

### Test 6: Test Chat Message Limit
```bash
# Try to send 4 chat messages (should fail at 4th)
for i in {1..4}; do
  curl -X POST http://localhost:4000/chat \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Test chat message $i\"}"
  echo "Chat $i sent"
done
```

### Test 7: Test Premium Upgrade (Mock)
```bash
curl -X POST http://localhost:4000/billing/upgrade \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"plan":"premium","trial_days":7}'
```

Expected response:
```json
{
  "ok": true,
  "plan": "premium",
  "trial_end": "2025-10-09T..."
}
```

### Test 8: Verify Premium User Can Exceed Limits
After upgrading to premium, repeat the limit tests - they should all succeed.

## 📱 **Step 4: Test Frontend**

### Start the Frontend
```bash
cd frontend
npm start
```

### Test Frontend Billing Features

1. **Navigate to Settings** → Should see billing management options
2. **Click "Manage Plan"** → Should open BillingScreen
3. **Click "Upgrade"** → Should open PaywallScreen with Stripe checkout
4. **Test Upgrade Prompts**:
   - Create 10+ dreams → Should see upgrade prompt
   - Run 5+ AI analyses → Should see upgrade prompt  
   - Send 3+ chat messages → Should see upgrade prompt

## 🔍 **Step 5: Test Stripe Integration (Optional)**

For full Stripe testing, you'll need:

1. **Create Stripe Test Account**
2. **Set up Products and Prices**
3. **Configure Webhook Endpoint**: `http://localhost:4000/billing/webhook`
4. **Use Test Cards**:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Test Stripe Checkout
```bash
curl -X POST http://localhost:4000/billing/checkout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"monthly","trialDays":7}'
```

## 📊 **Step 6: Database Verification**

Check that usage tracking is working:

```bash
# Connect to SQLite database
cd backend/data
sqlite3 dreams.db

# Check usage counters
SELECT * FROM usage_counters;

# Check user plans
SELECT id, email, plan, trial_end FROM users;

# Check subscriptions
SELECT * FROM user_subscriptions;
```

## ✅ **Expected Results**

### ✅ Free Plan Limits Working
- Dream creation: 10/month limit enforced
- AI analysis: 5/month limit enforced  
- Chat messages: 3/day limit enforced

### ✅ Premium Plan Working
- All limits removed for premium users
- Trial management working
- Subscription status persistent

### ✅ UI/UX Working
- Upgrade prompts appear when limits reached
- Billing screens functional
- Navigation working properly

### ✅ Database Working
- Usage counters incrementing correctly
- User plans updating properly
- Trial expiration handling correctly

## 🚨 **Troubleshooting**

### Server Won't Start
- Check environment variables are set
- Verify JWT_SECRET is configured
- Check port 4000 is available

### API Calls Failing
- Verify auth token is valid
- Check request format matches examples
- Verify server is running on correct port

### Limits Not Enforced
- Check billing middleware is applied to routes
- Verify usage counters table exists
- Check user plan is set correctly

### Frontend Issues
- Verify API_URL in app.json points to backend
- Check billing context is working
- Verify navigation routes are configured

## 🎉 **Success Criteria**

Your billing system is working correctly when:

1. ✅ Server starts without errors
2. ✅ Free users hit limits at correct thresholds
3. ✅ Premium users have unlimited access
4. ✅ Usage is tracked and persisted
5. ✅ Upgrade prompts appear in UI
6. ✅ Billing screens are functional
7. ✅ Trial management works
8. ✅ Database schema is correct

**Once all tests pass, your billing system is ready for production!** 🚀
