// Símbolos de logo dibujados por código (SVG geométrico, sin fuentes ni recursos externos).
// renderLogo({ style, mark, name, monogram, palette, fonts, container?, backdrop?, uid? }) -> string SVG autocontenido.
//   style ∈ LOGO_STYLES: monograma | emblema | isotipo | tipografico
//   mark  ∈ MARKS (25 símbolos). Todos se dibujan en una caja de 100x100 y se escalan/colocan según el estilo.
// El SVG nunca incluye <script>, on*=, <image>, <use>, url(http…), @import ni fuentes externas: el texto usa
// font-family con fallback genérico (serif / sans-serif) y textLength para no desbordar si la fuente cambia.
import { esc, hex, mix, contrast } from './util.js';

export const MARKS = [
  'espiga', 'cubiertos', 'balanza', 'columna', 'mancuerna', 'rayo', 'cruz', 'corazon', 'tijera', 'flor',
  'casa', 'martillo', 'bolsa', 'etiqueta', 'libro', 'birrete', 'chip', 'orbita', 'llave', 'engranaje',
  'hoja', 'estrella', 'prisma', 'onda', 'horizonte',
];
export const LOGO_STYLES = ['monograma', 'emblema', 'isotipo', 'tipografico'];
export const CONTAINERS = ['circle', 'squircle', 'arch', 'hex', 'shield'];

/** Tipografías serif entre las admitidas (decide el fallback genérico del wordmark). */
export const SERIF_FONTS = new Set([
  'Playfair Display', 'Cormorant Garamond', 'Merriweather', 'Roboto Slab', 'Lora', 'Libre Baskerville',
  'DM Serif Display', 'Fraunces', 'Crimson Pro', 'Cinzel', 'Spectral',
]);
const SERIF_STACK = "Georgia, 'Times New Roman', serif";
const SANS_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

const n = (v) => String(Math.round(v * 100) / 100);
const rad = (d) => (d * Math.PI) / 180;

/** Polígono "pincel" cónico entre dos puntos (para hojas de tijera, etc.). */
function taper(x1, y1, x2, y2, w1, w2) {
  const dx = x2 - x1, dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const px = -dy / L, py = dx / L;
  const p = [
    [x1 + px * w1, y1 + py * w1], [x2 + px * w2, y2 + py * w2],
    [x2 - px * w2, y2 - py * w2], [x1 - px * w1, y1 - py * w1],
  ];
  return 'M' + p.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z';
}

/* ---------- símbolos (caja 100x100). k = { g: relleno degradé, s: sólido, d: tono oscuro, h: acento, p: "papel" } ---------- */

