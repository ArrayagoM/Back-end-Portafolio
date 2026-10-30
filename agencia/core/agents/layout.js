// Arquetipos de layout: elige el "plan de composición" de cada sitio (structure.layoutPlan).
//   layoutPlan = { hero, nav, sections:{about,services,benefits,testimonials,hours,faq,contact}, order:[...],
//                  shapes, dividers, grid, scale, invert, marquee, stats }
// Todo son enums: ni la IA ni nadie puede inyectar HTML/CSS crudo. La selección es determinista:
// rubro + tono + audacia + visión (motivo) y un hash estable del nombre del negocio desempatan, de modo que
// dos negocios del mismo rubro difieren en la composición (hero, navegación, variantes de sección, formas, divisores…).

import { hashStr } from './vision.js';

export const LAYOUT_ENUMS = {
  hero: ['split', 'typo', 'stage', 'editorial', 'bento', 'poster', 'terminal', 'story'],
  nav: ['bar', 'pill', 'rail', 'overlay'],
  services: ['bento', 'list', 'stack', 'hscroll', 'accordion'],
  benefits: ['grid', 'radial', 'columns', 'strip'],
  testimonials: ['quote', 'masonry', 'ribbon'],
  hours: ['ticket', 'clock', 'table'],
  faq: ['accordion', 'columns', 'chat'],
  contact: ['split', 'band', 'floating'],
  about: ['split', 'statement'],
  shapes: ['round', 'notch', 'blob', 'brutal'],
  dividers: ['waves', 'diagonal', 'teeth', 'none'],
  grid: ['even', 'left', 'right', 'golden'],
  scale: ['tight', 'big', 'huge'],
  invert: ['benefits', 'testimonials', 'faq', 'contact', 'none'],
};
export const SECTION_VARIANT_KEYS = ['about', 'services', 'benefits', 'testimonials', 'hours', 'faq', 'contact'];

// Variante "clásica" de cada sección (lo que había antes de los arquetipos). Se usa en estructuras sin layoutPlan.
export const CLASSIC_PLAN = {
  hero: 'split', nav: 'bar',
  sections: { about: 'split', services: 'bento', benefits: 'grid', testimonials: 'classic', hours: 'classic', faq: 'accordion', contact: 'split' },
  shapes: 'round', dividers: 'none', grid: 'even', scale: 'tight', invert: 'none', marquee: false, stats: false,
};

/* ---------- afinidades por rubro ---------- */

// Cada rubro tiene 2 heroes propios y casi no los comparte con otros rubros: así dos negocios de rubros distintos
// NO se parecen a simple vista (peso fuerte a los propios, residual mínimo al resto: ver HERO_HOME_W / HERO_AWAY_W).
const HERO_BY_SECTOR = {
  gastronomia: ['editorial', 'stage'],
  salud: ['split', 'bento'],
  belleza: ['poster', 'stage'],
  fitness: ['story', 'poster'],
  legal: ['typo', 'split'],
  construccion: ['poster', 'typo'],
  tienda: ['bento', 'story'],
  educacion: ['stage', 'bento'],
  tecnologia: ['terminal', 'typo'],
  servicios: ['split', 'story'],
};
const NAV_BY_SECTOR = {
  gastronomia: ['pill', 'overlay'], salud: ['bar', 'pill'], belleza: ['overlay', 'pill'], fitness: ['rail', 'overlay'],
  legal: ['bar', 'rail'], construccion: ['rail', 'bar'], tienda: ['pill', 'overlay'], educacion: ['pill', 'bar'],
  tecnologia: ['rail', 'overlay'], servicios: ['bar', 'pill'],
};
const HERO_HOME_W = 8, HERO_AWAY_W = 0.2, NAV_HOME_W = 8, NAV_AWAY_W = 0.3;
const SHAPES_BY_TONE = { cercano: ['blob', 'round'], profesional: ['round', 'notch'], premium: ['notch', 'round'], divertido: ['blob', 'brutal'] };
const DIVIDERS_BY_MOTIF = {
  aurora: ['waves', 'none'], 'neon-grid': ['diagonal', 'none'], orbit: ['none', 'waves'], blob: ['waves', 'diagonal'],
  'paper-cut': ['teeth', 'diagonal'], prisma: ['diagonal', 'teeth'],
};
// Órdenes alternativos de las secciones intermedias (el hero va primero, contacto y footer al final).
const ORDER_TEMPLATES = [
  null, // el del rubro (lo pasa el architect)
  ['about', 'services', 'gallery', 'benefits', 'testimonials', 'faq', 'hours'],
  ['services', 'benefits', 'about', 'gallery', 'testimonials', 'hours', 'faq'],
  ['benefits', 'services', 'testimonials', 'about', 'gallery', 'faq', 'hours'],
  ['services', 'testimonials', 'benefits', 'faq', 'about', 'gallery', 'hours'],
  ['gallery', 'services', 'about', 'benefits', 'hours', 'testimonials', 'faq'],
];

const CALM_HEROES = new Set(['split', 'editorial', 'stage', 'typo']);
const WILD_HEROES = new Set(['poster', 'story', 'typo', 'bento', 'terminal']);

