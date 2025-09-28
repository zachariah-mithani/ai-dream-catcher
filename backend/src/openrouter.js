import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'x-ai/grok-4-fast:free';

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
  };

  const body = { model, messages, temperature, max_tokens, top_p: 0.9 };

  console.log('Request headers:', { ...headers, 'Authorization': 'Bearer [REDACTED]' });
  console.log('Request body:', { ...body, messages: `[${messages.length} messages]` });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/3`);
      const { data } = await axios.post(OPENROUTER_BASE_URL, body, { headers, timeout: 30_000 });
      console.log('OpenRouter response received:', {
        model: data?.model,
        choices: data?.choices?.length || 0,
        usage: data?.usage
      });
      const text = data?.choices?.[0]?.message?.content || '';
      return { text, model: data?.model || model, raw: data };
    } catch (err) {
      console.error(`OpenRouter attempt ${attempt + 1} failed:`, {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        message: err?.message,
        code: err?.code
      });
      
      const status = err?.response?.status;
      if (status === 429 && attempt < 2) {
        console.log(`Rate limited, waiting ${1000 * (attempt + 1)}ms before retry...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      
      // Enhanced error message
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Unknown error';
      const errorCode = err?.response?.data?.error?.code || err?.response?.status || 'UNKNOWN';
      throw new Error(`OpenRouter API Error (${errorCode}): ${errorMessage}`);
    }
  }
}

export async function analyzeDreamText(dreamText) {
  const system = {
    role: 'system',
    content: 'You are a careful dream analyst. Provide psychological, symbolic, and cultural interpretations. Include multiple possibilities and highlight uncertainties. Be concise and structured.'
  };
  const user = { role: 'user', content: `Analyze this dream entry and suggest interpretations:\n\n${dreamText}` };
  return await callOpenRouter({ messages: [system, user] });
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

