import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';

export const billingRouter = express.Router();
billingRouter.use(requireAuth);

function monthPeriod(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // e.g., 2025-10
}

// Get plan and usage snapshot
billingRouter.get('/status', async (req, res) => {
  try {
    const user = await db.prepare('SELECT plan, trial_end, created_at FROM users WHERE id = ?').get(req.user.id);
    const period = monthPeriod();
    const rows = await db.prepare('SELECT metric, period, count FROM usage_counters WHERE user_id = ? AND period = ?').all(req.user.id, period);
    const usage = {};
    for (const r of rows) usage[r.metric] = r.count;
    res.json({ plan: user?.plan || 'free', trial_end: user?.trial_end || null, period, usage });
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
  const period = monthPeriod();
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

// Mock upgrade endpoint (replace with real store webhook later)
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


