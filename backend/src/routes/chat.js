import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';
import { chatWithAnalyst } from '../openrouter.js';

export const chatRouter = express.Router();
chatRouter.use(requireAuth);

const chatSchema = z.object({
  history: z.array(z.object({ role: z.enum(['user','assistant','system']).default('user'), content: z.string() })).optional(),
  message: z.string().min(1)
});

chatRouter.post('/', async (req, res) => {
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
    res.json({ response: text, model });
  } catch (e) {
    console.error('Chat error:', e.message, e.response?.data);
    const status = e?.response?.status || 500;
    res.status(status).json({ error: 'AI service error', details: e.message });
  }
});