const ch = (seed, c) => {
  // FNV + mezcla final (avalancha) para que los canales sean independientes entre sí
  let h = hashStr(`${seed}#${c}`);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
};

/** Elige un elemento con pesos: los preferidos pesan `bias`, el resto 1 (0 = excluido). Desempata con hash del seed. */
function pickWeighted(options, prefer = [], seed, channel, { bias = 3, weights = {} } = {}) {
  const w = options.map((o) => (weights[o] !== undefined ? weights[o] : prefer.includes(o) ? bias : 1));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return options[0];
  let r = ch(seed, channel) % Math.round(total * 1000);
  r /= 1000;
  for (let i = 0; i < options.length; i++) { if (r < w[i]) return options[i]; r -= w[i]; }
  return options[options.length - 1];
}

/* ---------- validación de propuestas (IA) ---------- */

/** Devuelve solo los campos válidos de un plan parcial: nunca texto libre. */
export function sanitizePlan(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const E = LAYOUT_ENUMS;
  for (const k of ['hero', 'nav', 'shapes', 'dividers', 'grid', 'scale', 'invert']) if (E[k].includes(raw[k])) out[k] = raw[k];
  const src = raw.sections && typeof raw.sections === 'object' ? raw.sections : raw;
  const sections = {};
  for (const k of SECTION_VARIANT_KEYS) if (E[k].includes(src[k])) sections[k] = src[k];
  if (Object.keys(sections).length) out.sections = sections;
  for (const k of ['marquee', 'stats']) if (typeof raw[k] === 'boolean') out[k] = raw[k];
  return out;
}

/* ---------- plan determinista ---------- */

/**
 * @param brief  brief normalizado (sector, tone, boldness, services, testimonials, contact…)
 * @param vision structure.vision (motif, motion, boldness…)
 * @param types  tipos de sección incluidos (en el orden por defecto del rubro)
 * @param hint   propuesta (ya saneada) de la IA; pisa lo que sea válido y compatible
 */
export function designLayout(brief, vision = {}, types = [], hint = {}) {
  const sector = HERO_BY_SECTOR[brief.sector] ? brief.sector : 'servicios';
  const tone = SHAPES_BY_TONE[brief.tone] ? brief.tone : 'cercano';
  const bold = vision.boldness || brief.boldness || 'atrevido';
  const motif = vision.motif || 'aurora';
  const seed = `${String(brief.businessName || '').toLowerCase().trim()}|${sector}`;
  const has = (t) => types.includes(t);
  const E = LAYOUT_ENUMS;
  const nServices = (brief.services || []).length;
  const nBenefits = (brief.differentiators || []).length;
  const nQuotes = (brief.testimonials || []).length;

  // hero
  const heroW = {};
  for (const h of E.hero) heroW[h] = HERO_BY_SECTOR[sector].includes(h) ? HERO_HOME_W : HERO_AWAY_W;
  heroW.terminal = sector === 'tecnologia' ? HERO_HOME_W : 0.05; // el "terminal" es solo de tecnología
  if (bold === 'sobrio') for (const h of E.hero) if (!CALM_HEROES.has(h)) heroW[h] = 0;
  if (bold === 'extremo') for (const h of WILD_HEROES) if (h !== 'terminal' || sector === 'tecnologia') heroW[h] = Math.max(heroW[h], 1);
  const hero = pickWeighted(E.hero, [], seed, 'hero', { weights: heroW });
  // navegación
  const navW = {};
  for (const n of E.nav) navW[n] = NAV_BY_SECTOR[sector].includes(n) ? NAV_HOME_W : NAV_AWAY_W;
  if (bold === 'sobrio') { navW.rail = 0; navW.overlay = 0; }
  const nav = pickWeighted(E.nav, [], seed, 'nav', { weights: navW });

  const sections = {};
  const svcW = {};
  if (nServices < 3) { svcW.stack = 0; svcW.hscroll = 0; }
  if (bold === 'sobrio') { svcW.stack = 0; svcW.hscroll = 0; }
  if (nServices < 2) svcW.bento = 0.5;
  sections.services = pickWeighted(E.services, [], seed, 'services', { weights: svcW });
  sections.benefits = nBenefits >= 3 && nBenefits <= 6
    ? pickWeighted(E.benefits, [], seed, 'benefits', { weights: { grid: 1 } })
    : pickWeighted(['grid', 'columns', 'strip'], [], seed, 'benefits');
  sections.testimonials = nQuotes >= 2 ? pickWeighted(E.testimonials, [], seed, 'testimonials') : 'quote';
  sections.hours = pickWeighted(E.hours, [], seed, 'hours');
  sections.faq = pickWeighted(E.faq, [], seed, 'faq');
  sections.contact = pickWeighted(E.contact, [], seed, 'contact');
  sections.about = pickWeighted(E.about, [], seed, 'about', { weights: { statement: 0.8 } });

  const shapes = pickWeighted(E.shapes, SHAPES_BY_TONE[tone], seed, 'shapes', { bias: 1.4 });
  const dividers = bold === 'sobrio' ? pickWeighted(['none', 'diagonal'], [], seed, 'dividers', { weights: { none: 3 } })
    : pickWeighted(E.dividers, DIVIDERS_BY_MOTIF[motif] || [], seed, 'dividers', { bias: 1.4 });
  const grid = pickWeighted(E.grid, [], seed, 'grid');
  const scale = bold === 'sobrio' ? 'tight' : pickWeighted(E.scale, bold === 'extremo' ? ['huge'] : ['big'], seed, 'scale');
  const invertOptions = E.invert.filter((s) => s === 'none' || has(s));
  const invert = bold === 'sobrio' ? 'none' : pickWeighted(invertOptions, [], seed, 'invert', { weights: { none: 2 } });

  const plan = {
    hero, nav, sections, shapes, dividers, grid, scale, invert,
    marquee: bold !== 'sobrio' && (hero === 'typo' || ch(seed, 'marquee') % 100 < 55),
    stats: bold !== 'sobrio' && hero !== 'typo' && hero !== 'bento' && nServices >= 2 && ch(seed, 'stats') % 100 < 45,
  };

  // propuesta de la IA: pisa solo lo válido y compatible con los datos reales
  const h = sanitizePlan(hint);
  for (const k of ['hero', 'nav', 'shapes', 'dividers', 'grid', 'scale', 'invert']) if (h[k]) plan[k] = h[k];
  if (bold === 'sobrio' && !CALM_HEROES.has(plan.hero)) plan.hero = hero;
  for (const [k, v] of Object.entries(h.sections || {})) plan.sections[k] = v;
  for (const k of ['marquee', 'stats']) if (typeof h[k] === 'boolean') plan[k] = h[k];

  // compatibilidades con los datos reales
  if (nServices < 3 && ['stack', 'hscroll'].includes(plan.sections.services)) plan.sections.services = 'list';
  if (nBenefits < 3 && plan.sections.benefits === 'radial') plan.sections.benefits = 'columns';
  if (nQuotes < 2 && plan.sections.testimonials !== 'quote') plan.sections.testimonials = 'quote';
  if (plan.invert !== 'none' && !has(plan.invert)) plan.invert = 'none';
  if (plan.hero === 'typo') { plan.marquee = bold !== 'sobrio'; plan.stats = false; }
  if (bold === 'sobrio') { plan.marquee = false; plan.stats = false; }
  if (plan.hero === 'bento') plan.stats = false;

  plan.order = designOrder(brief, types, ch(seed, 'order'));
  return plan;
}

