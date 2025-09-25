import express from 'express';
import { z } from 'zod';
import { db } from '../sqlite.js';
import { requireAuth } from '../auth.js';
import { analyzeDreamText } from '../openrouter.js';

export const analysisRouter = express.Router();
analysisRouter.use(requireAuth);

const analyzeSchema = z.object({ dreamId: z.number().optional(), content: z.string().min(1) });

analysisRouter.post('/', async (req, res) => {
  const parse = analyzeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { dreamId, content } = parse.data;
  try {
    const { text, model } = await analyzeDreamText(content);
    const info = db.prepare('INSERT INTO analyses (user_id, dream_id, type, prompt, response, model) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, dreamId || null, 'immediate', content, text, model || null);
    const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(info.lastInsertRowid);
    res.json(row);
  } catch (e) {
    const status = e?.response?.status || 500;
    res.status(status).json({ error: 'AI service error' });
  }
});

analysisRouter.get('/patterns', (req, res) => {
  const dreams = db.prepare('SELECT * FROM dreams WHERE user_id = ?').all(req.user.id);
  
  if (dreams.length === 0) {
    return res.json({ total: 0, patterns: [] });
  }
  
  // Extract meaningful patterns from dream content
  const patterns = [];
  
  for (const dream of dreams) {
    const content = String(dream.content).toLowerCase();
    
    // Extract key themes and concepts
    const themes = extractThemes(content);
    themes.forEach(theme => {
      const existing = patterns.find(p => p.theme === theme);
      if (existing) {
        existing.count++;
      } else {
        patterns.push({ theme, count: 1 });
      }
    });
  }
  
  // Filter out patterns that only appear once and sort by frequency
  const topPatterns = patterns
    .filter(p => p.count >= 2) // Only show patterns that appear 2+ times
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(p => ({ theme: p.theme, count: p.count }));
  
  res.json({ total: dreams.length, patterns: topPatterns });
});

function extractThemes(content) {
  const themes = [];
  
  // Common dream themes and keywords
  const themeKeywords = {
    'flying': ['flying', 'fly', 'soar', 'air', 'sky', 'floating'],
    'falling': ['falling', 'fall', 'drop', 'plunge', 'descend'],
    'chase': ['chase', 'chasing', 'running', 'escape', 'flee', 'pursue'],
    'water': ['water', 'ocean', 'sea', 'lake', 'river', 'swim', 'drowning'],
    'animals': ['dog', 'cat', 'bird', 'fish', 'lion', 'tiger', 'bear', 'snake', 'chicken', 'ape'],
    'family': ['mother', 'father', 'mom', 'dad', 'sister', 'brother', 'family'],
    'friends': ['friend', 'friends', 'buddy', 'pal', 'companion'],
    'work': ['work', 'office', 'job', 'boss', 'colleague', 'meeting'],
    'school': ['school', 'class', 'teacher', 'student', 'homework', 'exam'],
    'house': ['house', 'home', 'room', 'bedroom', 'kitchen', 'living'],
    'car': ['car', 'drive', 'driving', 'vehicle', 'road', 'highway'],
    'nature': ['tree', 'forest', 'mountain', 'hill', 'garden', 'flower'],
    'city': ['city', 'street', 'building', 'urban', 'downtown'],
    'nightmare': ['scary', 'frightening', 'terrifying', 'monster', 'ghost', 'dark'],
    'lucid': ['lucid', 'aware', 'control', 'realize', 'know'],
    'fighting': ['fight', 'fighting', 'battle', 'war', 'conflict', 'struggle'],
    'romance': ['love', 'romance', 'kiss', 'hug', 'relationship', 'partner'],
    'adventure': ['adventure', 'journey', 'quest', 'explore', 'discover'],
    'fantasy': ['magic', 'wizard', 'dragon', 'castle', 'fairy', 'princess'],
    'sci-fi': ['space', 'alien', 'robot', 'future', 'technology', 'spaceship']
  };
  
  // Check for each theme
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        themes.push(theme);
        break; // Only add theme once per dream
      }
    }
  }
  
  // Extract individual significant words (3+ characters, not common words)
  const commonWords = new Set(['the', 'and', 'was', 'were', 'had', 'have', 'has', 'this', 'that', 'with', 'from', 'they', 'them', 'their', 'there', 'then', 'than', 'when', 'where', 'what', 'who', 'why', 'how', 'very', 'just', 'only', 'also', 'even', 'still', 'back', 'over', 'under', 'through', 'after', 'before', 'during', 'while', 'because', 'although', 'though', 'however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 'meanwhile', 'consequently', 'accordingly', 'similarly', 'likewise', 'otherwise', 'instead', 'rather', 'quite', 'rather', 'somewhat', 'somehow', 'somewhere', 'anywhere', 'everywhere', 'nowhere', 'anyone', 'someone', 'everyone', 'noone', 'anything', 'something', 'everything', 'nothing']);
  
  const words = content.match(/[a-zA-Z']{3,}/g) || [];
  const significantWords = words.filter(word => !commonWords.has(word));
  
  // Add significant words as individual themes
  significantWords.forEach(word => {
    if (!themes.includes(word)) {
      themes.push(word);
    }
  });
  
  return themes;
}