const DRAW = {
  espiga: (k) => {
    const grain = (x, y, r, fill) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 0C-9-5-10-17 0-29C10-17 9-5 0 0Z" fill="${fill}" stroke="${k.p}" stroke-width="1.8" stroke-linejoin="round"/>`;
    let out = `<path d="M50 97C49 82 51 66 50 40" fill="none" stroke="${k.d}" stroke-width="4.5" stroke-linecap="round"/>`;
    [[84, 52], [68, 48], [52, 44]].forEach(([y, a], i) => {
      out += grain(50, y, -a, i % 2 ? k.d : k.g) + grain(50, y, a, i % 2 ? k.g : k.d);
    });
    out += grain(50, 40, 0, k.h);
    return out;
  },

  cubiertos: (k) => `<path d="M20 9V30c0 8 6 12 13 12s13-4 13-12V9M33 9v33" fill="none" stroke="${k.g}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M33 42v50" stroke="${k.g}" stroke-width="7" stroke-linecap="round"/>`
    + `<ellipse cx="69" cy="27" rx="12.5" ry="19" fill="${k.g}"/>`
    + `<path d="M69 45v47" stroke="${k.g}" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M62 24c1-6 4-9 7-10" fill="none" stroke="${k.p}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,

  balanza: (k) => `<path d="M50 22v60M30 90h40" stroke="${k.d}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M14 33Q50 19 86 33" fill="none" stroke="${k.g}" stroke-width="5.5" stroke-linecap="round"/>`
    + `<circle cx="50" cy="16" r="6.5" fill="${k.h}"/>`
    + `<path d="M14 33L3 62M14 33L25 62M86 33L75 62M86 33L97 62" stroke="${k.d}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<path d="M1 62h26c0 9-6 14-13 14S1 71 1 62ZM73 62h26c0 9-6 14-13 14S73 71 73 62Z" fill="${k.g}"/>`,

  columna: (k) => {
    let out = `<path d="M50 8L93 30H7Z" fill="${k.g}" stroke="${k.g}" stroke-width="3" stroke-linejoin="round"/>`
      + `<circle cx="50" cy="22" r="4.5" fill="${k.p}"/>`
      + `<rect x="11" y="34" width="78" height="7" rx="2.5" fill="${k.d}"/>`;
    for (let i = 0; i < 4; i++) out += `<rect x="${n(23 + i * 18 - 5)}" y="45" width="10" height="36" rx="2.5" fill="${k.g}"/>`;
    out += `<rect x="10" y="83" width="80" height="6" rx="2.5" fill="${k.d}"/><rect x="4" y="91" width="92" height="5" rx="2.5" fill="${k.g}"/>`;
    return out;
  },

  mancuerna: (k) => `<g transform="rotate(-38 50 50)"><rect x="14" y="46" width="72" height="8" rx="4" fill="${k.d}"/>`
    + `<rect x="24" y="26" width="12" height="48" rx="4.5" fill="${k.g}"/><rect x="64" y="26" width="12" height="48" rx="4.5" fill="${k.g}"/>`
    + `<rect x="10" y="34" width="9" height="32" rx="3.5" fill="${k.h}"/><rect x="81" y="34" width="9" height="32" rx="3.5" fill="${k.h}"/>`
    + `<rect x="40" y="43.5" width="20" height="13" rx="3" fill="${k.g}"/></g>`,

  rayo: (k) => `<path d="M58 6L21 54H46L38 94L79 42H54Z" fill="${k.g}" stroke="${k.g}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M58 6L21 54H46Z" fill="${k.p}" opacity=".18"/>`
    + `<path d="M84 18l8-7M90 36l9-2M12 70l-8 4" stroke="${k.h}" stroke-width="4.5" stroke-linecap="round"/>`,

  cruz: (k) => `<rect x="35" y="7" width="30" height="86" rx="11" fill="${k.g}"/><rect x="7" y="35" width="86" height="30" rx="11" fill="${k.g}"/>`
    + `<circle cx="50" cy="50" r="10.5" fill="${k.p}"/><circle cx="50" cy="50" r="5" fill="${k.h}"/>`,

  corazon: (k) => `<path d="M50 90C20 68 7 49 7 32 7 18 18 9 30 9c8 0 15 4 20 12 5-8 12-12 20-12 12 0 23 9 23 23 0 17-13 36-43 58Z" fill="${k.g}"/>`
    + `<path d="M16 48H35L42 33L53 62L60 48H84" fill="none" stroke="${k.p}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,

  tijera: (k) => `<path d="${taper(36, 74, 79, 7, 6, 1.1)}" fill="${k.g}"/><path d="${taper(64, 74, 21, 7, 6, 1.1)}" fill="${k.d}"/>`
    + `<circle cx="29" cy="82" r="11" fill="none" stroke="${k.g}" stroke-width="6"/><circle cx="71" cy="82" r="11" fill="none" stroke="${k.d}" stroke-width="6"/>`
    + `<circle cx="50" cy="52" r="4.6" fill="${k.h}" stroke="${k.p}" stroke-width="1.6"/>`,

  flor: (k) => {
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += `<path transform="rotate(${i * 60} 50 50)" d="M50 50C35 37 35 14 50 5C65 14 65 37 50 50Z" fill="${i % 2 ? k.d : k.g}" stroke="${k.p}" stroke-width="2" stroke-linejoin="round"/>`;
    }
    return out + `<circle cx="50" cy="50" r="10" fill="${k.h}" stroke="${k.p}" stroke-width="2.5"/>`;
  },

  casa: (k) => `<rect x="68" y="14" width="10" height="22" rx="2" fill="${k.d}"/>`
    + `<path d="M20 50L50 26L80 50V90H20Z" fill="${k.g}" stroke="${k.g}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M7 53L50 16L93 53" fill="none" stroke="${k.d}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M41 90V68a9 9 0 0 1 18 0V90Z" fill="${k.p}"/><circle cx="55" cy="75" r="1.8" fill="${k.h}"/>`,

  martillo: (k) => `<g transform="rotate(40 50 50)"><rect x="44" y="30" width="12" height="62" rx="5.5" fill="${k.d}"/>`
    + `<circle cx="50" cy="88" r="4.5" fill="${k.h}"/>`
    + `<rect x="16" y="11" width="54" height="25" rx="7" fill="${k.g}"/>`
    + `<rect x="64" y="8" width="16" height="31" rx="6" fill="${k.h}"/>`
    + `<path d="M24 19H54" stroke="${k.p}" stroke-width="3.4" stroke-linecap="round" opacity=".5"/></g>`,

  bolsa: (k) => `<path d="M33 44V28a17 17 0 0 1 34 0V44" fill="none" stroke="${k.d}" stroke-width="6" stroke-linecap="round"/>`
    + `<path d="M16 34H84L91 87Q92 94 85 94H15Q8 94 9 87Z" fill="${k.g}" stroke="${k.g}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M33 60Q50 77 67 60" fill="none" stroke="${k.p}" stroke-width="5.5" stroke-linecap="round"/>`
    + `<circle cx="33" cy="45" r="3.2" fill="${k.h}"/><circle cx="67" cy="45" r="3.2" fill="${k.h}"/>`,

  etiqueta: (k) => `<g transform="rotate(-32 50 50)"><path d="M14 34H60L90 50L60 66H14Z" fill="${k.g}" stroke="${k.g}" stroke-width="12" stroke-linejoin="round"/>`
    + `<circle cx="28" cy="50" r="6.5" fill="${k.p}"/>`
    + `<path d="M43 44H62M43 56H55" stroke="${k.p}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`
    + `<path d="M24 47C12 44 5 34 9 22" fill="none" stroke="${k.h}" stroke-width="4" stroke-linecap="round"/></g>`,

  libro: (k) => `<path d="M48 24C36 14 18 12 5 16V80C18 76 36 78 48 88Z" fill="${k.g}"/>`
    + `<path d="M52 24C64 14 82 12 95 16V80C82 76 64 78 52 88Z" fill="${k.d}"/>`
    + `<path d="M15 33c8-2 17-1 26 4M15 46c8-2 17-1 26 4M15 59c8-2 17-1 26 4" fill="none" stroke="${k.p}" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>`
    + `<path d="M68 12V44L75 37L82 44V14Z" fill="${k.h}" stroke="${k.h}" stroke-width="2" stroke-linejoin="round"/>`,

  birrete: (k) => `<path d="M23 48V68Q23 80 50 80Q77 80 77 68V48L50 60Z" fill="${k.d}"/>`
    + `<path d="M50 13L95 35L50 57L5 35Z" fill="${k.g}" stroke="${k.g}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M50 22L76 35" stroke="${k.p}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`
    + `<path d="M87 38V67" stroke="${k.h}" stroke-width="3.6" stroke-linecap="round"/><circle cx="87" cy="72" r="5.5" fill="${k.h}"/>`,

  chip: (k) => {
    let pins = '';
    for (const v of [34, 50, 66]) pins += `M${v} 6V20M${v} 80V94M6 ${v}H20M80 ${v}H94`;
    return `<path d="${pins}" stroke="${k.d}" stroke-width="5" stroke-linecap="round"/>`
      + `<rect x="20" y="20" width="60" height="60" rx="11" fill="${k.g}"/>`
      + `<rect x="33" y="33" width="34" height="34" rx="6" fill="${k.p}"/>`
      + `<rect x="42" y="42" width="16" height="16" rx="3.5" fill="${k.h}"/>`;
  },

  orbita: (k) => {
    const dot = (cx, cy, rx, ry, rot, t, r, fill) => {
      const x = rx * Math.cos(rad(t)), y = ry * Math.sin(rad(t));
      const c = Math.cos(rad(rot)), s = Math.sin(rad(rot));
      return `<circle cx="${n(cx + x * c - y * s)}" cy="${n(cy + x * s + y * c)}" r="${r}" fill="${fill}"/>`;
    };
    return `<ellipse cx="50" cy="50" rx="44" ry="17" transform="rotate(-32 50 50)" fill="none" stroke="${k.d}" stroke-width="4.5"/>`
      + `<ellipse cx="50" cy="50" rx="44" ry="17" transform="rotate(32 50 50)" fill="none" stroke="${k.g}" stroke-width="4.5"/>`
      + `<circle cx="50" cy="50" r="14" fill="${k.g}"/><circle cx="46" cy="46" r="4.2" fill="${k.p}" opacity=".5"/>`
      + dot(50, 50, 44, 17, -32, -35, 6.5, k.h) + dot(50, 50, 44, 17, 32, 150, 5, k.h);
  },

  llave: (k) => `<circle cx="31" cy="31" r="18" fill="none" stroke="${k.g}" stroke-width="12"/><circle cx="31" cy="31" r="5.5" fill="${k.h}"/>`
    + `<path d="M45 45L87 87" stroke="${k.d}" stroke-width="9" stroke-linecap="round"/>`
    + `<path d="M64 66l11-11M76 78l9-9" stroke="${k.g}" stroke-width="7.5" stroke-linecap="round"/>`,

  engranaje: (k) => {
    let teeth = '';
    for (let i = 0; i < 8; i++) teeth += `<rect x="43.5" y="6" width="13" height="20" rx="3.5" transform="rotate(${i * 45} 50 50)" fill="${k.g}"/>`;
    return teeth + `<circle cx="50" cy="50" r="33" fill="${k.g}"/><circle cx="50" cy="50" r="24" fill="none" stroke="${k.p}" stroke-width="2" opacity=".35"/>`
      + `<circle cx="50" cy="50" r="13" fill="${k.p}"/><circle cx="50" cy="50" r="5.5" fill="${k.h}"/>`;
  },

  hoja: (k) => `<path d="M50 95C50 80 50 66 50 52" stroke="${k.d}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`
    + `<path d="M50 62C50 41 63 19 93 8C98 40 80 62 50 62Z" fill="${k.g}"/>`
    + `<path d="M50 74C50 58 40 44 14 41C11 62 27 74 50 74Z" fill="${k.d}"/>`
    + `<path d="M53 60C64 44 76 28 88 15M48 72C38 60 28 52 18 45" fill="none" stroke="${k.p}" stroke-width="2.8" stroke-linecap="round" opacity=".7"/>`,

  estrella: (k) => `<path d="M44 12C48 37 59 48 84 52C59 56 48 67 44 92C40 67 29 56 4 52C29 48 40 37 44 12Z" fill="${k.g}"/>`
    + `<path d="M82 6C83 16 86 20 96 21C86 22 83 26 82 36C81 26 78 22 68 21C78 20 81 16 82 6Z" fill="${k.h}"/>`
    + `<circle cx="84" cy="80" r="4.5" fill="${k.h}"/>`,

  prisma: (k) => `<path d="M40 8L74 84H6Z" fill="${k.g}" stroke="${k.g}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M40 8L74 84H40Z" fill="${k.d}" stroke="${k.d}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M40 32L55 66H25Z" fill="none" stroke="${k.p}" stroke-width="2.6" stroke-linejoin="round" opacity=".55"/>`
    + `<path d="M1 66L24 58" stroke="${k.d}" stroke-width="3.6" stroke-linecap="round"/>`
    + `<path d="M66 54L99 38" stroke="${k.h}" stroke-width="4.6" stroke-linecap="round"/>`
    + `<path d="M68 63L99 63" stroke="${k.g}" stroke-width="4.6" stroke-linecap="round"/>`
    + `<path d="M70 72L99 88" stroke="${k.d}" stroke-width="4.6" stroke-linecap="round"/>`,

  onda: (k) => {
    const wave = (dy, c) => `<path d="M6 ${24 + dy}C20 ${10 + dy} 34 ${10 + dy} 50 ${24 + dy}S80 ${38 + dy} 94 ${24 + dy}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>`;
    return wave(0, k.h) + wave(26, k.g) + wave(52, k.d);
  },

  horizonte: (k) => {
    let rays = '';
    for (const a of [-90, -45, -135, -18, -162]) {
      const c = Math.cos(rad(a)), s = Math.sin(rad(a));
      rays += `M${n(50 + c * 41)} ${n(54 + s * 41)}L${n(50 + c * 49)} ${n(54 + s * 49)}`;
    }
    return `<path d="${rays}" stroke="${k.h}" stroke-width="4.5" stroke-linecap="round"/>`
      + `<path d="M15 54A35 35 0 0 1 85 54Z" fill="${k.g}"/>`
      + `<rect x="15" y="60" width="70" height="5.5" rx="2.7" fill="${k.g}"/><rect x="24" y="70" width="52" height="4.5" rx="2.2" fill="${k.g}"/>`
      + `<rect x="34" y="79" width="32" height="3.6" rx="1.8" fill="${k.g}"/>`
      + `<path d="M4 54H96" stroke="${k.d}" stroke-width="3.2" stroke-linecap="round"/>`;
  },
};

