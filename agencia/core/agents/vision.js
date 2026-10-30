// Concepto creativo ("visión") de Tomas, el diseñador visionario de la agencia.
//   structure.vision = { name, manifesto, motif, motion, signature, mood[], style }
// - designVision(brief): SIN IA. Determinista pero variado: elige por sector + tono y desempata con un hash
//   estable del nombre del negocio (dos negocios del mismo rubro no salen idénticos).
// - validateVision(raw, brief): validación estricta de la respuesta de una IA (enums, largos, sin números/URLs/HTML).
// - aiVision(brief, llm): pide la visión a la IA con una persona; si falla o no valida, devuelve el motivo.
// No inventa datos del negocio: todo es concepto de diseño, nunca precios, teléfonos ni promesas.

import { norm } from './interviewer.js';
import { voseo } from './voseo.js';

export { voseo };

export const MOTIFS = ['aurora', 'neon-grid', 'orbit', 'blob', 'paper-cut', 'prisma'];
export const MOTIONS = ['float', 'parallax', 'morph', 'spotlight'];
export const BOLDNESS = ['sobrio', 'atrevido', 'extremo'];
export const STYLES = ['calido', 'moderno', 'elegante', 'vibrante', 'futurista'];

/* ---------- hash estable (FNV-1a) ---------- */

