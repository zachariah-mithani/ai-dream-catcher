import express from 'express';
import { z } from 'zod';
import { db } from '../sqlite.js';
import { requireAuth } from '../auth.js';

export const moodsRouter = express.Router();

moodsRouter.use(requireAuth);

const moodSchema = z.object({
  mood: z.enum(['Happy', 'Sad', 'Anxious', 'Excited', 'Confused', 'Angry', 'Peaceful', 'Scared', 'Curious', 'Nostalgic', 'Neutral']),
  dream_id: z.number().optional()
});

// Log a mood
moodsRouter.post('/', (req, res) => {
  try {
    const parse = moodSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
    const { mood, dream_id } = parse.data;
    
    const info = db.prepare('INSERT INTO user_moods (user_id, mood, dream_id) VALUES (?, ?, ?)')
      .run(req.user.id, mood, dream_id || null);
    
    const row = db.prepare('SELECT * FROM user_moods WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (error) {
    console.error('Mood logging error:', error);
    res.status(500).json({ error: 'Failed to log mood' });
  }
});

// Get mood history
moodsRouter.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const rows = db.prepare(`
    SELECT um.*, d.title, d.content 
    FROM user_moods um
    LEFT JOIN dreams d ON um.dream_id = d.id
    WHERE um.user_id = ?
    ORDER BY um.created_at DESC
    LIMIT ?
  `).all(req.user.id, limit);
  
  res.json({ items: rows });
});

// Get mood statistics
moodsRouter.get('/stats', (req, res) => {
  const userId = req.user.id;
  
  // Mood distribution
  const moodDistribution = db.prepare(`
    SELECT 
      mood,
      COUNT(*) as count
    FROM user_moods 
    WHERE user_id = ?
    GROUP BY mood
    ORDER BY count DESC
  `).all(userId);
  
  // Mood trends over time (last 30 days)
  const moodTrends = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      mood,
      COUNT(*) as count
    FROM user_moods 
    WHERE user_id = ? 
      AND created_at >= datetime('now', '-30 days')
    GROUP BY DATE(created_at), mood
    ORDER BY date DESC
  `).all(userId);
  
  // Mood correlation with dream content
  const moodDreamCorrelation = db.prepare(`
    SELECT 
      um.mood,
      json_each.value as tag,
      COUNT(*) as count
    FROM user_moods um
    JOIN dreams d ON um.dream_id = d.id
    JOIN json_each(d.tags) ON d.tags IS NOT NULL
    WHERE um.user_id = ?
    GROUP BY um.mood, json_each.value
    ORDER BY um.mood, count DESC
  `).all(userId);
  
  res.json({
    moodDistribution,
    moodTrends,
    moodDreamCorrelation
  });
});

// Get mood insights using AI
moodsRouter.get('/insights', async (req, res) => {
  const userId = req.user.id;
  
  // Get recent mood and dream data
  const recentData = db.prepare(`
    SELECT 
      um.mood,
      d.content,
      d.tags,
      d.moods as dream_moods,
      um.created_at
    FROM user_moods um
    LEFT JOIN dreams d ON um.dream_id = d.id
    WHERE um.user_id = ?
    ORDER BY um.created_at DESC
    LIMIT 20
  `).all(userId);
  
  // Also get recent dreams for context
  const recentDreams = db.prepare(`
    SELECT 
      content,
      tags,
      moods,
      created_at
    FROM dreams 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(userId);
  
  if (recentData.length === 0 && recentDreams.length === 0) {
    return res.json({ insights: "No mood data available yet. Start logging your moods to get insights!" });
  }
  
  console.log('=== MOOD INSIGHTS DEBUG ===');
  console.log('User ID:', userId);
  console.log('Recent mood data count:', recentData.length);
  console.log('Recent dreams count:', recentDreams.length);
  console.log('Sample mood entry:', JSON.stringify(recentData[0], null, 2));
  console.log('Sample dream entry:', JSON.stringify(recentDreams[0], null, 2));
  console.log('All recent dreams:', JSON.stringify(recentDreams, null, 2));
  
  // Let's also check what dreams exist for this user
  const allDreams = db.prepare('SELECT id, title, content, created_at FROM dreams WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
  console.log('All dreams for user:', JSON.stringify(allDreams, null, 2));
  console.log('========================');
  
  const aiPrompt = `Analyze this mood and dream data to provide insights about patterns and correlations. Be concise and helpful:

          Mood Entries: ${JSON.stringify(recentData, null, 2)}
          
          Recent Dreams: ${JSON.stringify(recentDreams, null, 2)}
          
          Look for patterns like:
          - Mood patterns and trends over time
          - Which moods correlate with certain dream themes
          - Recurring patterns in mood-dream relationships
          - Suggestions for better sleep or mood management
          
          IMPORTANT: Even if the mood entries don't have linked dream content, you can still analyze the recent dreams separately and provide insights about dream themes and patterns. Don't say "dream content is missing" if there are recent dreams available.
          
          Provide 2-3 key insights in a friendly, supportive tone. Focus on both mood patterns and dream themes when available.`;

  console.log('=== AI PROMPT DEBUG ===');
  console.log('AI Prompt length:', aiPrompt.length);
  console.log('AI Prompt preview:', aiPrompt.substring(0, 500) + '...');
  console.log('======================');

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
        model: 'google/gemini-flash-1.5',
        messages: [{
          role: 'user',
          content: aiPrompt
        }]
      })
    });
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const insights = aiData.choices?.[0]?.message?.content || "Unable to generate insights at this time.";
      res.json({ insights });
    } else {
      res.json({ insights: "Unable to generate insights at this time." });
    }
  } catch (e) {
    console.log('Mood insights generation failed:', e.message);
    res.json({ insights: "Unable to generate insights at this time." });
  }
});
