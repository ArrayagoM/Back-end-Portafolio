// Agente ARCHITECT (analista): Brief -> Structure.
// Determinista y verificable. Con llm.available solo mejora headlines/subheadlines y valida el resultado.
//
// Claves de section.content (las consume el generador):
//   hero:         { eyebrow, headline, subheadline, bullets[], cta:{label,type}, secondaryCta?:{label,target} }
//   about:        { headline, subheadline, body[], bullets[] }
//   services:     { headline, subheadline, items:[{title,description,price?}], bullets[] }
//   benefits:     { headline, subheadline, items:[{title,description:''}], bullets[] }
//   testimonials: { headline, subheadline, items:[{name,text}] }
//   gallery:      { headline, subheadline, items:[{caption,alt}] }          (sin imágenes: placeholders)
//   hours:        { headline, subheadline, text, bullets[] }
//   faq:          { headline, subheadline, items:[{q,a}] }                  (solo con datos reales del brief)
//   contact:      { headline, subheadline, phone?, email?, whatsapp?, address?, hours?, instagram?, cta, form:{fields[]} }
//   footer:       { businessName, tagline, links:[{label,target}], contact:{...}, copyright }
// requirements[].check: contains -> texto visible/HTML contiene value; section -> existe sección (id/type) value;
//   link -> existe href que contiene value; meta -> <title> o <meta description> contiene value.

import { digitsOnly, norm, SECTORS, TONES } from './interviewer.js';
import { designVision, aiVision, hashStr, voseo } from './vision.js';
import { designLayout, sanitizePlan, applyOrder } from './layout.js';