/* ---------- contenedores (caja 120x120) ---------- */

const SHAPES = {
  circle: (a) => `<circle cx="60" cy="60" r="56" ${a}/>`,
  squircle: (a) => `<rect x="5" y="5" width="110" height="110" rx="34" ${a}/>`,
  arch: (a) => `<path d="M9 104V58a51 51 0 0 1 102 0v46a11 11 0 0 1-11 11H20A11 11 0 0 1 9 104Z" ${a}/>`,
  hex: (a) => `<polygon points="60,10 103,35 103,85 60,110 17,85 17,35" stroke-linejoin="round" ${a}/>`,
  shield: (a) => `<path d="M60 5L109 21V58C109 88 87 107 60 116C33 107 11 88 11 58V21Z" stroke-linejoin="round" ${a}/>`,
};
/** Relleno (el hexágono y el escudo se redondean con un trazo del mismo color). */
const shapeFill = (kind, fill) => SHAPES[kind](`fill="${fill}"${kind === 'hex' || kind === 'shield' ? ` stroke="${fill}" stroke-width="8"` : ''}`);
const shapeLine = (kind, stroke, w, extra = '') => SHAPES[kind](`fill="none" stroke="${stroke}" stroke-width="${w}"${extra}`);

/* ---------- texto ---------- */

