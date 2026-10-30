export const DEFAULT_MODEL = 'gpt-4.1-mini';

/** Cliente de la API "chat/completions". Sirve para OpenAI y para proveedores compatibles (p. ej. Groq) vía baseUrl/name. */
export function createOpenAI({ apiKey, model, baseUrl, name = 'openai' } = {}) {
  const m = model || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const base = (baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  return {
    name,
    available: true,
    model: m,
    async complete({ system = '', prompt = '', json = false } = {}) {
      const messages = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: String(prompt) });
      const body = { model: m, messages };
      if (json) body.response_format = { type: 'json_object' };
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${name} HTTP ${res.status}: ${text.slice(0, 300)}`);
      const data = JSON.parse(text);
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}
