// Utilidades del generador: escape HTML, coerción de texto, color y enlaces.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa SIEMPRE todo texto proveniente del cliente antes de ponerlo en HTML/atributos. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Convierte cualquier valor a string plano (sin escapar). */
export function str(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(', ');
  if (typeof v === 'object') return str(v.text ?? v.name ?? v.title ?? v.label ?? v.value ?? '');
  return String(v);
}

export function arr(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return [v];
}

export function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = str(obj[k]);
    if (v) return v;
  }
  return '';
}

export function paras(text) {
  return str(text).split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
}

export function slug(s) {
  return str(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

export const digits = (s) => str(s).replace(/\D+/g, '');
export const enc = (s) => encodeURIComponent(str(s));

/** Solo http(s), mailto, tel o rutas relativas; evita javascript:. */
export function safeUrl(u) {
  const s = str(u);
  if (!s) return '';
  if (/^(https?:\/\/|mailto:|tel:|\/|\.\/|#)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
  return s;
}

// ---------- color ----------
export function hex(c, fallback) {
  const s = str(c);
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (!m) return fallback;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return '#' + h.toLowerCase();
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  return toHex(x.map((v, i) => v * (1 - t) + y[i] * t));
}
export function lum(h) {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export const onColor = (bg) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111');
/** Acerca fg hacia negro/blanco hasta lograr el contraste mínimo contra bg. */
export function ensure(fg, bg, min = 4.5) {
  if (contrast(fg, bg) >= min) return fg;
  const target = lum(bg) > 0.4 ? '#000000' : '#ffffff';
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
}

/** Nombre de fuente seguro para CSS/URL. */
export function fontName(f, fallback) {
  const s = str(f).replace(/[^A-Za-z0-9 \-]/g, '').trim();
  return s || fallback;
}

/** JSON para incrustar en <script type=application/ld+json> sin romper el HTML. */
export function jsonSafe(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function instagramUrl(v) {
  const s = str(v);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  const h = s.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//i, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9._]+$/.test(h) ? `https://instagram.com/${h}` : '';
}