function charW(ch) {
  if ('iljtf.,;:!|\'’ '.includes(ch)) return ch === ' ' ? 0.28 : 0.3;
  if ('mwMW@'.includes(ch)) return 0.88;
  if ('rIJ()-'.includes(ch)) return 0.4;
  if (/[A-ZÁÉÍÓÚÑ]/.test(ch)) return 0.66;
  if (/\d/.test(ch)) return 0.56;
  return 0.52;
}
function textW(t, fs, bold) {
  let w = 0;
  for (const ch of t) w += charW(ch);
  return w * fs * (bold ? 1.06 : 1);
}
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Marca';

function splitLines(name) {
  if (name.length <= 15 || !name.includes(' ')) return [name];
  const words = name.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const score = Math.max(a.length, b.length);
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  return best.lines;
}

/* ---------- ensamblado ---------- */

const hash36 = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).slice(0, 5);
};

function palette(o) {
  const P = o.palette || {};
  const bg = hex(P.bg, '#ffffff');
  const primary = hex(P.primary, '#1e3a5f');
  const secondary = hex(P.secondary, mix(primary, '#000000', 0.35));
  const accent = hex(P.accent, '#d97706');
  const text = hex(P.text, '#111111');
  return { bg, primary, secondary, accent, text };
}

/** Elige acento sobre un fondo de color: el acento si contrasta lo suficiente, si no el "papel". */
const accentOn = (accent, base, paper) => (contrast(accent, base) >= 3 ? accent : paper);

