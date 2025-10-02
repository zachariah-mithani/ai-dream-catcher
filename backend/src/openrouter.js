import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'x-ai/grok-4-fast:free';
const FALLBACK_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'deepseek/deepseek-chat:free'
];

async function callOpenRouter({ messages, model = DEFAULT_MODEL, temperature = 0.7, max_tokens = 800 }) {
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

  let currentModel = model;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/3`);
      const { data } = await axios.post(OPENROUTER_BASE_URL, { ...body, model: currentModel }, { headers, timeout: 30_000 });
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
      if ((status === 429 || status === 502 || status === 503) && attempt < 3) {
        console.log(`Rate limited, waiting ${1000 * (attempt + 1)}ms before retry...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      // Try a fallback free model if available
      const isModelError = status === 404 || String(err?.response?.data?.error?.message || '').toLowerCase().includes('model');
      const nextModel = FALLBACK_MODELS[attempt];
      if (isModelError && nextModel) {
        console.log(`Switching to fallback model: ${nextModel}`);
        currentModel = nextModel;
        continue;
      }
      
      // Enhanced error message
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Unknown error';
      const errorCode = err?.response?.data?.error?.code || err?.response?.status || 'UNKNOWN';
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
      content: `You are an expert dream analyst with deep knowledge of psychology, symbolism, and cultural dream interpretation. Provide a comprehensive analysis including:

1. **Symbolic Interpretation**: Key symbols and their meanings
2. **Psychological Analysis**: Emotional patterns and subconscious themes
3. **Personal Context**: How this relates to the dreamer's life
4. **Recurring Patterns**: Connections to common dream themes
5. **Actionable Insights**: Practical takeaways for personal growth
6. **Multiple Perspectives**: Different possible interpretations

Be detailed, insightful, and provide specific examples from the dream content.`
    };
    user = { 
      role: 'user', 
      content: `Please provide a comprehensive analysis of this dream:\n\n${dreamText}` 
    };
  } else {
    // Free: Basic analysis
    system = {
      role: 'system',
      content: 'You are a dream analyst. Provide a brief, helpful interpretation focusing on the most obvious symbols and themes. Keep it concise and practical.'
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

export async function chatWithAnalyst(history, userMessage) {
  const system = {
    role: 'system',
    content: 'You are an empathetic dream analyst and assistant. Ask clarifying questions, reference prior entries when provided, and be non-judgmental.'
  };
  const messages = [system, ...history, { role: 'user', content: userMessage }];
  return await callOpenRouter({ messages });
}

export { callOpenRouter };

