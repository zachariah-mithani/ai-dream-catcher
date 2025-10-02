# Production Configuration Guide

## Environment Variables

Create a `.env` file in the backend directory with these variables:

```bash
# Server Configuration
PORT=4000
NODE_ENV=production
APP_ORIGIN=https://yourdomain.com,https://your-app-domain.com
APP_PUBLIC_URL=https://your-api-domain.com

# Security (CHANGE THESE!)
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_DAYS=30

# Database
DATA_DIR=./data
# For production, use PostgreSQL:
DATABASE_URL=postgresql://username:password@localhost:5432/ai_dream_catcher

# AI Services
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=deepseek/deepseek-chat-v3:free

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_live_key
STRIPE_PRODUCT_ID=prod_your_product_id
STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id
STRIPE_PRICE_ID_YEARLY=price_your_yearly_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn-here
```

## Security Checklist

- [ ] Change JWT_SECRET to a secure random string
- [ ] Use production Stripe keys
- [ ] Set up PostgreSQL database
- [ ] Configure proper CORS origins
- [ ] Set up SSL/HTTPS
- [ ] Enable rate limiting
- [ ] Set up monitoring