function build(w, h, uid, defs, body, title, bg) {
  const rx = Math.round(Math.min(w, h) * 0.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" role="img"><title>${esc(title)}</title><defs>${defs}</defs>`
    + `<rect width="${n(w)}" height="${n(h)}" rx="${rx}" fill="${bg}"/>${body}</svg>`;
}

function grad(id, x2, y2, c1, c2) {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
}

export function renderLogo(o = {}) {
  const style = LOGO_STYLES.includes(o.style) ? o.style : 'isotipo';
  const mark = MARKS.includes(o.mark) ? o.mark : 'estrella';
  const P = palette(o);
  const name = cleanName(o.name);
  const fonts = o.fonts || {};
  const serif = SERIF_FONTS.has(fonts.heading);
  const stack = serif ? SERIF_STACK : SANS_STACK;
  const container = CONTAINERS.includes(o.container) ? o.container : 'circle';
  const uid = (o.uid || `l${hash36([name, mark, style, P.primary, P.bg].join('|'))}`).replace(/[^A-Za-z0-9_-]/g, '');
  const title = `${name} (logo)`;
  const ga = `url(#${uid}a)`, gb = `url(#${uid}b)`, gc = `url(#${uid}c)`;
  const inkOnBg = { g: ga, s: P.primary, d: P.secondary, h: P.accent, p: P.bg };
  const badgeTint = mix(P.bg, P.primary, 0.28);
  const inkOnBadge = { g: gc, s: P.bg, d: badgeTint, h: accentOn(P.accent, P.primary, P.bg), p: P.primary };
  const draw = DRAW[mark];
  const defsMark = grad(`${uid}a`, 100, 100, P.primary, P.secondary);
  const defsBadgeMark = grad(`${uid}c`, 100, 100, P.bg, mix(P.bg, P.primary, 0.14));
  const defsBox = grad(`${uid}b`, 120, 120, P.primary, P.secondary);
  const place = (ink, x, y, s, extra = '') => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})"${extra}>${draw(ink)}</g>`;
  const text = (t, x, y, fs, fill, opts = {}) => {
    const tl = opts.width ? ` textLength="${n(opts.width)}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<text x="${n(x)}" y="${n(y)}" font-family="${stack}" font-size="${n(fs)}" font-weight="${opts.weight || 700}" fill="${fill}"${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}${opts.ls ? ` letter-spacing="${opts.ls}"` : ''}${tl}>${esc(t)}</text>`;
  };

  if (style === 'monograma') {
    const letters = String(o.monogram || name[0] || 'M').toUpperCase().slice(0, 2);
    const fs = letters.length > 1 ? 46 : 58;
    const tw = textW(letters, fs, true);
    const ac = accentOn(P.accent, P.primary, P.bg);
    const body = shapeFill(container, gb)
      + place({ ...inkOnBadge, g: P.bg, d: P.bg }, 12, 12, 0.96, ' opacity=".14"')
      + `<g transform="translate(8.4 8.4) scale(.86)">${shapeLine(container, ac, 2.2, ' opacity=".8"')}</g>`
      + text(letters, 60, 60 + fs * 0.35, fs, P.bg, { anchor: 'middle', width: tw, ls: letters.length > 1 ? 1 : 0 })
      + `<rect x="${n(60 - 16)}" y="${n(60 + fs * 0.35 + 9)}" width="32" height="4.5" rx="2.2" fill="${ac}"/>`;
    return build(120, 120, uid, defsBox + defsBadgeMark, body, title, P.bg);
  }

  if (style === 'emblema') {
    const lines = splitLines(name);
    const base = lines.length > 1 ? 18 : 22;
    const widest = Math.max(...lines.map((l) => textW(l, base, true)));
    const fs = widest > 146 ? base * (146 / widest) : base;
    let txt = '';
    lines.forEach((l, i) => {
      const y = lines.length > 1 ? 130 + i * (fs * 1.1) : 144;
      txt += text(l, 80, y, fs, P.text, { anchor: 'middle', width: textW(l, fs, true), ls: 0 });
    });
    const body = `<g transform="translate(24 2) scale(.93)">${shapeFill(container, gb)}</g>`
      + `<g transform="translate(30.4 8.4) scale(.8)">${shapeLine(container, inkOnBadge.h, 1.6, ' opacity=".55" stroke-dasharray="2 5" stroke-linecap="round"')}</g>`
      + place(inkOnBadge, 49, 27, 0.62)
      + txt;
    return build(160, 160, uid, defsBox + defsBadgeMark, body, title, P.bg);
  }

  if (style === 'isotipo') {
    const bd = o.backdrop === 'none' ? 'none' : (o.backdrop === 'squircle' ? 'squircle' : 'circle');
    const tint = mix(P.bg, P.primary, 0.1);
    const back = bd === 'none' ? '' : (bd === 'circle'
      ? `<circle cx="60" cy="60" r="55" fill="${tint}"/><circle cx="60" cy="60" r="55" fill="none" stroke="${P.accent}" stroke-width="1.6" opacity=".55" stroke-dasharray="1 5" stroke-linecap="round"/>`
      : `<rect x="6" y="6" width="108" height="108" rx="34" fill="${tint}"/>`);
    const s = bd === 'none' ? 1.0 : 0.72;
    const off = 60 - 50 * s;
    return build(120, 120, uid, defsMark, back + place(inkOnBg, off, off, s), title, P.bg);
  }

  // tipografico (apaisado): símbolo pequeño + wordmark
  const lines = splitLines(name);
  const base = lines.length > 1 ? 27 : 38;
  const maxW = 250;
  const widest = Math.max(...lines.map((l) => textW(l, base, true)));
  const fs = widest > maxW ? base * (maxW / widest) : base;
  const tw = Math.max(...lines.map((l) => textW(l, fs, true)));
  const x0 = 88;
  const W = Math.round(x0 + tw + 18);
  let txt = '';
  if (lines.length === 1) {
    txt = text(lines[0], x0, 58, fs, P.text, { width: textW(lines[0], fs, true), ls: 0 })
      + `<rect x="${x0}" y="68" width="${n(Math.min(54, tw * 0.3))}" height="5" rx="2.5" fill="${P.accent}"/>`;
  } else {
    lines.forEach((l, i) => { txt += text(l, x0, 44 + i * (fs * 1.08), fs, P.text, { width: textW(l, fs, true) }); });
    txt += `<rect x="${x0}" y="${n(44 + fs * 1.08 + 10)}" width="${n(Math.min(54, tw * 0.3))}" height="5" rx="2.5" fill="${P.accent}"/>`;
  }
  const body = `<circle cx="46" cy="48" r="34" fill="${mix(P.bg, P.primary, 0.1)}"/>` + place(inkOnBg, 18, 20, 0.56) + txt;
  return build(W, 96, uid, defsMark, body, title, P.bg);
}

/** Ícono cuadrado (favicon): igual al logo si ya es cuadrado y sin texto, si no el símbolo solo. */
export function renderIcon(o = {}) {
  if (o.style === 'monograma') return renderLogo(o);
  return renderLogo({ ...o, style: 'isotipo', uid: o.uid ? `${o.uid}i` : undefined });
}
