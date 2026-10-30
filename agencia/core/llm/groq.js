// Groq: API compatible con OpenAI (chat/completions). Modelo por defecto configurable con GROQ_MODEL.
import { createOpenAI } from './openai.js';

// Los modelos disponibles dependen de la cuenta: GET https://api.groq.com/openai/v1/models. Cambiar con GROQ_MODEL.
export const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export function createGroq({ apiKey, model } = {}) {
  return createOpenAI({
    apiKey,
    name: 'groq',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    model: model || process.env.GROQ_MODEL || DEFAULT_MODEL,
  });
}
