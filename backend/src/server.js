import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { db, initSchema, pool } from './database.js';
import { authRouter } from './routes/auth.js';
import { dreamsRouter } from './routes/dreams.js';
import { analysisRouter } from './routes/analysis.js';
import { chatRouter } from './routes/chat.js';
import { statisticsRouter } from './routes/statistics.js';
import { moodsRouter } from './routes/moods.js';
import { promptsRouter } from './routes/prompts.js';
import { billingRouter, billingWebhook } from './routes/billing.js';
import { 
  errorHandler, 
  notFoundHandler, 
  setupGracefulShutdown 
} from './middleware/errorHandler.js';
import { 
  requestMetricsMiddleware,
  performanceMiddleware,
  healthCheck,
  metrics,
  systemInfo
} from './middleware/monitoring.js';

const app = express();

// Stripe webhook MUST be registered before express.json so we can use raw body
app.post('/billing/webhook', express.raw({ type: 'application/json' }), billingWebhook);

const APP_PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const APP_ORIGIN = process.env.APP_ORIGIN || '*';

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ 
  origin: APP_ORIGIN === '*' ? false : APP_ORIGIN.split(',').map(s => s.trim()), 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));

// Basic input sanitization
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
});
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Add monitoring middleware
app.use(requestMetricsMiddleware);
app.use(performanceMiddleware);

// Initialize database schema on startup
initSchema(); // Force redeploy

// Health and monitoring endpoints
app.get('/health', healthCheck);
app.get('/metrics', metrics);
app.get('/system', systemInfo);

// Minimal root and favicon to avoid noisy 404s
app.get('/', (req, res) => res.status(200).send('AI Dream Catcher API'));
app.get('/favicon.ico', (req, res) => res.status(204).end());


app.use('/auth', authRouter);
app.use('/dreams', dreamsRouter);
app.use('/analysis', analysisRouter);
app.use('/chat', chatRouter);
app.use('/statistics', statisticsRouter);
app.use('/moods', moodsRouter);
app.use('/prompts', promptsRouter);
app.use('/billing', billingRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

const server = app.listen(APP_PORT, () => {
  console.log(`AI Dream Catcher backend listening on :${APP_PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Setup graceful shutdown
setupGracefulShutdown(server);


