import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
// Order fast, reliable free models first
const FALLBACK_MODELS = [
  'deepseek/deepseek-chat-v3.1:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemma-2-2b-it:free'
];

async function callOpenRouter({ messages, model = DEFAULT_MODEL, temperature = 0.7, max_tokens = 300 }) {
  console.log('=== OPENROUTER DEBUG ===');
  console.log('API Key present:', !!OPENROUTER_API_KEY);
  console.log('API Key length:', OPENROUTER_API_KEY?.length || 0);
  console.log('Model:', model);
  console.log('Base URL:', OPENROUTER_BASE_URL);
  console.log('Messages count:', messages?.length || 0);
  console.log('Temperature:', temperature);
  console.log('Max tokens:', max_tokens);
  console.log('========================');

  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is missing or empty');
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.APP_PUBLIC_URL || 'https://ai-dream-catcher-api.onrender.com',
    'X-Title': 'AI Dream Catcher',
    'Content-Type': 'application/json'
  };

  const body = { model, messages, temperature, max_tokens, top_p: 0.9 };

  console.log('Request headers:', { ...headers, 'Authorization': 'Bearer [REDACTED]' });
  console.log('Request body:', { ...body, messages: `[${messages.length} messages]` });

  // Build a try-order: requested model (env/default) then known-good fallbacks (deduped)
  const tryOrder = [model, ...FALLBACK_MODELS].filter((m, i, arr) => m && arr.indexOf(m) === i);
  // Keep individual attempts snappy to respect route-level timeout
  const perAttemptTimeoutMs = 10_000;
  let currentModel = tryOrder[0];
  for (let attempt = 0; attempt < Math.min(tryOrder.length, 3); attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${Math.min(tryOrder.length, 3)}`);
      const { data } = await axios.post(
        OPENROUTER_BASE_URL,
        { ...body, model: currentModel },
        { headers, timeout: perAttemptTimeoutMs }
      );
      console.log('OpenRouter response received:', {
        model: data?.model,
        choices: data?.choices?.length || 0,
        usage: data?.usage
      });
      const text = data?.choices?.[0]?.message?.content || '';
      return { text, model: data?.model || currentModel, raw: data };
    } catch (err) {
      console.error(`OpenRouter attempt ${attempt + 1} failed:`, {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        message: err?.message,
        code: err?.code
      });
      
      const status = err?.response?.status;
      if ((status === 429 || status === 502 || status === 503) && attempt < tryOrder.length - 1) {
        console.log(`Rate limited, waiting ${1000 * (attempt + 1)}ms before retry...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        currentModel = tryOrder[attempt + 1];
        continue;
      }

      // Try a fallback free model if available
      const isModelError = status === 404 || String(err?.response?.data?.error?.message || '').toLowerCase().includes('model');
      const nextModel = tryOrder[attempt + 1];
      if (isModelError && nextModel) {
        console.log(`Switching to fallback model: ${nextModel}`);
        currentModel = nextModel;
        continue;
      }
      
      // Enhanced error message
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Unknown error';
      const errorCode = err?.response?.data?.error?.code || err?.response?.status || 'UNKNOWN';
      
      // If all models failed, provide a helpful message
      if (attempt >= Math.min(tryOrder.length, 3) - 1) {
        throw new Error(`AI service is currently unavailable. Please try again later. Last error: ${errorMessage}`);
      }
      
      throw new Error(`OpenRouter API Error (${errorCode}): ${errorMessage}`);
    }
  }
}

export async function analyzeDreamText(dreamText, isPremium = false) {
  let system, user;
  
  if (isPremium) {
    // Premium: Advanced multi-lens analysis
    system = {
      role: 'system',
      content: `You are an expert dream analyst specialized ONLY in dream interpretation and psychological analysis. You provide comprehensive dream analysis including:

1. **Symbolic Interpretation**: Key symbols and their meanings
2. **Psychological Analysis**: Emotional patterns and subconscious themes
3. **Personal Context**: How this relates to the dreamer's life
4. **Recurring Patterns**: Connections to common dream themes
5. **Actionable Insights**: Practical takeaways for personal growth
6. **Multiple Perspectives**: Different possible interpretations

IMPORTANT: You ONLY analyze dreams and provide psychological insights. You do NOT provide medical advice, mental health treatment recommendations, or guidance on topics unrelated to dreams and sleep. If the dream content suggests serious mental health concerns, encourage the dreamer to consult with appropriate professionals.

Be detailed, insightful, and provide specific examples from the dream content while staying within your scope of dream analysis.`
    };
    user = { 
      role: 'user', 
      content: `Please provide a comprehensive analysis of this dream:\n\n${dreamText}` 
    };
  } else {
    // Free: Basic analysis
    system = {
      role: 'system',
      content: `You are a dream analyst specialized ONLY in dream interpretation. Provide a brief, helpful interpretation focusing on the most obvious symbols and themes. Keep it concise and practical.

IMPORTANT: You ONLY analyze dreams and provide basic psychological insights. You do NOT provide medical advice, mental health treatment recommendations, or guidance on topics unrelated to dreams and sleep. Stay within your scope of dream analysis.`
    };
    user = { 
      role: 'user', 
      content: `Analyze this dream briefly:\n\n${dreamText}` 
    };
  }
  
  return await callOpenRouter({ 
    messages: [system, user],
    max_tokens: isPremium ? 1200 : 400,
    temperature: isPremium ? 0.8 : 0.7
  });
}

export async function chatWithAnalyst(history, userMessage, options = {}) {
  const system = {
    role: 'system',
    content: `You are a specialized dream analyst and mood tracker assistant for the AI Dream Catcher app. You ONLY provide guidance and insights about:

✅ Dreams and dream interpretation
✅ Mood tracking and emotional patterns
✅ Sleep patterns and their connection to dreams
✅ Dream symbolism and psychological analysis
✅ Personal growth insights related to dreams and emotions

❌ You MUST decline and redirect any questions about:
- Medical advice, health conditions, or mental health treatment
- Legal advice or financial guidance
- Relationship counseling beyond dream-related insights
- Political, religious, or controversial topics
- Technical support for other apps or services
- Any topic unrelated to dreams, moods, or sleep

If asked about topics outside your scope, politely redirect: "I'm specialized in dream analysis and mood tracking. I'd be happy to help you explore your dreams, moods, or sleep patterns instead."

Be empathetic, non-judgmental, and focus on helping users understand their dreams and emotional patterns.`
  };
  const messages = [system, ...history, { role: 'user', content: userMessage }];
  const { max_tokens, temperature } = options;
  return await callOpenRouter({ messages, max_tokens, temperature });
}

export { callOpenRouter };

