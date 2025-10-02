# 🚀 Render Deployment Guide for AI Dream Catcher

## 🎯 **Overview**
This guide will help you deploy your AI Dream Catcher backend to Render for production.

## 📋 **Prerequisites**
- [ ] Render account (free tier available)
- [ ] Stripe live account setup
- [ ] OpenRouter API key
- [ ] Domain name (optional)

## 🛠️ **Step 1: Create Render Account**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your GitHub repository

## 🗄️ **Step 2: Set Up PostgreSQL Database**
1. **In Render Dashboard:**
   - Click "New +"
   - Select "PostgreSQL"
   - Choose "Starter" plan (free)
   - Name: `ai-dream-catcher-db`
   - Click "Create Database"

2. **Note the connection details:**
   - Host
   - Port
   - Database name
   - Username
   - Password

## 🖥️ **Step 3: Deploy Backend Service**
1. **In Render Dashboard:**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Choose the `ai-dream-catcher` repository
   - Select the `backend` folder

2. **Configure the service:**
   - **Name**: `ai-dream-catcher-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (free)

## ⚙️ **Step 4: Environment Variables**
Add these environment variables in Render:

### **Required Variables:**
```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secure-production-jwt-secret-key
DATABASE_URL=postgresql://username:password@host:port/database
OPENROUTER_API_KEY=your-openrouter-api-key
STRIPE_SECRET_KEY=sk_live_your_live_stripe_key
STRIPE_PRODUCT_ID=prod_your_live_product_id
STRIPE_PRICE_ID_MONTHLY=price_your_live_monthly_price_id
STRIPE_PRICE_ID_YEARLY=price_your_live_yearly_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
APP_ORIGIN=https://your-frontend-domain.com
APP_PUBLIC_URL=https://your-backend-url.onrender.com
```

### **Optional Variables:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SENTRY_DSN=your-sentry-dsn
```

## 🔄 **Step 5: Update Frontend Configuration**
Update your frontend `app.json`:

```json
{
  "expo": {
    "extra": {
      "API_URL": "https://your-backend-url.onrender.com"
    }
  }
}
```

## 🌐 **Step 6: Set Up Custom Domain (Optional)**
1. **In Render Dashboard:**
   - Go to your web service
   - Click "Settings"
   - Click "Custom Domains"
   - Add your domain: `api.yourdomain.com`

2. **Update DNS:**
   - Add CNAME record pointing to your Render service

## 🔗 **Step 7: Set Up Stripe Webhooks**
1. **In Stripe Dashboard:**
   - Go to "Webhooks"
   - Click "Add endpoint"
   - URL: `https://your-backend-url.onrender.com/billing/webhook`
   - Events: Select all subscription events

2. **Copy webhook secret:**
   - Add to your Render environment variables

## 📊 **Step 8: Monitor Your Service**
1. **Health Checks:**
   - Visit: `https://your-backend-url.onrender.com/health`
   - Should return: `{"status":"healthy"}`

2. **Metrics:**
   - Check Render dashboard for logs
   - Monitor response times and errors

## 🚨 **Step 9: Production Checklist**
- [ ] Backend deployed and accessible
- [ ] Database connected and working
- [ ] Stripe webhooks configured
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Health check endpoint working
- [ ] Frontend pointing to production API

## 🔧 **Troubleshooting**

### **Common Issues:**
1. **Build Failures:**
   - Check build logs in Render dashboard
   - Ensure all dependencies are in package.json

2. **Database Connection Issues:**
   - Verify DATABASE_URL format
   - Check database credentials

3. **Stripe Issues:**
   - Verify live API keys
   - Check webhook endpoint

4. **CORS Issues:**
   - Update APP_ORIGIN with correct domains
   - Check frontend API_URL

### **Debug Commands:**
```bash
# Check service logs
# In Render dashboard: Service > Logs

# Test endpoints
curl https://your-backend-url.onrender.com/health
curl https://your-backend-url.onrender.com/billing/pricing
```

## 💰 **Costs**
- **Free Tier**: 750 hours/month (enough for small apps)
- **Starter Plan**: $7/month (unlimited hours)
- **Database**: Free for starter plan

## 🎉 **You're Live!**
Once deployed, your AI Dream Catcher backend will be accessible worldwide, and your app will work for users who download it from the app store!

## 📱 **Next Steps**
1. Deploy your backend to Render
2. Update your frontend API URL
3. Test everything works
4. Submit to app stores
5. Launch! 🚀

---

*Need help? Check Render's documentation or contact support.*
