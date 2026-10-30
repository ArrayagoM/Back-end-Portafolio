// Mejora con IA (persona Rocío) con validación estricta; cada sección inválida cae al determinista y se registra el motivo.
import { voseo } from '../agents/voseo.js';
import { GUARANTEE_RE, normBrief, norm, numbersIn, slug, sanitizeNote, sentences } from './util.js';

const SYSTEM = `Sos Rocío, estratega de SEO y visibilidad: extrovertida, carismática y muy honesta (voseo rioplatense).
Tu trabajo: mejorar palabras clave, FAQ, bloque de respuesta directa y acciones fuera del sitio para un negocio.
REGLAS INNEGOCIABLES: nadie puede garantizar posicionamiento; no prometas ni insinúes garantías (nada de "garantizado", "asegurado", "primer puesto").
Usá SOLO hechos del brief: no inventes precios, números, horarios, años de experiencia, premios, envíos, descuentos ni certificaciones.
Sin URLs, sin HTML, sin emojis.
Devolvé SOLO JSON con estas claves (todas opcionales):
{"primaryKeywords":[3-5 strings],"secondaryKeywords":[4-10 strings],"longTail":[4-12 strings],
"faq":[{"q":"pregunta real que haría el público terminada en ?","a":"respuesta breve solo con hechos del brief"}] (3-8),
"answerBlock":"2 o 3 frases factuales: quién es el negocio, qué ofrece, dónde y cómo contactarlo",
"offSite":[{"title":string,"why":string,"steps":[2-6 strings],"effort":"baja|media|alta","impact":"bajo|medio|alto","timeline":string}] (hasta 3 acciones nuevas)}`;

const URL_HTML = /https?:\/\/|www\.|<[^>]*>|[<>{}]|\b[\w-]+\.(?:com|net|org|ar|io|app)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
// Términos que son "datos" si no están en el brief: se rechazan.
const CLAIMS = /\b(gratis|gratuit[oa]s?|sin cargo|sin costo|env[ií]os?|delivery|domicilio|financiaci[oó]n|cuotas|descuentos?|promo(?:ci[oó]n(?:es)?)?|ofertas?|urgenc\w+|premi\w+|galardon\w+|certificad\w+|matriculad\w+|l[ií]der(?:es)?|el mejor|la mejor|los mejores|las mejores|d[eé]cadas|trayectoria|reconocid\w+|24\s*(?:hs|horas))\b/gi;

class Invalid extends Error {}
const bad = (m) => { throw new Invalid(m); };

function checkText(t, ctx, { min = 2, max = 200, label = 'texto', digits = true } = {}) {
  if (typeof t !== 'string') bad(`${label}: no es texto`);
  const s = t.trim();
  if (s.length < min || s.length > max) bad(`${label}: largo ${s.length} fuera de ${min}-${max}`);
  let scan = s;
  for (const tok of ctx.allowed) scan = scan.split(tok).join(' ');
  if (URL_HTML.test(scan)) bad(`${label}: contiene URL o HTML`);
  if (EMOJI.test(s)) bad(`${label}: contiene emojis`);
  if (GUARANTEE_RE.test(s)) bad(`${label}: promete o insinúa garantías`);
  if (/\$|€|USD/.test(s)) bad(`${label}: contiene precios`);
  if (digits) for (const n of s.match(/\d+/g) || []) if (!ctx.nums.has(n)) bad(`${label}: número "${n}" que no está en el brief`);
  for (const m of s.matchAll(CLAIMS)) if (!ctx.briefNorm.includes(norm(m[0]).replace(/s$/, ''))) bad(`${label}: afirma "${m[0]}" que no está en el brief`);
  return voseo(s);
}
function checkList(v, ctx, { min, max, label, itemMax = 80 }) {
  if (!Array.isArray(v)) bad(`${label}: no es lista`);
  if (v.length < min || v.length > max) bad(`${label}: cantidad ${v.length} fuera de ${min}-${max}`);
  const out = [];
  for (const x of v) { const t = checkText(x, ctx, { min: 3, max: itemMax, label }); if (!out.some((y) => norm(y) === norm(t))) out.push(t); }
  return out;
}

