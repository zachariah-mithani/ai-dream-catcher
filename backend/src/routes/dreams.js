import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';
import { createBillingMiddleware, incrementUsage } from '../billing.js';

export const dreamsRouter = express.Router();

dreamsRouter.use(requireAuth);

const dreamSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  voice_uri: z.string().url().optional(),
  mood: z.string().optional(),
  moods: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dream_date: z.string().optional()
});

dreamsRouter.get('/', async (req, res) => {
  // Filters: q (text), mood, tag, start_date, end_date, page, page_size
  const { q, mood, tag, start_date, end_date } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(req.query.page_size) || 20));

  let where = ['user_id = ?'];
  const params = [req.user.id];

  if (q) {
    where.push('(title LIKE ? OR content LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (mood) {
    where.push('mood = ?');
    params.push(mood);
  }
  if (tag) {
    // tags stored as JSON string; simple LIKE match for MVP
    where.push('tags LIKE ?');
    params.push(`%${tag}%`);
  }
  if (start_date) {
    where.push('created_at >= ?');
    params.push(`${start_date} 00:00:00`);
  }
  if (end_date) {
    where.push('created_at <= ?');
    params.push(`${end_date} 23:59:59`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const sql = `SELECT * FROM dreams ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const rows = await db.prepare(sql).all(...params, pageSize, offset);

  // Total count for pagination
  const countSql = `SELECT COUNT(*) as count FROM dreams ${whereSql}`;
  const countRow = await db.prepare(countSql).get(...params);
  res.json({ items: rows, page, page_size: pageSize, total: countRow?.count || 0 });
});

dreamsRouter.post('/', createBillingMiddleware('dream_create'), async (req, res) => {
  const parse = dreamSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { title, content, voice_uri, mood, moods, tags, dream_date } = parse.data;
  
  // Generate AI tags using OpenRouter
  let aiTags = [];
  try {
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Dream Catcher'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{
          role: 'user',
          content: `Analyze this dream and suggest 3-5 relevant tags from these categories:
          Categories: Nightmare, Lucid, Recurring, Flying, Falling, Chase, Adventure, Romance, Work, Family, Friends, Strangers, Animals, Nature, Urban, Fantasy, Sci-Fi, Horror, Comedy, Mystery
          Emotions: Happy, Sad, Anxious, Excited, Confused, Angry, Peaceful, Scared, Curious, Nostalgic
          Dream: "${content}"
          Return only a JSON array of tag names, no other text.`
        }]
      })
    });
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content;
      if (aiContent) {
        try {
          aiTags = JSON.parse(aiContent);
        } catch (e) {
          console.log('Failed to parse AI tags:', aiContent);
        }
      }
    }
  } catch (e) {
    console.log('AI tag generation failed:', e.message);
  }
  
  try {
    // Get the next dream number for this user
    const lastDream = await db.prepare('SELECT user_dream_number FROM dreams WHERE user_id = ? ORDER BY user_dream_number DESC LIMIT 1').get(req.user.id);
    const nextDreamNumber = (lastDream?.user_dream_number || 0) + 1;
    
    let query, params;
    
    if (dream_date) {
      // Use custom date if provided
      const createdAt = `${dream_date} 00:00:00`;
      query = 'INSERT INTO dreams (user_id, user_dream_number, title, content, voice_uri, mood, moods, tags, ai_tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      params = [req.user.id, nextDreamNumber, title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), JSON.stringify(aiTags), createdAt];
    } else {
      // Use default timestamp
      query = 'INSERT INTO dreams (user_id, user_dream_number, title, content, voice_uri, mood, moods, tags, ai_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
      params = [req.user.id, nextDreamNumber, title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), JSON.stringify(aiTags)];
    }
    
    const info = await db.prepare(query).run(...params);
    const row = await db.prepare('SELECT * FROM dreams WHERE id = ?').get(info.lastInsertRowid);
    
    // Track usage for billing
    if (!req.billing.unlimited) {
      await incrementUsage(req.user.id, 'dream_create', req.billing.period);
    }
    
    res.status(201).json(row);
  } catch (error) {
    console.error('Database error creating dream:', error);
    res.status(500).json({ error: 'Failed to save dream' });
  }
});

// Get a specific dream by user's dream number
dreamsRouter.get('/number/:number', async (req, res) => {
  try {
    const dreamNumber = parseInt(req.params.number);
    if (isNaN(dreamNumber) || dreamNumber < 1) {
      return res.status(400).json({ error: 'Invalid dream number' });
    }
    
    const dream = await db.prepare('SELECT * FROM dreams WHERE user_id = ? AND user_dream_number = ?').get(req.user.id, dreamNumber);
    if (!dream) {
      return res.status(404).json({ error: `Dream ${dreamNumber} not found` });
    }
    
    res.json(dream);
  } catch (error) {
    console.error('Database error fetching dream by number:', error);
    res.status(500).json({ error: 'Failed to fetch dream' });
  }
});

dreamsRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parse = dreamSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { title, content, voice_uri, mood, moods, tags, dream_date } = parse.data;
  
  // Use custom date if provided, otherwise keep existing created_at
  const createdAt = dream_date ? `${dream_date} 00:00:00` : undefined;
  
  if (createdAt) {
    await db.prepare('UPDATE dreams SET title = ?, content = ?, voice_uri = ?, mood = ?, moods = ?, tags = ?, created_at = ? WHERE id = ? AND user_id = ?')
      .run(title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), createdAt, id, req.user.id);
  } else {
    await db.prepare('UPDATE dreams SET title = ?, content = ?, voice_uri = ?, mood = ?, moods = ?, tags = ? WHERE id = ? AND user_id = ?')
      .run(title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), id, req.user.id);
  }
  
  const row = await db.prepare('SELECT * FROM dreams WHERE id = ? AND user_id = ?').get(id, req.user.id);
  res.json(row);
});

dreamsRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  await db.prepare('DELETE FROM dreams WHERE id = ? AND user_id = ?').run(id, req.user.id);
  res.status(204).send();
});


