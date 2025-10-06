import express from 'express';
import { z } from 'zod';
import { db } from '../database.js';
import { requireAuth } from '../auth.js';
import { chatWithAnalyst } from '../openrouter.js';
import { createBillingMiddleware, incrementUsage } from '../billing.js';
import rateLimit from 'express-rate-limit';

export const chatRouter = express.Router();
chatRouter.use(requireAuth);

// Per-IP + per-user limiter for chat to prevent abuse
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
chatRouter.use(chatLimiter);

const chatSchema = z.object({
  history: z.array(z.object({ 
    role: z.enum(['user','assistant','system']).default('user'), 
    content: z.string(),
    timestamp: z.string().optional()
  })).optional(),
  message: z.string().min(1)
});

// Get chat history with subscription-based limits
// History disabled: always return empty to avoid DB storage usage
chatRouter.get('/', async (_req, res) => {
  return res.json({ history: [], total: 0, retention: 'none' });
});

chatRouter.post('/', createBillingMiddleware('chat_message'), async (req, res) => {
  const parse = chatSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { history = [], message } = parse.data;
  
  try {
    console.log('Chat request:', { historyLength: history?.length || 0, messageLength: message?.length || 0 });

    // Lightweight moderation: crisis/self-harm keywords
    const crisisRegex = /(suicide|self\s*harm|kill\s*myself|end\s*my\s*life|hurt\s*myself)/i;
    if (crisisRegex.test(message)) {
      return res.json({
        response: 'I’m really sorry you’re feeling this way. I cannot help with urgent safety issues. Please contact your local emergency services or the Suicide & Crisis Lifeline at 988 (US) or visit 988lifeline.org for immediate support.'
      });
    }
    
    // Parse dream number references in the message (e.g., "analyze dream 1", "tell me about dream 3")
    let processedMessage = message;
    const dreamNumberMatches = message.match(/dream\s+(\d+)/gi);
    
    if (dreamNumberMatches) {
      for (const match of dreamNumberMatches) {
        const dreamNumber = parseInt(match.match(/\d+/)[0]);
        try {
          const dream = await db.prepare('SELECT * FROM dreams WHERE user_id = ? AND user_dream_number = ?').get(req.user.id, dreamNumber);
          if (dream) {
            processedMessage = processedMessage.replace(
              new RegExp(match, 'gi'), 
              `dream ${dreamNumber} (${dream.title || 'Untitled'}): "${dream.content.substring(0, 200)}${dream.content.length > 200 ? '...' : ''}"`
            );
          } else {
            processedMessage = processedMessage.replace(new RegExp(match, 'gi'), `dream ${dreamNumber} (not found)`);
          }
        } catch (error) {
          console.error('Error fetching dream by number:', error);
          processedMessage = processedMessage.replace(new RegExp(match, 'gi'), `dream ${dreamNumber} (error loading)`);
        }
      }
    }
    
    // Add timeout wrapper to prevent hanging (increase to 40s)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chat request timed out after 40 seconds')), 40000);
    });
    
    const chatPromise = chatWithAnalyst(history, processedMessage, {
      max_tokens: req.billing?.isPremium ? 900 : 400,
      temperature: req.billing?.isPremium ? 0.8 : 0.7
    });
    const { text, model } = await Promise.race([chatPromise, timeoutPromise]);
    console.log('Chat response:', { text: text.substring(0, 100), model });
    
    // Track usage for billing
    if (!req.billing.unlimited) {
      await incrementUsage(req.user.id, 'chat_message', req.billing.period);
    }
    
    // Do not persist chat to DB to save storage
    res.json({ response: text, model });
  } catch (e) {
    console.error('Chat error:', e.message, e.response?.data);
    
    // Check if it's a timeout error
    if (e.message.includes('timed out') || e.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: 'Request timeout', 
        details: 'The AI service is taking too long to respond. Please try again with a shorter message.' 
      });
    }
    
    const status = e?.response?.status || 500;
    res.status(status).json({ error: 'AI service error', details: e.message });
  }
});