/** Orden de secciones: hero primero; footer último; contacto antes del footer; reglas del rubro. */
export function designOrder(brief, types, h) {
  const middle = types.filter((t) => !['hero', 'contact', 'footer'].includes(t));
  const tpl = ORDER_TEMPLATES[h % ORDER_TEMPLATES.length];
  let mid = middle;
  if (tpl) {
    const ordered = tpl.filter((t) => middle.includes(t));
    mid = [...ordered, ...middle.filter((t) => !ordered.includes(t))];
  }
  // un estudio/consultorio presenta quiénes son antes que lo que hace
  if (['legal', 'salud'].includes(brief.sector) && mid.includes('about') && mid.includes('services') && mid.indexOf('about') > mid.indexOf('services')) {
    mid = mid.filter((t) => t !== 'about');
    mid.splice(mid.indexOf('services'), 0, 'about');
  }
  // reservas/llamadas: el horario justo antes del contacto
  if ((brief.cta?.type === 'reserve' || brief.cta?.type === 'call') && mid.includes('hours')) {
    mid = mid.filter((t) => t !== 'hours');
    mid.push('hours');
  }
  return ['hero', ...mid, ...(types.includes('contact') ? ['contact'] : []), 'footer'];
}

/** Reordena las secciones del structure según el plan y renumera prioridades. Devuelve el nuevo arreglo. */
export function applyOrder(sections, order) {
  const idx = (t) => { const i = order.indexOf(t); return i < 0 ? 999 : i; };
  const sorted = sections.slice().sort((a, b) => idx(a.type) - idx(b.type));
  sorted.forEach((s, i) => { s.priority = i + 1; });
  const links = sorted.filter((s) => !['hero', 'footer'].includes(s.type));
  const footer = sorted.find((s) => s.type === 'footer');
  if (footer && Array.isArray(footer.content?.links)) {
    const labelOf = new Map(footer.content.links.map((l) => [l.target, l.label]));
    footer.content.links = links.map((s) => ({ label: labelOf.get(s.type) || s.type, target: s.type }));
  }
  return sorted;
}

/** Huella de ejes (para tests y para el informe): los 6 ejes principales de un plan. */
export function axes(plan) {
  return {
    hero: plan.hero, nav: plan.nav, services: plan.sections.services,
    second: `${plan.sections.benefits}/${plan.sections.testimonials}/${plan.sections.contact}`,
    third: `${plan.sections.faq}/${plan.sections.hours}`,
    forms: `${plan.shapes}/${plan.dividers}`,
  };
}
