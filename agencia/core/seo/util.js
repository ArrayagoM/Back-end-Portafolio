// Utilidades compartidas del módulo SEO (Rocío). Cero dependencias.
import { intlDigits } from '../phone.js';

export const DISCLAIMER = 'Nadie puede garantizar posicionamiento ni apariciones en Google ni en las respuestas de las IAs: los buscadores y los asistentes deciden con criterios propios que cambian todo el tiempo. Este plan trabaja con probabilidades: buenas prácticas, mediciones y objetivos realistas, y los resultados dependen de tu rubro, tu zona y la competencia. Lo bueno es que todo esto suma, y lo vamos a medir juntos.';

// Frases de promesa/garantía que NINGÚN texto del módulo (ni de la IA) puede contener (el disclaimer es la única excepción).
export const GUARANTEE_RE = /garant[ií]|asegur|primer(?:o|a)?\s+(?:puesto|lugar|posici[oó]n)|n[uú]mero\s+(?:1|uno)\b|(?<![#\w])#1\b|top\s?1\b|puesto\s+(?:1|uno)\b|sin\s+falta|infalible|100\s?%|resultados?\s+(?:inmediatos?|r[aá]pidos?)|seguro\s+que\s+(?:aparec|sal|te\s+encuentr)|vas\s+a\s+(?:aparecer|salir)|s[ií]\s+o\s+s[ií]/i;

export const SECTORS = ['gastronomia', 'salud', 'belleza', 'fitness', 'legal', 'construccion', 'tienda', 'educacion', 'tecnologia', 'servicios'];

export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const normWords = (s) => norm(s).replace(/[^a-z0-9ñ]+/g, ' ').trim();
export const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
export const arr = (v) => (Array.isArray(v) ? v : []);
export const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
export const lowerFirst = (t) => String(t ?? '').replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase());
export const uniq = (list, key = normWords) => { const seen = new Set(); return list.filter((x) => { const k = key(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };

/** Hash FNV-1a estable (desempate determinista por nombre del negocio). */
export function hash(s) {
  let h = 2166136261;
  for (const ch of String(s ?? '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export const pickBy = (list, seed, offset = 0) => list[(hash(seed) + offset) % list.length];

export function clipWords(t, max) {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max + 1).replace(/\s+\S*$/, '').replace(/[\s,;:—–-]+$/, '');
}
export const listJoin = (items) => {
  const l = items.filter(Boolean);
  return l.length <= 1 ? (l[0] || '') : `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}`;
};
export const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]);
export const slug = (s) => normWords(s).replace(/\s+/g, '-') || 'x';
export const sentences = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);

/** Primera oración del texto del cliente, sin frases de promesa. */
export function safeSentence(text, max = 160) {
  const s = sentences(text).find((x) => !GUARANTEE_RE.test(x)) || '';
  const out = clipWords(s, max);
  return out && !/[.!?]$/.test(out) ? `${out}.` : out;
}

/** Texto sin claves: los motivos de error se registran, las keys nunca. */
export function sanitizeNote(msg) {
  return String(msg ?? '').replace(/\b(?:gsk_|sk-|sk_|AIza|xai-|ghp_)[A-Za-z0-9_-]{8,}/g, '[clave-oculta]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [oculto]').replace(/(key|token|secret)=([^&\s]+)/gi, '$1=[oculto]').slice(0, 300);
}

export function jsonLdString(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/* ---------- URL base ---------- */
export function normUrl(v) {
  let s = str(v);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) { if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(s)) s = `https://${s}`; else return ''; }
  try { const u = new URL(s); return `${u.origin}${u.pathname.replace(/\/?$/, '/')}`; } catch { return ''; }
}

/* ---------- redes ---------- */
const stripAt = (h) => str(h).replace(/^@/, '');
export function socialUrls(contact = {}) {
  const out = [];
  const add = (network, url) => { if (url) out.push({ network, url }); };
  const handleOr = (v, make, re) => {
    const s = str(v);
    if (/^https:\/\//i.test(s)) { try { return new URL(s).href; } catch { return ''; } }
    const h = stripAt(s);
    return re.test(h) ? make(h) : '';
  };
  add('instagram', handleOr(contact.instagram, (h) => `https://www.instagram.com/${h}/`, /^[A-Za-z0-9._]{1,30}$/));
  add('facebook', handleOr(contact.facebook, (h) => `https://www.facebook.com/${h}`, /^[A-Za-z0-9.]{5,50}$/));
  add('tiktok', handleOr(contact.tiktok, (h) => `https://www.tiktok.com/@${h}`, /^[A-Za-z0-9._]{2,30}$/));
  add('youtube', handleOr(contact.youtube, (h) => `https://www.youtube.com/@${h}`, /^[A-Za-z0-9._-]{3,40}$/));
  add('x', handleOr(contact.x || contact.twitter, (h) => `https://x.com/${h}`, /^[A-Za-z0-9_]{1,15}$/));
  add('linkedin', /^https:\/\//i.test(str(contact.linkedin)) ? handleOr(contact.linkedin, () => '', /^$/) : '');
  return out;
}
export const urlKey = (u) => str(u).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');

/* ---------- lugar (SEO local solo si el brief trae ubicación) ---------- */
const CITIES = ['Ciudad Autónoma de Buenos Aires', 'Buenos Aires', 'CABA', 'Capital Federal', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Mar del Plata',
  'San Miguel de Tucumán', 'Tucumán', 'Salta', 'Santa Fe', 'Neuquén', 'San Juan', 'San Luis', 'Bahía Blanca', 'Resistencia', 'Corrientes', 'Posadas', 'Paraná',
  'Santiago del Estero', 'San Salvador de Jujuy', 'Río Cuarto', 'Villa Carlos Paz', 'San Carlos de Bariloche', 'Bariloche', 'Ushuaia', 'Comodoro Rivadavia',
  'Trelew', 'Puerto Madryn', 'Río Gallegos', 'Catamarca', 'La Rioja', 'Formosa', 'Tandil', 'San Rafael', 'Tigre', 'Quilmes', 'Lanús', 'Morón', 'Avellaneda',
  'San Isidro', 'Vicente López', 'Montevideo', 'Punta del Este', 'Santiago de Chile', 'Valparaíso', 'Bogotá', 'Medellín', 'Asunción', 'Quito', 'Ciudad de México',
  'Guadalajara', 'Monterrey', 'Santa Cruz de la Sierra', 'Cochabamba', 'Caracas'];
const CITY_N = CITIES.map((c) => ({ c, n: normWords(c) })).sort((a, b) => b.n.length - a.n.length);
const STREET_WORDS = new Set(['av', 'avenida', 'calle', 'pasaje', 'pje', 'bv', 'bulevar', 'boulevard', 'diagonal', 'ruta', 'camino']);
const COUNTRY_RE = /^(argentina|uruguay|chile|paraguay|bolivia|per[uú]|colombia|m[eé]xico|ecuador|venezuela)$/i;

function findCity(text) {
  const t = ` ${normWords(text)} `;
  for (const { c, n } of CITY_N) {
    const idx = t.indexOf(` ${n} `);
    if (idx < 0) continue;
    const after = t.slice(idx + n.length + 2).trimStart();
    if (/^\d/.test(after)) continue; // "Córdoba 1234" es una calle
    const prev = t.slice(0, idx).trimEnd().split(' ').pop();
    if (STREET_WORDS.has(prev)) continue; // "Av. Córdoba"
    return c;
  }
  return '';
}

export function detectPlace(raw, contact, description, audience) {
  const explicit = (k) => str(raw?.[k]);
  let city = explicit('city');
  let neighborhood = explicit('neighborhood');
  const loc = explicit('location') || explicit('zone');
  if (loc && !city) city = findCity(loc) || loc;
  const addr = str(contact?.address);
  if (addr && !city) {
    const parts = addr.split(',').map((p) => p.trim()).filter(Boolean).filter((p) => !COUNTRY_RE.test(p) && !/^provincia\b/i.test(p));
    const tail = parts.slice(1).filter((p) => !/\d/.test(p) && p.length >= 3);
    if (tail.length) { city = tail[tail.length - 1]; if (tail.length > 1 && !neighborhood) neighborhood = tail[tail.length - 2]; }
    else city = findCity(addr);
  }
  const free = [description, audience].map(str).join('. ');
  if (!neighborhood) {
    const m = free.match(/\bbarrio\s+(?:de\s+|del\s+)?([A-ZÁÉÍÓÚÑ][\p{L}]+(?:\s+(?:de\s+|del\s+)?[A-ZÁÉÍÓÚÑ][\p{L}]+){0,2})/u);
    if (m) neighborhood = m[1];
  }
  if (!city) city = findCity(free);
  if (neighborhood && norm(neighborhood) === norm(city)) neighborhood = '';
  const areas = uniq([neighborhood, city].filter(Boolean));
  if (!areas.length) return null;
  return { city, neighborhood, label: city || neighborhood, areas };
}

/* ---------- brief normalizado ---------- */
export function normBrief(raw) {
  const b = raw && typeof raw === 'object' ? raw : {};
  const c = b.contact && typeof b.contact === 'object' ? b.contact : {};
  const social = b.social && typeof b.social === 'object' ? b.social : {};
  const contact = {};
  for (const k of ['phone', 'email', 'whatsapp', 'address', 'hours', 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'twitter', 'x']) {
    const v = str(c[k]) || str(social[k]);
    if (v) contact[k] = v;
  }
  const services = arr(b.services).map((x) => (typeof x === 'string'
    ? { name: str(x), description: '', price: '' }
    : { name: str(x?.name), description: str(x?.description), price: str(x?.price) })).filter((x) => x.name);
  const cta = b.cta && typeof b.cta === 'object' ? b.cta : {};
  const description = str(b.description);
  const audience = str(b.audience);
  return {
    name: str(b.businessName) || 'Mi negocio',
    sector: SECTORS.includes(b.sector) ? b.sector : 'servicios',
    description, audience,
    goals: arr(b.goals).map(str).filter(Boolean),
    services,
    differentiators: arr(b.differentiators).map(str).filter(Boolean).filter((d) => !GUARANTEE_RE.test(d)),
    contact,
    cta: { label: str(cta.label), type: ['whatsapp', 'call', 'form', 'reserve'].includes(cta.type) ? cta.type : (contact.whatsapp ? 'whatsapp' : contact.phone ? 'call' : 'form') },
    website: normUrl(b.website || b.url || b.siteUrl || b.domain),
    excludeAITraining: b.excludeAITraining === true || b.allowAITraining === false || b.aiTraining === false,
    blockAI: b.allowAI === false,
    testimonials: arr(b.testimonials),
    place: detectPlace(b, contact, description, audience),
  };
}

/** Teléfono en formato internacional con "+" (solo si el brief lo trae). */
export function telOf(contact) {
  if (contact.phone) { const d = intlDigits(contact.phone); return d ? `+${d}` : ''; }
  if (contact.whatsapp) { const d = intlDigits(contact.whatsapp, true); return d ? `+${d}` : ''; }
  return '';
}
export const digitsOf = (s) => String(s ?? '').replace(/\D+/g, '');
export const last8 = (s) => digitsOf(s).slice(-8);

/** Todos los números (secuencias de dígitos) que aparecen en un valor: sirven para detectar datos inventados. */
export const numbersIn = (v) => new Set((JSON.stringify(v ?? '').match(/\d+/g)) || []);

/* ---------- horarios: solo si el texto es inequívoco ---------- */
const DAYS = [['lunes', 'lun', 'Monday'], ['martes', 'mar', 'Tuesday'], ['miercoles', 'mie', 'Wednesday'], ['jueves', 'jue', 'Thursday'], ['viernes', 'vie', 'Friday'], ['sabado', 'sab', 'Saturday'], ['domingo', 'dom', 'Sunday']];
const dayIndex = (w) => DAYS.findIndex(([full, ab]) => w === full || w === ab || w === `${ab}.`);
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

function parseSegment(seg) {
  const t = ` ${norm(seg)} `.replace(/\bhs?\b\.?|\bhoras\b/g, ' ').replace(/\s+/g, ' ');
  const time = t.match(/(?:\bde\s+|\bdesde\s+|\s)(\d{1,2})(?::(\d{2}))?\s*(?:a|-|–|hasta)\s*(?:las\s+)?(\d{1,2})(?::(\d{2}))?(?=\s|$)/);
  if (!time) return null;
  const [h1, m1, h2, m2] = [+time[1], +(time[2] || 0), +time[3], +(time[4] || 0)];
  if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59 || h1 * 60 + m1 >= h2 * 60 + m2) return null;
  const rest = (t.slice(0, time.index) + ' ' + t.slice(time.index + time[0].length)).replace(/\b(de|del|los|las|todos|atendemos|abierto|horario|y)\b/g, ' ');
  if (/\d/.test(rest)) return null; // más números: ambiguo
  const words = rest.replace(/[^a-z. ]+/g, ' ').split(/\s+/).filter(Boolean);
  let days = [];
  if (/\btodos\s+los\s+dias\b|\bdiariamente\b/.test(t)) days = [0, 1, 2, 3, 4, 5, 6];
  else {
    const rng = t.match(/\b([a-z]{3,9})\.?\s+(?:a|al|-|–)\s+([a-z]{3,9})\.?(?=\s|$)/);
    const i1 = rng ? dayIndex(rng[1]) : -1;
    const i2 = rng ? dayIndex(rng[2]) : -1;
    if (rng && i1 >= 0 && i2 >= 0 && i1 < i2) for (let i = i1; i <= i2; i++) days.push(i);
    else {
      days = words.map(dayIndex).filter((i) => i >= 0);
      if (!days.length || words.some((w) => dayIndex(w) < 0 && w.length > 1)) return null;
    }
  }
  if (!days.length) return null;
  return { days: [...new Set(days)], opens: hhmm(h1, m1), closes: h2 === 24 ? '23:59' : hhmm(h2, m2) };
}

/** Devuelve OpeningHoursSpecification[] o null si el texto no es 100% inequívoco. */
export function parseHours(text) {
  const t = str(text);
  if (!t || /\by\s+de\b|\btarde\b|\bmanana\b|\bturnos?\b|\bsegun\b|\bconsultar|\bferiado|\bcorrido\b|\b24\b/.test(norm(t))) return null;
  const segs = t.split(/\s*[;\n|]\s*/).filter(Boolean);
  if (!segs.length) return null;
  const specs = [];
  for (const sg of segs) {
    const p = parseSegment(sg);
    if (!p) return null;
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: p.days.map((i) => DAYS[i][2]), opens: p.opens, closes: p.closes });
  }
  const used = specs.flatMap((s) => s.dayOfWeek);
  if (new Set(used).size !== used.length) return null; // días repetidos: ambiguo
  return specs;
}

/** "$2.500" -> { amount:'2500', from:false } | null si es ambiguo. */
export function parsePrice(text) {
  const t = str(text);
  if (!t || /usd|u\$s|us\$|eur|€|dolar|d[oó]lar/i.test(t)) return null;
  const from = /^\s*desde\b/i.test(t);
  const nums = t.match(/\d[\d.,]*/g);
  if (!nums || nums.length !== 1 || !/\$/.test(t)) return null;
  let n = nums[0].replace(/[.,]+$/, '');
  if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
  else n = n.replace(/[.,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(n) || +n <= 0) return null;
  return { amount: n, from };
}
