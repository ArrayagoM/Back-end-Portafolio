export const DEFAULT_MODEL = 'claude-sonnet-4-5';

export function createAnthropic({ apiKey, model } = {}) {
  const m = model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  return {
    name: 'anthropic',
    available: true,
    model: m,
    async complete({ system = '', prompt = '' } = {}) {
      const body = { model: m, max_tokens: 8192, messages: [{ role: 'user', content: String(prompt) }] };
      if (system) body.system = system;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${text.slice(0, 300)}`);
      const data = JSON.parse(text);
      return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    },
  };
}
