import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5-8b';

async function callOpenRouter({ messages, model = DEFAULT_MODEL, temperature = 0.7, max_tokens = 800 }) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.APP_PUBLIC_URL || 'http://localhost',
    'X-Title': 'AI Dream Catcher',
  };

  const body = { model, messages, temperature, max_tokens, top_p: 0.9 };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await axios.post(OPENROUTER_BASE_URL, body, { headers, timeout: 30_000 });
      const text = data?.choices?.[0]?.message?.content || '';
      return { text, model: data?.model || model, raw: data };
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429 && attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
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

