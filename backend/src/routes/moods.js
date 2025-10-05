import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';
import { callOpenRouter } from '../openrouter.js';

export const moodsRouter = express.Router();

moodsRouter.use(requireAuth);

const moodSchema = z.object({
  mood: z.enum(['Happy', 'Sad', 'Anxious', 'Excited', 'Confused', 'Angry', 'Peaceful', 'Scared', 'Curious', 'Nostalgic', 'Neutral']),
  dream_id: z.number().optional()
});

// Log a mood
moodsRouter.post('/', async (req, res) => {
  try {
    const parse = moodSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
    const { mood, dream_id } = parse.data;
    
    const info = await db.prepare('INSERT INTO user_moods (user_id, mood, dream_id) VALUES (?, ?, ?)')
      .run(req.user.id, mood, dream_id || null);
    
    const row = await db.prepare('SELECT * FROM user_moods WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (error) {
    console.error('Mood logging error:', error);
    res.status(500).json({ error: 'Failed to log mood' });
  }
});

// Get mood history
moodsRouter.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const rows = await db.prepare(`
      SELECT um.*, d.title, d.content 
      FROM user_moods um
      LEFT JOIN dreams d ON um.dream_id = d.id
      WHERE um.user_id = ?
      ORDER BY um.created_at DESC
      LIMIT ?
    `).all(req.user.id, limit);
    
    res.json({ items: rows });
  } catch (error) {
    console.error('Mood history error:', error);
    res.status(500).json({ error: 'Failed to load mood history' });
  }
});

// Get mood statistics
moodsRouter.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
  
    // Mood distribution
    const moodDistribution = await db.prepare(`
      SELECT 
        mood,
        COUNT(*) as count
      FROM user_moods 
      WHERE user_id = ?
      GROUP BY mood
      ORDER BY count DESC
    `).all(userId);
    
    // Mood trends over time (last 30 days)
    const moodTrends = await db.prepare(`
      SELECT 
        DATE(created_at) as date,
        mood,
        COUNT(*) as count
      FROM user_moods 
      WHERE user_id = ? 
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), mood
      ORDER BY date DESC
    `).all(userId);
    
    // Mood correlation with dream content
    const moodDreamCorrelation = await db.prepare(`
      SELECT 
        um.mood,
        tag,
        COUNT(*) as count
      FROM user_moods um
      JOIN dreams d ON um.dream_id = d.id
      JOIN jsonb_array_elements_text(d.tags::jsonb) as tag ON d.tags IS NOT NULL
      WHERE um.user_id = ?
      GROUP BY um.mood, tag
      ORDER BY um.mood, count DESC
    `).all(userId);
    
    res.json({
      moodDistribution,
      moodTrends,
      moodDreamCorrelation
    });
  } catch (error) {
    console.error('Mood stats error:', error);
    res.status(500).json({ error: 'Failed to load mood statistics' });
  }
});

// Get mood insights using AI
moodsRouter.get('/insights', async (req, res) => {
  try {
    const userId = req.user.id;
  
    // Get recent mood and dream data
    const recentData = await db.prepare(`
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
    const recentDreams = await db.prepare(`
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
    const allDreams = await db.prepare('SELECT id, title, content, created_at FROM dreams WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
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

IMPORTANT: 
1. Even if the mood entries don't have linked dream content, you can still analyze the recent dreams separately and provide insights about dream themes and patterns.
2. Don't say "dream content is missing" if there are recent dreams available.
3. Use clear formatting with bullet points and headings for better readability.
4. Avoid special characters that might cause rendering issues.

Provide 2-3 key insights in a friendly, supportive tone. Use this format:

**Mood Variability**: [Analysis of mood patterns]

**Recent Dreams**: [Analysis of dream themes and patterns]

**Suggestion for Better Mood Management**: [Practical advice]

Keep responses under 500 words and use simple formatting.`;

  console.log('=== AI PROMPT DEBUG ===');
  console.log('AI Prompt length:', aiPrompt.length);
  console.log('AI Prompt preview:', aiPrompt.substring(0, 500) + '...');
  console.log('======================');

    try {
      console.log('=== MOOD INSIGHTS AI CALL ===');
      console.log('Calling OpenRouter with model:', process.env.OPENROUTER_MODEL || 'x-ai/grok-4-fast:free');
      console.log('Prompt length:', aiPrompt.length);
      
      const aiResult = await callOpenRouter({
        messages: [{
          role: 'user',
          content: aiPrompt
        }],
        temperature: 0.7,
        max_tokens: 500
      });
      
      console.log('AI response received:', {
        textLength: aiResult.text?.length || 0,
        model: aiResult.model
      });
      
      let insights = aiResult.text || "Unable to generate insights at this time.";
      
      // Clean up the response to avoid rendering issues
      insights = insights
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      console.log('Cleaned insights length:', insights.length);
      res.json({ insights });
    } catch (e) {
      console.error('=== MOOD INSIGHTS ERROR ===');
      console.error('Error type:', e.constructor.name);
      console.error('Error message:', e.message);
      console.error('Error stack:', e.stack);
      console.error('==========================');
      res.json({ insights: `Unable to generate insights at this time. Error: ${e.message}` });
    }
  } catch (error) {
    console.error('Mood insights error:', error);
    res.status(500).json({ error: 'Failed to load mood insights' });
  }
});