const VALIDATORS = {
  primaryKeywords: (v, c) => checkList(v, c, { min: 3, max: 6, label: 'primaryKeywords' }),
  secondaryKeywords: (v, c) => checkList(v, c, { min: 4, max: 12, label: 'secondaryKeywords' }),
  longTail: (v, c) => checkList(v, c, { min: 4, max: 15, label: 'longTail', itemMax: 100 }),
  faq: (v, c) => {
    if (!Array.isArray(v) || v.length < 3 || v.length > 8) bad('faq: cantidad fuera de 3-8');
    return v.map((x) => {
      if (!x || typeof x !== 'object') bad('faq: item inválido');
      const q = checkText(x.q, c, { min: 8, max: 120, label: 'faq.q' });
      if (!/\?\s*$/.test(q)) bad('faq.q: debe ser una pregunta');
      return { q, a: checkText(x.a, c, { min: 10, max: 300, label: 'faq.a' }) };
    });
  },
  answerBlock: (v, c) => {
    const t = checkText(v, c, { min: 60, max: 450, label: 'answerBlock' });
    const n = sentences(t).length;
    if (n < 2 || n > 4) bad(`answerBlock: ${n} frases (se piden 2 o 3)`);
    if (!norm(t).includes(norm(c.name))) bad('answerBlock: no menciona el nombre del negocio');
    return t;
  },
  offSite: (v, c) => {
    if (!Array.isArray(v) || v.length < 1 || v.length > 5) bad('offSite: cantidad fuera de 1-5');
    return v.map((x) => {
      if (!x || typeof x !== 'object') bad('offSite: item inválido');
      if (!['baja', 'media', 'alta'].includes(x.effort) || !['bajo', 'medio', 'alto'].includes(x.impact)) bad('offSite: effort/impact inválidos');
      if (!Array.isArray(x.steps) || x.steps.length < 2 || x.steps.length > 8) bad('offSite.steps: cantidad inválida');
      const timeline = String(x.timeline ?? '');
      if (!/^[\p{L}\d\s,.()+-]{3,60}$/u.test(timeline) || GUARANTEE_RE.test(timeline)) bad('offSite.timeline inválido');
      const title = checkText(x.title, c, { min: 4, max: 90, label: 'offSite.title' });
      return { id: `ia-${slug(title)}`, title, why: checkText(x.why, c, { min: 10, max: 300, label: 'offSite.why' }), steps: x.steps.map((s) => checkText(s, c, { min: 5, max: 220, label: 'offSite.steps' })), effort: x.effort, impact: x.impact, timeline };
    });
  },
};

function parseLoose(raw) {
  if (raw && typeof raw === 'object') return raw;
  const s = String(raw ?? '');
  const f = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const t = f ? f[1] : s;
  const a = t.indexOf('{');
  const z = t.lastIndexOf('}');
  if (a < 0 || z <= a) throw new Error('la respuesta no contiene JSON');
  return JSON.parse(t.slice(a, z + 1));
}

/** Aplica la mejora con IA sobre un plan determinista. Devuelve { plan, notes }. */
export async function improveWithAI(plan, rawBrief, llm) {
  const notes = [];
  if (!llm || !llm.available) return { plan, notes: ['IA no disponible: plan determinista.'] };
  const b = normBrief(rawBrief);
  const allowed = [b.contact.email, b.contact.website, b.website].filter(Boolean);
  const ctx = { allowed, nums: numbersIn(rawBrief), briefNorm: norm(JSON.stringify(rawBrief ?? {})), name: b.name };
  const summary = { negocio: b.name, rubro: plan.kind?.label, zona: b.place?.areas, descripcion: b.description, publico: b.audience, servicios: b.services, diferenciales: b.differentiators, contacto: b.contact, cta: b.cta };
  const prompt = `Brief del negocio:\n${JSON.stringify(summary)}\n\nPlan base (mejoralo, no lo empeores):\n${JSON.stringify({ primaryKeywords: plan.primaryKeywords, secondaryKeywords: plan.secondaryKeywords, longTail: plan.longTail, faq: plan.faq, answerBlock: plan.aiVisibility.answerBlock })}`;
  let res;
  try {
    const raw = typeof llm.completeJSON === 'function' ? await llm.completeJSON({ system: SYSTEM, prompt }) : await llm.complete({ system: SYSTEM, prompt, json: true });
    res = parseLoose(raw);
    if (!res || typeof res !== 'object' || Array.isArray(res)) throw new Error('la respuesta no es un objeto');
  } catch (e) {
    return { plan, notes: [`IA falló (${sanitizeNote(e.message)}): plan determinista.`] };
  }
  const out = { ...plan, aiVisibility: { ...plan.aiVisibility } };
  const used = [];
  for (const key of Object.keys(VALIDATORS)) {
    if (res[key] === undefined) continue;
    try {
      const v = VALIDATORS[key](res[key], ctx);
      if (key === 'answerBlock') out.aiVisibility.answerBlock = v;
      else if (key === 'offSite') {
        const have = new Set(out.offSite.map((o) => o.id));
        out.offSite = [...out.offSite, ...v.filter((o) => !have.has(o.id)).slice(0, 3)];
      } else out[key] = key === 'primaryKeywords' || key === 'secondaryKeywords' || key === 'longTail' || key === 'faq' ? v : out[key];
      used.push(key);
    } catch (e) {
      if (!(e instanceof Invalid)) throw e;
      notes.push(`IA: "${key}" descartado (${sanitizeNote(e.message)}); se mantiene el determinista.`);
    }
  }
  if (used.length) { out.source = notes.length ? 'mixto' : 'ia'; notes.unshift(`IA aplicada a: ${used.join(', ')}.`); }
  else notes.push('IA: ninguna sección válida; plan determinista.');
  return { plan: out, notes };
}
