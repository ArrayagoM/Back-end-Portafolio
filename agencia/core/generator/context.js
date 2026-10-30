// Contexto compartido: normaliza brief/structure en datos listos para renderizar.
import { CLASSIC_PLAN, LAYOUT_ENUMS, sanitizePlan } from '../agents/layout.js';
import { str, arr, digits, enc, hex, fontName, instagramUrl, slug } from './util.js';
import { intlDigits } from '../phone.js';
import { sanitizeSvg } from '../agents/logo.js';

const SITE_ASSET = /^assets\/[a-f0-9]{12}\.(png|jpg|webp|gif|svg)$/;
const EXT_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
const LOGO_H = 40;

function dims(w, h, fbW, fbH) {
  const a = Number(w), b = Number(h);
  return a > 0 && b > 0 ? { w: a, h: b } : { w: fbW, h: fbH };
}

/** Logo normalizado para el header, favicon, og:image y JSON-LD. null si no hay logo (se usa el monograma). */
function logoOf(l, name) {
  if (!l || typeof l !== 'object') return null;
  const alt = 'Logo de ' + name;
  if (l.kind === 'generated') {
    const svg = sanitizeSvg(l.svg);
    if (!svg) return null;
    const vb = /viewBox="\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*"/.exec(svg);
    const d = dims(vb && vb[1], vb && vb[2], 1, 1);
    const icon = typeof l.icon === 'string' ? sanitizeSvg(l.icon) : null;
    return {
      kind: 'generated', file: 'assets/logo.svg', mime: EXT_MIME.svg, svg, alt, hasText: /<text[\s>]/i.test(svg),
      width: Math.min(240, Math.max(24, Math.round(LOGO_H * d.w / d.h))), height: LOGO_H,
      icon: icon || null, iconFile: icon ? 'assets/favicon.svg' : '', iconMime: EXT_MIME.svg, raster: false
    };
  }
  if (l.kind === 'uploaded' && SITE_ASSET.test(str(l.file))) {
    const ext = str(l.file).split('.').pop();
    const d = dims(l.width, l.height, 160, LOGO_H);
    return {
      kind: 'uploaded', file: str(l.file), mime: EXT_MIME[ext], svg: '', alt, hasText: false,
      width: Math.min(240, Math.max(24, Math.round(LOGO_H * d.w / d.h))), height: LOGO_H,
      icon: null, iconFile: str(l.file), iconMime: EXT_MIME[ext], raster: ext !== 'svg'
    };
  }
  return null;
}

/** Imagenes del cliente: solo rutas assets/<id>.<ext> propias; alt siempre presente. */
function imagesOf(list, name) {
  return arr(list).filter((i) => i && typeof i === 'object' && SITE_ASSET.test(str(i.file))).slice(0, 12).map((i, n) => {
    const w = Number(i.width), h = Number(i.height);
    return { file: str(i.file), alt: str(i.alt) || `Imagen ${n + 1} de ${name}`, width: w > 0 ? w : 0, height: h > 0 ? h : 0 };
  });
}

const DEFAULT_PALETTE = {
  primary: '#2563eb', secondary: '#1e3a8a', bg: '#ffffff', surface: '#f8fafc',
  text: '#0f172a', muted: '#475569', accent: '#f59e0b'
};

export const NAV_LABELS = {
  about: 'Nosotros', services: 'Servicios', benefits: 'Beneficios', testimonials: 'Opiniones',
  gallery: 'Galería', hours: 'Horarios', faq: 'Preguntas', contact: 'Contacto'
};

export function styleKey(theme) {
  const s = str(theme?.style).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/futur|cyber|ciber/.test(s)) return 'futurista';
  if (/calid|acogedor|artesan|rustic|natural/.test(s)) return 'calido';
  if (/elegan|premium|luj|sofist|clasic/.test(s)) return 'elegante';
  if (/vibran|divert|colorid|jovial|energ|audaz|bold/.test(s)) return 'vibrante';
  return 'moderno';
}

const STYLE_DEFAULTS = {
  calido: { fontHeading: 'Fraunces', fontBody: 'Nunito', radius: 18 },
  moderno: { fontHeading: 'Plus Jakarta Sans', fontBody: 'Inter', radius: 12 },
  elegante: { fontHeading: 'Cormorant Garamond', fontBody: 'Jost', radius: 3 },
  vibrante: { fontHeading: 'Poppins', fontBody: 'DM Sans', radius: 22 },
  futurista: { fontHeading: 'Space Grotesk', fontBody: 'Inter', radius: 18 }
};

function radiusPx(r, fallback) {
  const n = parseFloat(String(r ?? ''));
  if (Number.isFinite(n) && n >= 0 && n <= 48) return Math.round(n);
  return fallback;
}

export const MOTIFS = ['aurora', 'neon-grid', 'orbit', 'blob', 'paper-cut', 'prisma'];
export const BOLD_LEVELS = ['sobrio', 'atrevido', 'extremo'];
export const MOTIONS = ['float', 'parallax', 'morph', 'spotlight'];

