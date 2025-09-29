import express from 'express';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';

export const promptsRouter = express.Router();

// Initialize default prompts if they don't exist
function initializePrompts() {
  try {
    const existingPrompts = db.prepare('SELECT COUNT(*) as count FROM dream_prompts').get();
    
    if (existingPrompts.count === 0) {
    const defaultPrompts = [
      { prompt: "What colors stood out in your dream?", category: "Visual" },
      { prompt: "Who was in your dream? (people, animals, characters)", category: "Characters" },
      { prompt: "Where did your dream take place?", category: "Setting" },
      { prompt: "What emotions did you feel during the dream?", category: "Emotions" },
      { prompt: "Was there any conflict or problem in the dream?", category: "Conflict" },
      { prompt: "What was the most vivid or memorable part?", category: "Memory" },
      { prompt: "Did you have any special abilities or powers?", category: "Abilities" },
      { prompt: "What sounds did you hear in the dream?", category: "Audio" },
      { prompt: "Did you recognize any places from your waking life?", category: "Recognition" },
      { prompt: "What was the overall atmosphere or mood of the dream?", category: "Atmosphere" },
      { prompt: "Were you aware you were dreaming at any point?", category: "Lucid" },
      { prompt: "What happened right before you woke up?", category: "Ending" },
      { prompt: "Did the dream remind you of anything from your past?", category: "Memory" },
      { prompt: "What symbols or objects were important in the dream?", category: "Symbols" },
      { prompt: "How did you feel when you woke up?", category: "Wake" }
    ];
    
    const stmt = db.prepare('INSERT INTO dream_prompts (prompt, category) VALUES (?, ?)');
    defaultPrompts.forEach(({ prompt, category }) => {
      stmt.run(prompt, category);
    });
  }
  } catch (err) {
    // Table doesn't exist yet, schema not initialized - skip for now
    console.log('dream_prompts table not ready yet, skipping prompts initialization');
  }
}

// Initialize prompts later - wait for schema to be ready
setTimeout(() => {
  initializePrompts();
}, 2000); // Wait 2 seconds for schema to complete

// Get all active prompts
promptsRouter.get('/', (req, res) => {
  const category = req.query.category;
  const activeCond = db.isPostgres ? 'active = TRUE' : 'active = 1';
  let query = `SELECT * FROM dream_prompts WHERE ${activeCond}`;
  let params = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY category, id';
  
  const rows = db.prepare(query).all(...params);
  res.json({ items: rows });
});

// Get prompts by category
promptsRouter.get('/categories', (req, res) => {
  const activeCond = db.isPostgres ? 'active = TRUE' : 'active = 1';
  const categories = db.prepare(`
    SELECT 
      category,
      COUNT(*) as count
    FROM dream_prompts 
    WHERE ${activeCond}
    GROUP BY category
    ORDER BY category
  `).all();
  
  res.json({ categories });
});

// Get random prompt
promptsRouter.get('/random', (req, res) => {
  const category = req.query.category;
  const activeCond = db.isPostgres ? 'active = TRUE' : 'active = 1';
  let query = `SELECT * FROM dream_prompts WHERE ${activeCond}`;
  let params = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY RANDOM() LIMIT 1';
  
  const row = db.prepare(query).get(...params);
  res.json(row);
});

// Get multiple random prompts
promptsRouter.get('/random/:count', (req, res) => {
  const count = parseInt(req.params.count) || 3;
  const category = req.query.category;
  const activeCond = db.isPostgres ? 'active = TRUE' : 'active = 1';
  
  let query = `SELECT * FROM dream_prompts WHERE ${activeCond}`;
  let params = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY RANDOM() LIMIT ?';
  params.push(count);
  
  const rows = db.prepare(query).all(...params);
  res.json({ items: rows });
});
