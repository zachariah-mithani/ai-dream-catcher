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

const app = express();

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

// Initialize database schema on startup
initSchema(); // Force redeploy

app.get('/health', async (_req, res) => {
  try {
    const result = await db.prepare('SELECT 1 as test').get();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'db' });
  }
});


app.use('/auth', authRouter);
app.use('/dreams', dreamsRouter);
app.use('/analysis', analysisRouter);
app.use('/chat', chatRouter);
app.use('/statistics', statisticsRouter);
app.use('/moods', moodsRouter);
app.use('/prompts', promptsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(APP_PORT, () => {
  console.log(`AI Dream Catcher backend listening on :${APP_PORT}`);
});


