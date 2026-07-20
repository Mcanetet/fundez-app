const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
}

function estimateTokensFromMessages(messages, reply = '') {
  const text = [...(messages || []).map((m) => m.content || ''), reply].join(' ');
  const approx = Math.max(1, Math.ceil(String(text).length / 4));
  const completion = Math.max(1, Math.ceil(String(reply).length / 4));
  const prompt = Math.max(1, approx - completion);
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion, estimated: true };
}

async function chatCompletion({ model, messages, temperature = 0.75, maxTokens = 800 }) {
  if (!isConfigured()) {
    throw new Error('OPENAI_API_KEY no configurada. Agrega la clave en las variables de entorno de Hostinger.');
  }

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI respondió ${res.status}`;
    throw new Error(msg);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI no devolvió respuesta');
  const reply = String(content).trim();
  const usage = data?.usage
    ? {
        prompt_tokens: Number(data.usage.prompt_tokens) || 0,
        completion_tokens: Number(data.usage.completion_tokens) || 0,
        total_tokens: Number(data.usage.total_tokens) || 0,
        estimated: false
      }
    : estimateTokensFromMessages(messages, reply);

  return { content: reply, usage, model: data?.model || model };
}

module.exports = {
  isConfigured,
  chatCompletion,
  estimateTokensFromMessages
};