/* ---------- color ---------- */

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
function hexToRgb(h) {
  let s = String(h).replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
export function luminance(hex) {
  const f = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
/** Acerca fg a negro/blanco hasta cumplir `min` contra todos los fondos. */
export function ensureContrast(fg, bgs, min = 4.5) {
  const list = Array.isArray(bgs) ? bgs : [bgs];
  const ok = (c) => list.every((b) => contrast(c, b) >= min);
  if (ok(fg)) return fg;
  const avg = list.reduce((s, b) => s + luminance(b), 0) / list.length;
  const target = avg > 0.4 ? '#000000' : '#ffffff';
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(fg, target, t);
    if (ok(c)) return c;
  }
  return target;
}
function hueShift(hex, deg) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

/* ---------- perfiles por sector ---------- */

const PROFILES = {
  gastronomia: { label: 'Gastronomía', primary: '#b45309', secondary: '#7c2d12', accent: '#d97706', bg: '#fffaf3', dark: false, fh: 'Playfair Display', fb: 'Lato', style: 'cálido y apetitoso' },
  salud: { label: 'Salud y bienestar', primary: '#0e7490', secondary: '#0f766e', accent: '#16a34a', bg: '#f7fcfd', dark: false, fh: 'Poppins', fb: 'Open Sans', style: 'limpio y confiable' },
  belleza: { label: 'Belleza y estética', primary: '#a8326b', secondary: '#6b2145', accent: '#c08a4b', bg: '#fffafb', dark: false, fh: 'Cormorant Garamond', fb: 'Montserrat', style: 'elegante y delicado' },
  fitness: { label: 'Fitness y deporte', primary: '#ea580c', secondary: '#c2410c', accent: '#facc15', bg: '#0f1115', dark: true, fh: 'Oswald', fb: 'Inter', style: 'enérgico y moderno' },
  legal: { label: 'Estudio profesional', primary: '#1e3a5f', secondary: '#8a6d3b', accent: '#a8803c', bg: '#fbfaf7', dark: false, fh: 'Merriweather', fb: 'Source Sans 3', style: 'sobrio y corporativo' },
  construccion: { label: 'Construcción y obras', primary: '#b45309', secondary: '#374151', accent: '#f59e0b', bg: '#fafaf9', dark: false, fh: 'Roboto Slab', fb: 'Roboto', style: 'robusto y sólido' },
  tienda: { label: 'Tienda', primary: '#4f46e5', secondary: '#0e7490', accent: '#e11d48', bg: '#fcfcfd', dark: false, fh: 'Poppins', fb: 'Inter', style: 'comercial y claro' },
  educacion: { label: 'Educación y capacitación', primary: '#2563eb', secondary: '#6d28d9', accent: '#d97706', bg: '#f8faff', dark: false, fh: 'Poppins', fb: 'Nunito', style: 'amigable y claro' },
  tecnologia: { label: 'Tecnología', primary: '#5b50ef', secondary: '#0891b2', accent: '#22d3ee', bg: '#0f1115', dark: true, fh: 'Space Grotesk', fb: 'Inter', style: 'moderno y técnico' },
  servicios: { label: 'Servicios', primary: '#0f766e', secondary: '#1e3a5f', accent: '#d97706', bg: '#fafcfb', dark: false, fh: 'Montserrat', fb: 'Inter', style: 'simple y confiable' },
};

const SERIF = new Set(['Playfair Display', 'Cormorant Garamond', 'Merriweather', 'Roboto Slab']);

const TAGLINES = {
  gastronomia: ['Sabores que se disfrutan en compañía', 'Una experiencia gastronómica para recordar', 'Cocina con alma, mesa con amigos', 'Lo bueno se comparte', 'Cada plato, una buena historia'],
  salud: ['Tu salud, en buenas manos', 'Atención de excelencia para tu bienestar', 'Cuidarte es lo nuestro', 'Salud cercana, trato humano', 'Bienestar con profesionales que te escuchan'],
  belleza: ['Realzá tu belleza natural', 'Un momento de cuidado pensado para vos', 'Tu estilo, tu mejor versión', 'Sentite increíble, a tu manera', 'Belleza con personalidad'],
  fitness: ['Entrená a tu ritmo y alcanzá tus metas', 'Tu mejor versión empieza hoy', 'Movete, superate, repetí', 'Fuerza que se nota', 'Entrená con ganas, volvé con más'],
  legal: ['Asesoramiento claro, trato cercano', 'Asesoramiento profesional a tu medida', 'Tus derechos, bien defendidos', 'Soluciones legales sin vueltas', 'Tranquilidad para cada trámite'],
  construccion: ['Tu proyecto, paso a paso', 'Obras bien pensadas, de principio a fin', 'Construimos lo que imaginás', 'Calidad que se ve y se siente', 'Del plano a la llave en mano'],
  tienda: ['Encontrá lo que estás buscando', 'Productos seleccionados para vos', 'Todo lo que te gusta, en un solo lugar', 'Elegí, pedí, recibí', 'Estilo propio, precio justo'],
  educacion: ['Aprender es el primer paso', 'Formación pensada para vos', 'Aprendé a tu ritmo, llegá lejos', 'Conocimiento que se aplica', 'Tu próximo nivel empieza acá'],
  tecnologia: ['Tecnología que simplifica tu día', 'Soluciones tecnológicas a tu medida', 'Ideas que se vuelven software', 'Digitalizá lo que importa', 'Código a medida, resultados reales'],
  servicios: ['Soluciones a tu medida', 'Un servicio pensado para vos', 'Resolvemos, vos tranquilo', 'Trabajo prolijo, trato cercano', 'Lo que necesitás, cuando lo necesitás'],
};

const SERVICES_TITLE = {
  gastronomia: 'Nuestra carta', tienda: 'Nuestros productos', educacion: 'Qué podés aprender',
  salud: 'Nuestros servicios', belleza: 'Nuestros servicios', fitness: 'Nuestras actividades',
  legal: 'Áreas de trabajo', construccion: 'Nuestros trabajos', tecnologia: 'Qué hacemos', servicios: 'Nuestros servicios',
};

const ORDERS = {
  default: ['hero', 'about', 'services', 'benefits', 'gallery', 'testimonials', 'faq', 'hours', 'contact', 'footer'],
  gastronomia: ['hero', 'services', 'gallery', 'about', 'benefits', 'testimonials', 'hours', 'faq', 'contact', 'footer'],
  belleza: ['hero', 'services', 'gallery', 'about', 'benefits', 'testimonials', 'hours', 'faq', 'contact', 'footer'],
  tienda: ['hero', 'services', 'benefits', 'gallery', 'testimonials', 'about', 'faq', 'hours', 'contact', 'footer'],
  salud: ['hero', 'about', 'services', 'benefits', 'testimonials', 'faq', 'hours', 'contact', 'footer'],
  legal: ['hero', 'about', 'services', 'benefits', 'testimonials', 'faq', 'hours', 'contact', 'footer'],
  fitness: ['hero', 'services', 'benefits', 'hours', 'testimonials', 'gallery', 'about', 'faq', 'contact', 'footer'],
  construccion: ['hero', 'services', 'gallery', 'benefits', 'about', 'testimonials', 'faq', 'hours', 'contact', 'footer'],
};

const VISUAL_SECTORS = new Set(['gastronomia', 'belleza', 'construccion', 'tienda']);
const FAQ_SECTORS = new Set(['salud', 'legal', 'servicios', 'educacion', 'construccion', 'fitness', 'tecnologia']);

/* ---------- normalización defensiva del brief ---------- */

function arr(v) { return Array.isArray(v) ? v : []; }
function s(v) { return typeof v === 'string' ? v.trim() : ''; }
const HEX = /^#[0-9a-f]{6}$/i;

function safeBrief(b = {}) {
  const sector = SECTORS.includes(b.sector) ? b.sector : 'servicios';
  const contact = b.contact && typeof b.contact === 'object' ? b.contact : {};
  const c = {};
  for (const k of ['phone', 'email', 'whatsapp', 'address', 'hours', 'instagram']) if (s(contact[k])) c[k] = s(contact[k]);
  if (c.whatsapp) c.whatsapp = digitsOnly(c.whatsapp);
  if (!c.whatsapp) delete c.whatsapp;
  const cta = b.cta && typeof b.cta === 'object' ? b.cta : {};
  let type = ['whatsapp', 'call', 'form', 'reserve'].includes(cta.type) ? cta.type : (c.whatsapp ? 'whatsapp' : c.phone ? 'call' : 'form');
  if (type === 'whatsapp' && !c.whatsapp) { if (c.phone) c.whatsapp = digitsOnly(c.phone); else type = 'form'; }
  if (type === 'call' && !c.phone && !c.whatsapp) type = 'form';
  const colors = b.colors && typeof b.colors === 'object' ? b.colors : {};
  return {
    businessName: s(b.businessName) || 'Mi negocio',
    sector,
    description: s(b.description),
    audience: s(b.audience),
    goals: arr(b.goals).map(s).filter(Boolean),
    services: arr(b.services).map((x) => (typeof x === 'string' ? { name: s(x), description: '' } : { name: s(x?.name), description: s(x?.description), ...(s(String(x?.price ?? '')) ? { price: s(String(x.price)) } : {}) })).filter((x) => x.name),
    differentiators: arr(b.differentiators).map(s).filter(Boolean),
    tone: TONES.includes(b.tone) ? b.tone : 'cercano',
    colors: { ...(HEX.test(colors.primary || '') ? { primary: colors.primary.toLowerCase() } : {}), ...(HEX.test(colors.secondary || '') && HEX.test(colors.primary || '') ? { secondary: colors.secondary.toLowerCase() } : {}) },
    contact: c,
    cta: { label: s(cta.label) || defaultCtaLabel(type, sector), type },
    wantedSections: arr(b.wantedSections).map(s),
    testimonials: arr(b.testimonials).map((t) => ({ name: s(t?.name) || 'Cliente', text: s(t?.text) })).filter((t) => t.text),
    boldness: ['sobrio', 'atrevido', 'extremo'].includes(b.boldness) ? b.boldness : 'atrevido',
    language: 'es',
  };
}

function defaultCtaLabel(type, sector) {
  if (type === 'reserve') return sector === 'gastronomia' ? 'Reservá tu mesa' : 'Reservá tu turno';
  if (type === 'whatsapp') return 'Escribinos por WhatsApp';
  if (type === 'call') return 'Llamanos ahora';
  return 'Mandanos tu consulta';
}

/* ---------- tema ---------- */

// Paletas neón (sobre fondo oscuro) del estilo futurista según el motivo. Todas dan >= 4.5:1 con texto oscuro.
const FUTURE_PALETTES = {
  aurora: { primary: '#34d399', secondary: '#4f46e5', accent: '#a78bfa' },
  'neon-grid': { primary: '#22d3ee', secondary: '#7c3aed', accent: '#f472b6' },
  orbit: { primary: '#818cf8', secondary: '#0ea5e9', accent: '#fbbf24' },
  blob: { primary: '#f472b6', secondary: '#ea580c', accent: '#a3e635' },
  'paper-cut': { primary: '#fb923c', secondary: '#dc2626', accent: '#fde047' },
  prisma: { primary: '#c084fc', secondary: '#0284c7', accent: '#fb7185' },
};
const FUTURE_FONTS = {
  aurora: ['Outfit', 'Inter'], 'neon-grid': ['Space Grotesk', 'Inter'], orbit: ['Sora', 'Inter'],
  blob: ['Bricolage Grotesque', 'DM Sans'], 'paper-cut': ['Syne', 'DM Sans'], prisma: ['Manrope', 'Inter'],
};
const DARK_BG = '#0f1115';

/** Aclara un color hasta que el botón (texto oscuro) y el texto sobre fondo oscuro pasen AA con holgura. */
function neonify(c) {
  let out = c;
  for (let i = 0; i < 24 && contrast(out, DARK_BG) < 4.8; i++) out = mix(out, '#ffffff', 0.07);
  return out;
}

/** ¿Puede el color de marca vivir sobre fondo oscuro (estilo futurista)? */
export function canBeFuturist(brief) {
  const c = brief?.colors?.primary;
  return !c || contrast(c, DARK_BG) >= 4.8; // el color de marca se respeta tal cual: tiene que dar AA sobre el fondo oscuro
}

export function buildTheme(brief, vision) {
  const P = PROFILES[brief.sector] || PROFILES.servicios;
  const futurist = vision?.style === 'futurista' && canBeFuturist(brief);
  const clientPrimary = brief.colors.primary;
  const fp = futurist ? FUTURE_PALETTES[vision.motif] || FUTURE_PALETTES.aurora : null;
  // el hash del nombre rota el matiz (±36°) para que dos negocios del mismo rubro no tengan la misma paleta neón
  const shift = ((hashStr(brief.businessName) % 7) - 3) * 12;
  const primary = futurist ? (clientPrimary || neonify(hueShift(fp.primary, shift))) : (clientPrimary || P.primary);
  const secondary = brief.colors.secondary || (futurist && !clientPrimary ? hueShift(fp.secondary, shift) : (clientPrimary ? mix(primary, '#000000', 0.4) : P.secondary));
  const accent = futurist ? neonify(clientPrimary ? hueShift(primary, 150) : hueShift(fp.accent, shift)) : (clientPrimary ? hueShift(primary, 35) : P.accent);

  const LIGHT_BG = '#ffffff';
  const lightOk = contrast(primary, LIGHT_BG) >= 3;
  const darkOk = contrast(primary, DARK_BG) >= 3;
  const wantsDark = !clientPrimary && P.dark;
  const dark = futurist || (wantsDark && darkOk) || (!lightOk && darkOk);

  const bg = dark ? DARK_BG : (clientPrimary ? '#ffffff' : P.bg);
  const surface = dark ? '#171a21' : (bg === '#ffffff' ? '#f6f6f4' : '#ffffff');
  const text = ensureContrast(dark ? '#f5f5f4' : '#1c1917', [bg, surface], 7);
  const muted = ensureContrast(dark ? '#a8aebb' : '#57534e', [bg, surface], 4.5);
  const onPrimary = contrast('#ffffff', primary) >= contrast('#111111', primary) ? '#ffffff' : '#111111';
  const link = ensureContrast(primary, [bg, surface], 4.5);

  let fontHeading = P.fh;
  let fontBody = P.fb;
  let radius = '12px';
  let style = P.style;
  switch (brief.tone) {
    case 'premium':
      if (!SERIF.has(fontHeading)) fontHeading = 'Playfair Display';
      radius = '4px'; style = 'elegante y minimalista'; break;
    case 'profesional':
      radius = '8px'; style = 'corporativo y sobrio'; break;
    case 'divertido':
      fontHeading = 'Fredoka'; fontBody = 'Nunito';
      radius = '20px'; style = 'colorido y juguetón'; break;
    default:
      radius = '14px'; break;
  }
  if (futurist) {
    [fontHeading, fontBody] = FUTURE_FONTS[vision.motif] || FUTURE_FONTS.aurora;
    radius = { premium: '10px', profesional: '12px', divertido: '26px' }[brief.tone] || '18px';
    style = 'futurista y atrevido';
  }
  return {
    palette: { primary, secondary, bg, surface, text, muted, accent, onPrimary, link },
    fontHeading, fontBody, radius, style,
  };
}

/* ---------- textos ---------- */

function firstSentence(t, max = 160) {
  const clean = s(t).replace(/\s+/g, ' ');
  if (!clean) return '';
  const m = clean.match(/^(.+?[.!?])(\s|$)/);
  let out = m ? m[1] : clean;
  if (out.length > max) out = out.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return out;
}
function cut(t, max) {
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

function tagline(brief) {
  const list = TAGLINES[brief.sector] || TAGLINES.servicios;
  // el hash del nombre elige entre las variantes (dos negocios del mismo rubro no repiten el titular)
  let t = list[hashStr(brief.businessName) % list.length];
  if (brief.tone === 'divertido') t += '!';
  return t;
}

function planSections(brief) {
  const has = (t) => brief.wantedSections.includes(t);
  const inc = new Set(['hero', 'contact', 'footer']);
  if (brief.description || brief.audience || has('about')) inc.add('about');
  if (brief.services.length) inc.add('services');
  if (brief.differentiators.length) inc.add('benefits');
  if (brief.testimonials.length) inc.add('testimonials');
  if (has('gallery') || VISUAL_SECTORS.has(brief.sector)) inc.add('gallery');
  if (brief.contact.hours) inc.add('hours');
  const faqItems = buildFaq(brief);
  if (faqItems.length >= 2 && (has('faq') || FAQ_SECTORS.has(brief.sector))) inc.add('faq');
  if (has('benefits') && !inc.has('benefits') && brief.description) inc.add('benefits');

  const order = [...(ORDERS[brief.sector] || ORDERS.default)];
  if (brief.cta.type === 'reserve' || brief.cta.type === 'call') {
    const i = order.indexOf('hours');
    if (i >= 0) { order.splice(i, 1); order.splice(order.indexOf('contact'), 0, 'hours'); }
  }
  return order.filter((t) => inc.has(t));
}

function buildFaq(brief) {
  const items = [];
  const c = brief.contact;
  if (brief.services.length) items.push({ q: '¿Qué ofrecen?', a: brief.services.map((x) => x.name).join(', ') + '.' });
  if (c.address) items.push({ q: '¿Dónde están ubicados?', a: c.address });
  if (c.hours) items.push({ q: '¿Cuáles son los horarios de atención?', a: c.hours });
  const how = { whatsapp: 'Podés escribirnos por WhatsApp y te respondemos a la brevedad.', call: 'Podés llamarnos por teléfono.', reserve: 'Podés reservar contactándonos por los medios de esta página.', form: 'Podés enviarnos tu consulta desde el formulario de contacto.' }[brief.cta.type];
  items.push({ q: '¿Cómo puedo contactarlos?', a: how });
  return items;
}

function contentFor(type, brief, sections) {
  const name = brief.businessName;
  const c = brief.contact;
  const cta = { label: brief.cta.label, type: brief.cta.type };
  switch (type) {
    case 'hero': {
      const sub = firstSentence(brief.description) || '';
      return {
        eyebrow: name,
        headline: tagline(brief),
        subheadline: sub,
        bullets: brief.differentiators.slice(0, 3),
        cta,
        ...(sections.includes('services') ? { secondaryCta: { label: brief.sector === 'gastronomia' ? 'Ver la carta' : 'Ver servicios', target: 'services' } } : {}),
      };
    }
    case 'about':
      return {
        headline: `Conocé ${name}`,
        subheadline: firstSentence(brief.description, 140),
        body: [brief.description].filter(Boolean),
        bullets: brief.audience ? [`Para quién: ${brief.audience}`] : [],
      };
    case 'services':
      return {
        headline: SERVICES_TITLE[brief.sector] || 'Nuestros servicios',
        subheadline: brief.sector === 'tienda' ? 'Mirá lo que tenemos para vos.' : 'Esto es lo que podemos hacer por vos.',
        items: brief.services.map((x) => ({ title: x.name, description: x.description || '', ...(x.price ? { price: x.price } : {}) })),
        bullets: brief.services.map((x) => x.name),
      };
    case 'benefits':
      return {
        headline: '¿Por qué elegirnos?',
        subheadline: `Lo que hace especial a ${name}.`,
        items: (brief.differentiators.length ? brief.differentiators : [brief.description]).slice(0, 6).map((d) => ({ title: cap(d), description: '' })),
        bullets: brief.differentiators.slice(0, 6),
      };
    case 'testimonials':
      return { headline: 'Lo que dicen nuestros clientes', subheadline: '', items: brief.testimonials.map((t) => ({ name: t.name, text: t.text })) };
    case 'gallery':
      return {
        headline: brief.sector === 'construccion' ? 'Nuestros trabajos' : 'Galería',
        subheadline: 'Un vistazo a lo que hacemos.',
        items: (brief.services.length ? brief.services.slice(0, 6).map((x) => x.name) : [name]).map((n) => ({ caption: n, alt: `${n} - ${name}` })),
      };
    case 'hours':
      return {
        headline: 'Horarios de atención',
        subheadline: 'Te esperamos en estos horarios.',
        text: c.hours || '',
        bullets: (c.hours || '').split(/\s*[;\n]\s*/).filter(Boolean),
      };
    case 'faq':
      return { headline: 'Preguntas frecuentes', subheadline: '', items: buildFaq(brief) };
    case 'contact':
      return {
        headline: brief.cta.type === 'reserve' ? 'Reservá ahora' : 'Contactanos',
        subheadline: brief.cta.type === 'whatsapp' ? 'Escribinos y te respondemos a la brevedad.' : 'Estamos para ayudarte.',
        ...c,
        cta,
        form: { fields: ['nombre', 'contacto', 'mensaje'], mode: c.whatsapp ? 'whatsapp' : c.email ? 'mailto' : 'mailto' },
      };
    case 'footer':
      return {
        businessName: name,
        tagline: tagline(brief),
        links: sections.filter((t) => !['hero', 'footer'].includes(t)).map((t) => ({ label: SECTION_LABELS[t], target: t })),
        contact: c,
        copyright: `© ${new Date().getFullYear()} ${name}. Todos los derechos reservados.`,
      };
    default:
      return {};
  }
}

const SECTION_LABELS = { about: 'Nosotros', services: 'Servicios', benefits: 'Por qué elegirnos', testimonials: 'Opiniones', gallery: 'Galería', hours: 'Horarios', faq: 'Preguntas', contact: 'Contacto' };

const PURPOSES = {
  hero: 'Captar la atención y empujar la acción principal',
  about: 'Explicar quiénes son y a quién ayudan',
  services: 'Mostrar lo que ofrecen de forma clara',
  benefits: 'Comunicar los diferenciales frente a la competencia',
  testimonials: 'Generar confianza con opiniones reales',
  gallery: 'Mostrar el trabajo de forma visual',
  hours: 'Informar cuándo pueden contactarlos o visitarlos',
  faq: 'Resolver dudas frecuentes',
  contact: 'Facilitar el contacto y la acción principal',
  footer: 'Cierre con datos de contacto y navegación',
};

/* ---------- SEO ---------- */

export function buildSeo(brief) {
  const P = PROFILES[brief.sector] || PROFILES.servicios;
  let title = `${brief.businessName} | ${P.label}`;
  if (title.length > 60) title = cut(brief.businessName, 60);
  const base = firstSentence(brief.description, 110) || `${brief.businessName}: ${P.label.toLowerCase()}.`;
  let description = cut(`${base} ${brief.cta.label}.`.replace(/\.\.$/, '.'), 155);
  const kw = [brief.businessName, P.label.toLowerCase(), ...brief.services.map((x) => x.name)];
  const seen = new Set();
  const keywords = kw.filter((k) => { const n = norm(k); if (seen.has(n) || !k) return false; seen.add(n); return true; }).slice(0, 10);
  return { title, description, keywords };
}

/* ---------- requisitos verificables ---------- */

export function buildRequirements(brief, sections, theme, seo) {
  const reqs = [];
  const seen = new Set();
  const add = (text, kind, value) => {
    const key = kind + '::' + value;
    if (!value || seen.has(key)) return;
    seen.add(key);
    reqs.push({ id: `R${reqs.length + 1}`, text, check: { kind, value } });
  };
  const c = brief.contact;
  add('El nombre del negocio debe estar visible', 'contains', brief.businessName);
  add('El título SEO debe ser el definido', 'meta', seo.title);
  add('La meta descripción debe ser la definida', 'meta', seo.description);
  for (const t of sections) add(`Debe existir la sección ${t}`, 'section', t);
  for (const sv of brief.services) {
    add(`El servicio "${sv.name}" debe aparecer`, 'contains', sv.name);
    if (sv.price) add(`El precio de "${sv.name}" (${sv.price}) debe aparecer`, 'contains', sv.price);
  }
  add(`El botón de acción principal debe decir "${brief.cta.label}"`, 'contains', brief.cta.label);
  const wa = c.whatsapp ? `wa.me/${c.whatsapp}` : '';
  switch (brief.cta.type) {
    case 'whatsapp': add('El CTA debe enlazar a WhatsApp', 'link', wa); break;
    case 'call': add('El CTA debe permitir llamar por teléfono', 'link', 'tel:'); break;
    case 'reserve':
      if (wa) add('La reserva debe poder hacerse por WhatsApp', 'link', wa);
      else if (c.phone) add('La reserva debe poder hacerse por teléfono', 'link', 'tel:');
      else if (c.email) add('La reserva debe poder hacerse por email', 'link', `mailto:${c.email}`);
      break;
    default:
      if (c.email) add('La consulta debe poder enviarse por email', 'link', `mailto:${c.email}`);
  }
  if (c.phone) add('El teléfono debe estar enlazado (tel:)', 'link', 'tel:');
  if (wa) add('El WhatsApp debe estar enlazado', 'link', wa);
  if (c.email) add('El email debe estar enlazado', 'link', `mailto:${c.email}`);
  if (c.instagram) add('El Instagram debe estar visible', 'contains', c.instagram.replace(/^@/, ''));
  if (c.address) add('La dirección debe estar visible', 'contains', c.address);
  if (c.hours) add('Los horarios deben estar visibles', 'contains', c.hours);
  for (const t of brief.testimonials) add('El testimonio del cliente debe aparecer', 'contains', t.text);
  if (brief.colors.primary) add(`Debe usarse el color de marca ${brief.colors.primary}`, 'contains', theme.palette.primary);
  if (brief.colors.secondary) add(`Debe usarse el color secundario ${brief.colors.secondary}`, 'contains', theme.palette.secondary);
  return reqs;
}

/* ---------- mejora de copy con LLM (validada) ---------- */

const COPY_SYSTEM = `Sos redactor publicitario argentino (voseo rioplatense). Reescribís títulos de una landing page.
Devolvé SOLO JSON: {"<tipoSeccion>":{"headline":string,"subheadline":string}, ...} para las secciones recibidas.
Reglas: headline máx. 70 caracteres, subheadline máx. 180. NO inventes datos: ni precios, ni números, ni direcciones, ni testimonios,
ni años de experiencia, ni premios. Usá solo lo que está en el brief. Tono según el brief.`;

function validCopy(v, allowedNums) {
  if (!v || typeof v !== 'object') return null;
  const out = {};
  for (const k of ['headline', 'subheadline']) {
    if (v[k] == null) continue;
    if (typeof v[k] !== 'string') return null;
    const t = v[k].trim();
    if (k === 'headline' && (!t || t.length > 80)) return null;
    if (k === 'subheadline' && t.length > 200) return null;
    if (/https?:\/\/|<|>|\$/.test(t)) return null;
    const nums = t.match(/\d+/g) || [];
    if (nums.some((n) => !allowedNums.has(n))) return null;
    out[k] = voseo(t);
  }
  return out.headline ? out : null;
}

async function improveCopy(structure, brief, llm) {
  if (!llm || !llm.available || typeof llm.completeJSON !== 'function') return;
  try {
    const targets = structure.sections.filter((x) => ['hero', 'about', 'services', 'benefits', 'gallery', 'contact'].includes(x.type));
    const prompt = `Brief:\n${JSON.stringify(brief)}\n\nSecciones a redactar: ${targets.map((x) => x.type).join(', ')}\nActuales:\n${JSON.stringify(Object.fromEntries(targets.map((x) => [x.type, { headline: x.content.headline, subheadline: x.content.subheadline }])))}`;
    const res = await llm.completeJSON({ system: COPY_SYSTEM, prompt });
    if (!res || typeof res !== 'object') return;
    const allowedNums = new Set(JSON.stringify(brief).match(/\d+/g) || []);
    for (const sec of targets) {
      const v = validCopy(res[sec.type], allowedNums);
      if (!v) continue;
      sec.content.headline = v.headline;
      if (v.subheadline && (sec.content.subheadline || sec.type === 'hero')) sec.content.subheadline = v.subheadline;
    }
  } catch { /* se mantiene el copy determinista */ }
}

/* ---------- API ---------- */

/** Clave de estilo del generador según el texto libre de theme.style (espejo de generator/context.js). */
function styleKeyOf(style) {
  const s = norm(style);
  if (/futur/.test(s)) return 'futurista';
  if (/calid|acogedor|artesan|rustic|natural/.test(s)) return 'calido';
  if (/elegan|premium|luj|sofist|clasic/.test(s)) return 'elegante';
  if (/vibran|divert|colorid|jovial|energ|audaz|bold/.test(s)) return 'vibrante';
  return 'moderno';
}

/** Concepto creativo: con IA si responde algo válido; si no, el determinista. Nunca silencia: deja source y note. */
async function chooseVision(brief, llm) {
  const base = designVision(brief);
  const ai = await aiVision(brief, llm);
  if (ai.vision) {
    // lo que la IA no define (estilo) lo completa el determinista; "futurista" solo se acepta si la IA lo propone
    const style = ai.vision.style || base.style;
    return { vision: { ...ai.vision, style }, source: 'ai', layoutHint: sanitizePlan(ai.rawLayout) };
  }
  return { vision: base, source: 'fallback', ...(ai.note ? { note: ai.note } : {}) };
}

export async function designStructure(rawBrief, llm) {
  const brief = safeBrief(rawBrief);
  const types = planSections(brief);
  const sections = types.map((type, i) => ({
    id: type,
    type,
    purpose: PURPOSES[type],
    priority: i + 1,
    content: contentFor(type, brief, types),
  }));
  const seo = buildSeo(brief);
  // la visión se pide en paralelo con la mejora de copy (dos llamadas independientes a la IA)
  const [chosen] = await Promise.all([chooseVision(brief, llm), improveCopyLater(sections, brief, llm)]);
  const vision = chosen.vision;
  const theme = buildTheme(brief, vision);
  vision.style = styleKeyOf(theme.style);
  const layoutPlan = designLayout(brief, vision, types, chosen.layoutHint || {});
  const ordered = applyOrder(sections, layoutPlan.order);
  const structure = { sections: ordered, theme, seo, vision, layoutPlan, visionSource: chosen.source, ...(chosen.note ? { visionNote: chosen.note } : {}), requirements: [] };
  structure.requirements = buildRequirements(brief, types, theme, seo);
  return structure;
}

function improveCopyLater(sections, brief, llm) {
  return improveCopy({ sections }, brief, llm);
}
