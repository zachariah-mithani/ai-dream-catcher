import express from 'express';
import { z } from 'zod';
import { db } from '../sqlite.js';
import { requireAuth } from '../auth.js';

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

dreamsRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM dreams WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ items: rows });
});

dreamsRouter.post('/', async (req, res) => {
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
  
  // Use custom date if provided, otherwise use current timestamp
  const createdAt = dream_date ? `${dream_date} 00:00:00` : undefined;
  
  const info = db.prepare('INSERT INTO dreams (user_id, title, content, voice_uri, mood, moods, tags, ai_tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), JSON.stringify(aiTags), createdAt);
  const row = db.prepare('SELECT * FROM dreams WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

dreamsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parse = dreamSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { title, content, voice_uri, mood, moods, tags, dream_date } = parse.data;
  
  // Use custom date if provided, otherwise keep existing created_at
  const createdAt = dream_date ? `${dream_date} 00:00:00` : undefined;
  
  if (createdAt) {
    db.prepare('UPDATE dreams SET title = ?, content = ?, voice_uri = ?, mood = ?, moods = ?, tags = ?, created_at = ? WHERE id = ? AND user_id = ?')
      .run(title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), createdAt, id, req.user.id);
  } else {
    db.prepare('UPDATE dreams SET title = ?, content = ?, voice_uri = ?, mood = ?, moods = ?, tags = ? WHERE id = ? AND user_id = ?')
      .run(title || null, content, voice_uri || null, mood || null, JSON.stringify(moods || []), JSON.stringify(tags || []), id, req.user.id);
  }
  
  const row = db.prepare('SELECT * FROM dreams WHERE id = ? AND user_id = ?').get(id, req.user.id);
  res.json(row);
});

dreamsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  db.prepare('DELETE FROM dreams WHERE id = ? AND user_id = ?').run(id, req.user.id);
  res.status(204).send();
});


