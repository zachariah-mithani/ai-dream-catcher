import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';
import { chatWithAnalyst } from '../openrouter.js';
import { createBillingMiddleware, incrementUsage } from '../billing.js';

export const chatRouter = express.Router();
chatRouter.use(requireAuth);

const chatSchema = z.object({
  history: z.array(z.object({ role: z.enum(['user','assistant','system']).default('user'), content: z.string() })).optional(),
  message: z.string().min(1)
});

// Get chat history with subscription-based limits
chatRouter.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offsetNum = Math.max(0, parseInt(offset));
    
    // Apply subscription-based history retention
    let whereClause = 'WHERE user_id = ? AND type = ?';
    let params = [req.user.id, 'chat'];
    
    // Free users: only last 7 days of history
    // Premium users: unlimited history
    if (!req.billing?.isPremium) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      whereClause += ' AND created_at >= ?';
      params.push(sevenDaysAgo.toISOString());
    }
    
    const rows = await db.prepare(`
      SELECT id, prompt, response, created_at 
      FROM analyses 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offsetNum);
    
    // Convert to chat history format
    const history = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (row.prompt) {
        history.push({ role: 'user', content: row.prompt, timestamp: row.created_at });
      }
      if (row.response) {
        history.push({ role: 'assistant', content: row.response, timestamp: row.created_at });
      }
    }
    
    // Get total count for pagination info
    const countRows = await db.prepare(`
      SELECT COUNT(*) as total 
      FROM analyses 
      ${whereClause}
    `).all(...params);
    
    res.json({ 
      history, 
      total: countRows[0]?.total || 0,
      retention: req.billing?.isPremium ? 'unlimited' : '7 days'
    });
  } catch (e) {
    console.error('Chat history error:', e);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

chatRouter.post('/', createBillingMiddleware('chat_message'), async (req, res) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { history = [], message } = parse.data;
  
  try {
    console.log('Chat request:', { history, message });
    const { text, model } = await chatWithAnalyst(history, message);
    console.log('Chat response:', { text: text.substring(0, 100), model });
    const info = db.prepare('INSERT INTO analyses (user_id, type, prompt, response, model) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, 'chat', message, text, model || null);
    const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(info.lastInsertRowid);
    
    // Track usage for billing
    if (!req.billing.unlimited) {
      await incrementUsage(req.user.id, 'chat_message', req.billing.period);
    }
    
    res.json({ response: text, model });
  } catch (e) {
    console.error('Chat error:', e.message, e.response?.data);
    const status = e?.response?.status || 500;
    res.status(status).json({ error: 'AI service error', details: e.message });
  }
});


