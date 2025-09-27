import express from 'express';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';

export const statisticsRouter = express.Router();

statisticsRouter.use(requireAuth);

// Get basic dream statistics
statisticsRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Total dreams
    const totalResult = await db.prepare('SELECT COUNT(*) as count FROM dreams WHERE user_id = ?').get(userId);
    const totalDreams = totalResult.count;
  
  // Dreams by month (last 6 months)
  const monthlyDreams = await db.prepare(`
    SELECT 
      to_char(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM dreams 
    WHERE user_id = ? 
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY to_char(created_at, 'YYYY-MM')
    ORDER BY month DESC
  `).all(userId);
  
  // Most common tags
  const commonTags = await db.prepare(`
    SELECT 
      json_each.value as tag,
      COUNT(*) as count
    FROM dreams, json_each(tags)
    WHERE user_id = ? AND tags IS NOT NULL
    GROUP BY json_each.value
    ORDER BY count DESC
    LIMIT 10
  `).all(userId);
  
  // Most common AI tags
  const commonAiTags = await db.prepare(`
    SELECT 
      json_each.value as tag,
      COUNT(*) as count
    FROM dreams, json_each(ai_tags)
    WHERE user_id = ? AND ai_tags IS NOT NULL
    GROUP BY json_each.value
    ORDER BY count DESC
    LIMIT 10
  `).all(userId);
  
  // Mood distribution
  const moodDistribution = await db.prepare(`
    SELECT 
      mood,
      COUNT(*) as count
    FROM dreams 
    WHERE user_id = ? AND mood IS NOT NULL
    GROUP BY mood
    ORDER BY count DESC
  `).all(userId);
  
  // Recurring themes (dreams with same tags)
  const recurringThemes = await db.prepare(`
    SELECT 
      json_each.value as theme,
      COUNT(*) as frequency
    FROM dreams, json_each(tags)
    WHERE user_id = ? AND tags IS NOT NULL
    GROUP BY json_each.value
    HAVING COUNT(*) > 1
    ORDER BY frequency DESC
    LIMIT 5
  `).all(userId);
  
    res.json({
      totalDreams,
      monthlyDreams,
      commonTags,
      commonAiTags,
      moodDistribution,
      recurringThemes
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

// Get dream frequency by month for charts
statisticsRouter.get('/monthly', (req, res) => {
  const userId = req.user.id;
  const months = req.query.months || 12;
  
  const monthlyData = db.prepare(`
    SELECT 
      to_char(created_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM dreams 
    WHERE user_id = ? 
      AND created_at >= NOW() - INTERVAL '${months} months'
    GROUP BY to_char(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `).all(userId);
  
  res.json(monthlyData);
});

// Get tag cloud data
statisticsRouter.get('/tags', (req, res) => {
  const userId = req.user.id;
  
  const userTags = db.prepare(`
    SELECT 
      json_each.value as tag,
      COUNT(*) as count
    FROM dreams, json_each(tags)
    WHERE user_id = ? AND tags IS NOT NULL
    GROUP BY json_each.value
    ORDER BY count DESC
  `).all(userId);
  
  const aiTags = db.prepare(`
    SELECT 
      json_each.value as tag,
      COUNT(*) as count
    FROM dreams, json_each(ai_tags)
    WHERE user_id = ? AND ai_tags IS NOT NULL
    GROUP BY json_each.value
    ORDER BY count DESC
  `).all(userId);
  
  res.json({
    userTags,
    aiTags
  });
});