/** Visión de diseño saneada: solo enums conocidos y textos cortos (se usan en atributos y CSS). */
function visionOf(v) {
  if (!v || typeof v !== 'object' || !MOTIFS.includes(v.motif)) return null;
  return {
    motif: v.motif,
    motion: MOTIONS.includes(v.motion) ? v.motion : 'float',
    name: str(v.name).slice(0, 60),
    signature: str(v.signature).slice(0, 120),
    mood: arr(v.mood).map(str).filter(Boolean).slice(0, 5)
  };
}

/** Plan de layout saneado: solo enums conocidos; lo que falte cae a la composición clásica. */
function planOf(p) {
  const clean = sanitizePlan(p);
  const out = { ...CLASSIC_PLAN, ...clean, sections: { ...CLASSIC_PLAN.sections, ...(clean.sections || {}) } };
  out.order = Array.isArray(p?.order) ? p.order.filter((t) => typeof t === 'string').slice(0, 14) : [];
  return out;
}

export function makeCtx(brief = {}, structure = {}) {
  const b = brief || {};
  const st = structure || {};
  const contact = b.contact || {};
  const theme = st.theme || {};
  const style = styleKey(theme);
  const defs = STYLE_DEFAULTS[style];
  const p = theme.palette || {};
  const bgGuess = hex(p.bg, DEFAULT_PALETTE.bg);
  const palette = {
    primary: hex(p.primary, hex(b.colors?.primary, DEFAULT_PALETTE.primary)),
    secondary: hex(p.secondary, hex(b.colors?.secondary, DEFAULT_PALETTE.secondary)),
    bg: bgGuess,
    surface: hex(p.surface, DEFAULT_PALETTE.surface),
    text: hex(p.text, DEFAULT_PALETTE.text),
    muted: hex(p.muted, DEFAULT_PALETTE.muted),
    accent: hex(p.accent, DEFAULT_PALETTE.accent)
  };
  const name = str(b.businessName) || 'Mi negocio';
  const wa = intlDigits(contact.whatsapp, true);
  const tel = intlDigits(contact.phone, false);
  const email = str(contact.email);
  const address = str(contact.address);
  const sections = arr(st.sections).filter((s) => s && typeof s === 'object');
  const contactSection = sections.find((s) => s.type === 'contact');
  const contactId = slug(contactSection?.id || 'contacto');
  const waMsg = `Hola ${name}! Vi su sitio web y quiero hacer una consulta.`;
  const links = {
    wa: wa ? `https://wa.me/${wa}?text=${enc(waMsg)}` : '',
    tel: tel ? `tel:+${tel.replace(/^\+/, '')}` : (wa ? `tel:+${wa}` : ''),
    mail: email ? `mailto:${email}` : '',
    map: address ? `https://www.google.com/maps/search/?api=1&query=${enc(address)}` : '',
    ig: instagramUrl(contact.instagram)
  };
  const cta = b.cta || {};
  const ctaType = ['whatsapp', 'call', 'form', 'reserve'].includes(cta.type) ? cta.type : 'form';
  let ctaHref = `#${contactId}`;
  if (ctaType === 'whatsapp' && links.wa) ctaHref = links.wa;
  else if (ctaType === 'call' && links.tel) ctaHref = links.tel;
  else if (ctaType === 'reserve') ctaHref = links.wa || links.tel || `#${contactId}`;
  const ctaLabel = str(cta.label) || ({ whatsapp: 'Escribinos por WhatsApp', call: 'Llamanos ahora', reserve: 'Reservá tu turno', form: 'Pedí tu presupuesto' }[ctaType]);

  return {
    brief: b,
    structure: st,
    sections,
    name,
    sector: str(b.sector),
    description: str(b.description),
    contact: { phone: str(contact.phone), email, whatsapp: str(contact.whatsapp), address, hours: str(contact.hours), instagram: str(contact.instagram) },
    wa, tel, links, contactId,
    cta: { type: ctaType, label: ctaLabel, href: ctaHref, external: /^https?:/.test(ctaHref) },
    theme: {
      palette,
      style,
      fontHeading: fontName(theme.fontHeading, defs.fontHeading),
      fontBody: fontName(theme.fontBody, defs.fontBody),
      radius: radiusPx(theme.radius, defs.radius)
    },
    logo: logoOf(b.logo, name),
    images: imagesOf(b.images, name),
    vision: visionOf(st.vision),
    plan: planOf(st.layoutPlan),
    boldness: BOLD_LEVELS.includes(st.vision?.boldness) ? st.vision.boldness : BOLD_LEVELS.includes(b.boldness) ? b.boldness : 'atrevido',
    seo: st.seo || {},
    services: arr(b.services).filter((s) => s && (s.name || typeof s === 'string')).map((s) => (typeof s === 'string' ? { name: s } : s)),
    differentiators: arr(b.differentiators).map(str).filter(Boolean),
    testimonials: arr(b.testimonials).filter((t) => t && (t.text || t.name)),
    year: new Date().getFullYear()
  };
}

export function navItems(g) {
  return g.sections
    .filter((s) => !['hero', 'footer'].includes(s.type) && NAV_LABELS[s.type])
    .map((s) => ({ id: slug(s.id), label: str(s.content?.navLabel) || NAV_LABELS[s.type], type: s.type }));
}

export { slug };