export function hashStr(text) {
  let h = 2166136261;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** Hash derivado e independiente por "canal" para que motif/motion/name/etc. no estén correlacionados. */
const ch = (seed, channel) => hashStr(`${seed}#${channel}`);

/* ---------- catálogos ---------- */

// Motivos preferidos por rubro (en orden de afinidad) y por tono.
const SECTOR_MOTIFS = {
  gastronomia: ['aurora', 'paper-cut', 'blob'],
  salud: ['aurora', 'orbit', 'blob'],
  belleza: ['prisma', 'blob', 'aurora'],
  fitness: ['neon-grid', 'orbit', 'prisma'],
  legal: ['paper-cut', 'orbit', 'prisma'],
  construccion: ['paper-cut', 'neon-grid', 'prisma'],
  tienda: ['blob', 'prisma', 'paper-cut'],
  educacion: ['orbit', 'blob', 'aurora'],
  tecnologia: ['neon-grid', 'orbit', 'aurora'],
  servicios: ['orbit', 'paper-cut', 'aurora'],
};
const TONE_MOTIFS = {
  premium: ['prisma', 'aurora', 'paper-cut'],
  profesional: ['orbit', 'paper-cut', 'neon-grid'],
  divertido: ['blob', 'prisma', 'neon-grid'],
  cercano: ['aurora', 'blob', 'paper-cut'],
};
const MOTIF_MOTIONS = {
  aurora: ['float', 'morph', 'parallax'],
  'neon-grid': ['spotlight', 'parallax', 'float'],
  orbit: ['float', 'parallax', 'spotlight'],
  blob: ['morph', 'float', 'spotlight'],
  'paper-cut': ['parallax', 'float', 'spotlight'],
  prisma: ['spotlight', 'morph', 'parallax'],
};

const NAMES = {
  aurora: ['Aurora de Barrio', 'Amanecer Eléctrico', 'Mañana Boreal', 'Horizonte Líquido', 'Resplandor Doméstico', 'Luz de Otra Galaxia', 'Cielo en Ebullición'],
  'neon-grid': ['Neón Sur', 'Autopista Cuántica', 'Rejilla Nocturna', 'Pulso Futuro', 'Circuito de Medianoche', 'Código Callejero', 'Ciudad Encendida'],
  orbit: ['Órbita Local', 'Satélite de Esquina', 'Gravedad Cero', 'Constelación Vecina', 'Luna de Barrio', 'Sistema Solar Propio', 'Anillos de Plata'],
  blob: ['Gelatina Cósmica', 'Marea Viva', 'Lava de Autor', 'Plastilina Estelar', 'Burbuja Maestra', 'Gota Atrevida', 'Líquido Vital'],
  'paper-cut': ['Papel y Tijera Cósmicos', 'Collage de Medianoche', 'Origami Urbano', 'Recorte Maestro', 'Capas de Papel Estelar', 'Taller de Recortes', 'Mapa de Papel'],
  prisma: ['Prisma Doméstico', 'Cristal Galáctico', 'Facetas de Autor', 'Luz Descompuesta', 'Diamante Urbano', 'Espejo de Colores', 'Arcoíris Quirúrgico'],
};

const SIGNATURES = {
  aurora: ['titular gigante con degradé que respira', 'una malla de aurora que flota detrás de todo', 'tarjetas de cristal flotando sobre la luz'],
  'neon-grid': ['un piso de rejilla neón en perspectiva infinita', 'acentos con halo eléctrico que late', 'titular enorme sobre un horizonte de neón'],
  orbit: ['anillos orbitales girando alrededor del titular', 'íconos con órbita propia', 'un sistema solar de detalles alrededor del mensaje'],
  blob: ['formas líquidas que se derriten y se recomponen', 'tarjetas orgánicas que parecen gotas', 'burbujas de color que respiran detrás del titular'],
  'paper-cut': ['secciones recortadas como capas de papel', 'sombras de papel apiladas en cada tarjeta', 'un collage de capas con cortes afilados'],
  prisma: ['facetas de cristal que descomponen la luz', 'bordes iridiscentes que cambian al pasar el mouse', 'un titular atravesado por un prisma'],
};

const MOOD = {
  aurora: ['luminoso', 'fluido', 'soñador'],
  'neon-grid': ['eléctrico', 'nocturno', 'preciso'],
  orbit: ['cósmico', 'armónico', 'curioso'],
  blob: ['orgánico', 'juguetón', 'vivo'],
  'paper-cut': ['artesanal', 'táctil', 'audaz'],
  prisma: ['cristalino', 'iridiscente', 'sofisticado'],
};
const TONE_MOOD = { cercano: 'cálido', profesional: 'confiable', premium: 'exclusivo', divertido: 'travieso' };

// Cómo Tomas defiende el nivel de audacia que pidió el cliente (o el que viene por defecto).
const BOLD_LINES = {
  sobrio: ['Dosis fina de magia: lo justo para que se note sin levantar la voz.', 'Elegancia silenciosa: movimiento medido y cero ruido.'],
  atrevido: ['¡Acá el scroll es un viaje, y vos manejás!', 'Animaciones con intención, composiciones que se animan a romper la grilla: así se recuerda una web.'],
  extremo: ['¡Modo extremo! Rompo la grilla con muchísimo cariño y cero miedo.', 'Esto no es una página, es una experiencia fuera de órbita: tipografía cinética, capas y sorpresas por todos lados.'],
};
export const boldLine = (level, seed) => { const l = BOLD_LINES[level] || BOLD_LINES.atrevido; return l[ch(seed, 'bold') % l.length]; };

const THING = {
  gastronomia: 'la mesa', salud: 'el consultorio', belleza: 'el espejo', fitness: 'el gimnasio', legal: 'el estudio',
  construccion: 'la obra', tienda: 'la vidriera', educacion: 'el aula', tecnologia: 'la pantalla', servicios: 'el servicio',
};

const OPENERS = {
  cercano: [
    'Imaginá que {n} es ese lugar donde entrás y sentís que llegaste: ¡lo mismo, pero hecho de luz y movimiento!',
    'Quiero que {n} se vea como el futuro más amable del barrio: cálido, vivo y con un poquito de magia rara.',
    '¡Esto es {n} versión futuro! Cercano como un abrazo, pero con partículas flotando alrededor.',
  ],
  profesional: [
    'Confianza con estilo de otra dimensión: {n} merece una web precisa, luminosa y adelantada a su época.',
    'Orden, claridad y un toque de ciencia ficción elegante: así veo a {n}, sin perder ni un gramo de seriedad.',
    'Que {n} parezca el estudio del futuro: impecable por dentro, deslumbrante por fuera.',
  ],
  premium: [
    'Lujo del futuro: {n} como una galería de luz donde cada detalle respira.',
    'Sutileza extrema para {n}: pocas cosas, perfectas, y una que no se olvida jamás.',
    '{n} merece una experiencia de vitrina museo: silenciosa, magnética e inolvidable.',
  ],
  divertido: [
    '¡{n} no entra a la web, la invade! Colores que bailan, formas que se mueven y cero aburrimiento.',
    'Se me ocurrió una locura para {n}: que la página parezca una fiesta en otra galaxia. ¡Y funciona!',
    '¡Vamos con todo! {n} con energía de dibujito animado del año que viene.',
  ],
};
const CLOSERS = {
  aurora: ['Una aurora boreal sobre {t}: eso voy a diseñar.', 'Luces que se mezclan despacito alrededor {dt}.'],
  'neon-grid': ['Neón y rejilla sobre {t}, como si la ciudad se hubiera despertado en modo turbo.', 'Un horizonte eléctrico para {t}: ¡cero timidez!'],
  orbit: ['Todo gira con elegancia alrededor {dt}, como un pequeño universo propio.', 'Anillos, satélites y {t} en el centro de la galaxia.'],
  blob: ['Formas líquidas que respiran alrededor {dt}: vivo, blandito y atrevido.', 'Mirá cómo se derrite {t} en colores que no existían ayer.'],
  'paper-cut': ['Capas de papel recortado alrededor {dt}: artesanía del futuro.', 'Tijera, color y {t}: un collage con filo.'],
  prisma: ['Un prisma que descompone la luz sobre {t}: cada cara cuenta algo.', 'Facetas de cristal para {t}: brillo con carácter.'],
};

/* ---------- selección ---------- */

/**
 * Elige el motivo por afinidad rubro+tono; entre los tres mejor puntuados desempata con el hash del nombre.
 * Peso rubro: 3/2/1; peso tono: 2/1/1.
 */
function pickMotif(sector, tone, seed) {
  const score = Object.fromEntries(MOTIFS.map((m) => [m, 0]));
  (SECTOR_MOTIFS[sector] || SECTOR_MOTIFS.servicios).forEach((m, i) => { score[m] += [3, 2, 1][i]; });
  (TONE_MOTIFS[tone] || TONE_MOTIFS.cercano).forEach((m, i) => { score[m] += [2, 1, 1][i]; });
  const ranked = MOTIFS.slice().sort((a, b) => score[b] - score[a] || MOTIFS.indexOf(a) - MOTIFS.indexOf(b)).slice(0, 3);
  return ranked[[0, 0, 0, 1, 1, 2][ch(seed, 'motif') % 6]];
}

const EVENTS_RE = /\b(evento|eventos|fiesta|fiestas|dj|festival|boliche|discoteca|recital|banquete|salon de fiestas|animacion)\b/;

/** Estilo preferido del generador. 'futurista' si el rubro/concepto lo pide; el architect lo baja si el color de marca no da. */
export function pickStyle(brief, motif) {
  const calm = brief.boldness === 'sobrio';
  const text = norm([brief.businessName, brief.description, ...(brief.services || []).map((s) => s?.name)].join(' '));
  if (!calm) {
    if (brief.sector === 'tecnologia' || brief.sector === 'fitness') return 'futurista';
    if (brief.sector === 'belleza' && brief.tone !== 'premium') return 'futurista';
    if (EVENTS_RE.test(text)) return 'futurista';
    if (motif === 'neon-grid' && brief.tone !== 'profesional') return 'futurista';
  }
  if (brief.tone === 'premium') return 'elegante';
  if (brief.tone === 'divertido') return 'vibrante';
  if (brief.sector === 'gastronomia') return 'calido';
  return 'moderno';
}

/* ---------- visión determinista ---------- */

export function designVision(rawBrief = {}) {
  const sector = SECTOR_MOTIFS[rawBrief.sector] ? rawBrief.sector : 'servicios';
  const tone = TONE_MOTIFS[rawBrief.tone] ? rawBrief.tone : 'cercano';
  const business = String(rawBrief.businessName || 'Mi negocio').trim();
  const seed = `${norm(business)}|${sector}`;
  const motif = pickMotif(sector, tone, seed);
  const motion = MOTIF_MOTIONS[motif][ch(seed, 'motion') % 3];
  const pick = (list, c) => list[ch(seed, c) % list.length];
  const opener = pick(OPENERS[tone], 'opener').replace('{n}', business);
  const closer = pick(CLOSERS[motif], 'closer').replace('{t}', THING[sector]).replace('{dt}', THING[sector].replace(/^el /, 'del ').replace(/^la /, 'de la '));
  const mood = [...MOOD[motif].slice(0, 2), TONE_MOOD[tone]];
  const boldness = BOLDNESS.includes(rawBrief.boldness) ? rawBrief.boldness : 'atrevido';
  return {
    name: pick(NAMES[motif], 'name'),
    manifesto: `${opener} ${closer} ${boldLine(boldness, seed)}`,
    boldness,
    motif,
    motion,
    signature: pick(SIGNATURES[motif], 'signature'),
    mood,
    style: pickStyle({ ...rawBrief, sector, tone, boldness }, motif),
  };
}

/* ---------- validación estricta (salida de IA) ---------- */

const bad = (reason) => ({ ok: false, reason });
const clean = (t) => String(t).replace(/\s+/g, ' ').trim();
// HTML, URLs, mails, símbolos de moneda, saltos de control
const FORBIDDEN = /[<>`{}\\]|https?:|www\.|\.(?:com|ar|net|org)\b|@|[$€£]|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i;

function textField(v, field, min, max, allowedNums) {
  if (typeof v !== 'string') return { reason: `${field} no es texto` };
  const t = clean(v);
  if (t.length < min) return { reason: `${field} demasiado corto` };
  if (t.length > max) return { reason: `${field} demasiado largo` };
  if (FORBIDDEN.test(t)) return { reason: `${field} tiene HTML, enlaces o símbolos no permitidos` };
  const nums = t.match(/\d+/g) || [];
  if (nums.some((n) => !allowedNums.has(n))) return { reason: `${field} inventa números` };
  return { value: t };
}

/** Devuelve { ok:true, vision } o { ok:false, reason }. `brief` aporta los números permitidos (los que ya dijo el cliente). */
export function validateVision(raw, brief = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('la respuesta no es un objeto');
  const allowedNums = new Set(JSON.stringify(brief || {}).match(/\d+/g) || []);
  if (!MOTIFS.includes(raw.motif)) return bad('motif fuera del catálogo');
  if (!MOTIONS.includes(raw.motion)) return bad('motion fuera del catálogo');
  const name = textField(raw.name, 'name', 3, 40, allowedNums);
  if (name.reason) return bad(name.reason);
  const manifesto = textField(raw.manifesto, 'manifesto', 20, 260, allowedNums);
  if (manifesto.reason) return bad(manifesto.reason);
  const signature = textField(raw.signature, 'signature', 8, 100, allowedNums);
  if (signature.reason) return bad(signature.reason);
  if (!Array.isArray(raw.mood) || raw.mood.length < 2 || raw.mood.length > 5) return bad('mood debe tener entre 2 y 5 palabras');
  const mood = [];
  for (const m of raw.mood) {
    const t = textField(m, 'mood', 3, 24, allowedNums);
    if (t.reason) return bad(t.reason);
    mood.push(t.value);
  }
  let style;
  if (raw.style != null && raw.style !== '') {
    if (!STYLES.includes(raw.style)) return bad('style fuera del catálogo');
    style = raw.style;
  }
  return { ok: true, vision: { name: name.value, manifesto: manifesto.value, motif: raw.motif, motion: raw.motion, signature: signature.value, mood, ...(style ? { style } : {}) } };
}

/* ---------- visión con IA ---------- */

export const VISION_SYSTEM = `Sos Tomas, diseñador visionario y excéntrico de nacimiento: pensás en 2040, te apasiona cada pixel, hablás con entusiasmo contagioso y usás metáforas atrevidas, pero respetás los hechos del cliente y la accesibilidad.
Tu tarea: inventar el CONCEPTO CREATIVO de la landing page de un negocio. Hablás en voseo rioplatense (vos, tenés, mirá).
Devolvé SOLO un JSON con esta forma exacta:
{"name": string (título corto y memorable del concepto, 2 a 5 palabras, ej. "Aurora de Barrio"),
 "manifesto": string (1 o 2 frases entusiastas, con carácter y un toque excéntrico; máx. 240 caracteres),
 "motif": "aurora" | "neon-grid" | "orbit" | "blob" | "paper-cut" | "prisma",
 "motion": "float" | "parallax" | "morph" | "spotlight",
 "signature": string (la idea audaz única del sitio, texto corto, ej. "titular gigante con degradé que respira"),
 "mood": [3 palabras sueltas que describen el clima],
 "style": "calido" | "moderno" | "elegante" | "vibrante" | "futurista" (opcional: usá "futurista" solo si el negocio es de tecnología, fitness, belleza experimental o eventos)}
 "layout": opcional, la composición que imaginás: {"hero":"split|typo|stage|editorial|bento|poster|terminal|story","nav":"bar|pill|rail|overlay","services":"bento|list|stack|hscroll|accordion","benefits":"grid|radial|columns|strip","testimonials":"quote|masonry|ribbon","hours":"ticket|clock|table","faq":"accordion|columns|chat","contact":"split|band|floating","shapes":"round|notch|blob|brutal","dividers":"waves|diagonal|teeth|none"} (solo esos valores; cualquier otro se descarta)}
Reglas duras: NO inventes datos del negocio: nada de números, precios, años, direcciones, teléfonos, premios, URLs ni HTML. Es un concepto de diseño, no un aviso.
Elegí motif y motion que combinen con el rubro y el tono. Respetá el contraste y la accesibilidad.
El dato "audacia" (sobrio | atrevido | extremo) es lo que pidió el cliente: tu concepto tiene que estar a la altura (sobrio = fino y discreto; atrevido = animado y llamativo; extremo = fuera de lo común, rompe-reglas). No lo menciones con números.`;

const redact = (t) => String(t ?? '')
  .replace(/\b(?:sk|gsk|pk|rk|ghp|xai|AIza)[-_][\w-]{8,}/g, '[clave]')
  .replace(/\bBearer\s+\S+/gi, 'Bearer [clave]')
  .replace(/[?&](?:key|api_key|token)=[^&\s]+/gi, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 100);

/**
 * Pide la visión a la IA. Nunca lanza.
 * Devuelve { vision|null, source:'ai'|'fallback', note? } (note = motivo corto del error, sin claves).
 */
export async function aiVision(brief, llm) {
  if (!llm || !llm.available || typeof llm.completeJSON !== 'function') return { vision: null, source: 'fallback' };
  try {
    const facts = {
      audacia: brief.boldness || 'atrevido', negocio: brief.businessName, rubro: brief.sector, tono: brief.tone, descripcion: brief.description,
      publico: brief.audience, servicios: (brief.services || []).map((s) => s.name), diferenciales: brief.differentiators,
    };
    const res = await llm.completeJSON({ system: VISION_SYSTEM, prompt: `Datos del cliente (usalos solo como inspiración, sin inventar nada más):\n${JSON.stringify(facts)}\n\nDevolvé el JSON del concepto creativo.` });
    const v = validateVision(res, brief);
    if (!v.ok) return { vision: null, source: 'fallback', note: `la IA devolvió una visión inválida (${v.reason})` };
    const boldness = BOLDNESS.includes(brief.boldness) ? brief.boldness : 'atrevido';
    let manifesto = voseo(v.vision.manifesto);
    const extra = boldLine(boldness, brief.businessName);
    if (manifesto.length + extra.length < 330) manifesto = `${manifesto} ${extra}`;
    const vision = { ...v.vision, manifesto, boldness, signature: voseo(v.vision.signature) };
    return { vision, source: 'ai', rawLayout: res.layout };
  } catch (e) {
    return { vision: null, source: 'fallback', note: `la IA no respondió: ${redact(e?.message || e)}` };
  }
}
