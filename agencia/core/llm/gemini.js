export const DEFAULT_MODEL = 'gemini-2.5-flash';

export function createGemini({ apiKey, model } = {}) {
  const m = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return {
    name: 'gemini',
    available: true,
    model: m,
    async complete({ system = '', prompt = '', json = false } = {}) {
      const body = { contents: [{ role: 'user', parts: [{ text: String(prompt) }] }] };
      if (system) body.systemInstruction = { parts: [{ text: system }] };
      if (json) body.generationConfig = { responseMimeType: 'application/json' };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
      const data = JSON.parse(text);
      return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    },
  };
}
