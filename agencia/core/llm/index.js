import '../env.js'; // lee .env (si existe) antes de detectar las API keys
import { createMock } from './mock.js';
import { createAnthropic } from './anthropic.js';
import { createOpenAI } from './openai.js';
import { createGemini } from './gemini.js';
import { createGroq } from './groq.js';

/** Extrae y parsea JSON de una respuesta de LLM (tolera ```json fences y texto alrededor). */
export function extractJSON(raw) {
  if (raw && typeof raw === 'object') return raw;
  let s = String(raw ?? '').trim();
  const fence = s.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s); } catch { /* sigue */ }
  // Busca el primer bloque balanceado { } o [ ]
  for (let start = 0; start < s.length; start++) {
    const open = s[start];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close && --depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { break; }
      }
    }
  }
  throw new Error('La respuesta del LLM no contiene JSON válido');
}

const JSON_RULE = 'Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni explicaciones.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRateLimit = (e) => /HTTP 429|rate limit|too many requests/i.test(String(e?.message || ''));

/** Espera sugerida por el proveedor ("Please try again in 15.54s" / "…in 800ms"); si no la trae, retroceso exponencial. */
export function retryDelayMs(err, attempt) {
  const m = /try again in ([\d.]+)\s*(ms|s)\b/i.exec(String(err?.message || ''));
  if (m) return Math.round(parseFloat(m[1]) * (m[2].toLowerCase() === 'ms' ? 1 : 1000)) + 250;
  return Math.min(2000 * 2 ** attempt, 15000);
}

/**
 * Los proveedores (sobre todo planes gratuitos) limitan tokens por minuto. Para no rendirse al primer 429:
 * las llamadas van EN FILA (una a la vez) y ante un límite de uso se espera lo que pide el proveedor y se reintenta.
 */
function makeCaller(base) {
  let tail = Promise.resolve();
  const maxWait = Number(process.env.LLM_MAX_RETRY_WAIT_MS ?? 30000);
  const maxRetries = Number(process.env.LLM_RATE_RETRIES ?? 3);
  const attemptCall = async (opts) => {
    for (let attempt = 0; ; attempt++) {
      try { return await base.complete(opts); } catch (e) {
        if (!isRateLimit(e) || attempt >= maxRetries) throw e;
        const wait = retryDelayMs(e, attempt);
        if (wait > maxWait) throw e;
        await sleep(wait);
      }
    }
  };
  return (opts) => {
    const run = tail.then(() => attemptCall(opts));
    tail = run.catch(() => {});
    return run;
  };
}

function wrap(base) {
  const call = makeCaller(base);
  return {
    name: base.name,
    available: base.available,
    complete: (opts) => call(opts),
    async completeJSON({ system = '', prompt = '' } = {}) {
      const sys = system ? `${system}\n\n${JSON_RULE}` : JSON_RULE;
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        const p = attempt === 0 ? prompt : `${prompt}\n\nIMPORTANTE: tu respuesta anterior no era JSON válido. Devolvé solo JSON válido, sin fences ni comentarios.`;
        try {
          return extractJSON(await call({ system: sys, prompt: p, json: true }));
        } catch (e) { lastErr = e; if (isRateLimit(e)) break; }
      }
      throw new Error(`completeJSON falló tras reintento: ${lastErr.message}`);
    },
  };
}

/**
 * Con PUBLIC_DEMO=1 el LLM real solo se entrega si quien llama lo desbloquea explicitamente ({ unlocked: true }):
 * sin eso se devuelve el mock y NO se lee ninguna API key.
 */
export function getLLM({ unlocked = false } = {}) {
  const env = process.env;
  if (/^(1|true|yes|on)$/i.test(String(env.PUBLIC_DEMO || '').trim()) && !unlocked) return createMock();
  const keys = { anthropic: env.ANTHROPIC_API_KEY, openai: env.OPENAI_API_KEY, gemini: env.GEMINI_API_KEY, groq: env.GROQ_API_KEY };
  const factories = { anthropic: createAnthropic, openai: createOpenAI, gemini: createGemini, groq: createGroq };
  let provider = (env.LLM_PROVIDER || '').toLowerCase().trim();
  if (!provider) provider = ['anthropic', 'openai', 'gemini', 'groq'].find((p) => keys[p]) || 'mock';
  if (provider === 'mock' || !factories[provider] || !keys[provider]) return createMock();
  return wrap(factories[provider]({ apiKey: keys[provider] }));
}
