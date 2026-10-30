// Agente LOGO (Tomas, diseñador visionario): si el cliente NO tiene logo, le OFRECE 3 propuestas, cada una con paleta,
// tipografías y una justificación basada en los hechos de SU negocio.
//
//   proposeLogos(brief, vision, llm) -> Promise<LogoOption[]>   (EXACTAMENTE 3: 'logo-1','logo-2','logo-3')
//   LogoOption = { id, name, concept, rationale, palette:{primary,secondary,accent,bg,text}, fonts:{heading,body},
//                  style, mark, monogram, svg, source:'ai'|'fallback',   + icon (SVG cuadrado para favicon) }
//   proposeLogos.lastNotes -> string[] con el motivo de cualquier fallo/reemplazo de la IA (sin API keys).
//   sanitizeSvg(svg) -> string|null            allowlist estricta (también para logos SVG que sube el cliente)
//   applyLogoToBrief(brief, option) -> brief   copia nueva con brief.logo (y colores si el cliente no definió)
//   paletteFromImageColors(colors) -> {primary,secondary,accent}|null
//
// SEGURIDAD: a la IA NUNCA se le pide ni se acepta SVG: pide una ESPECIFICACIÓN (enums, hex, textos cortos) que se
// valida estrictamente; el dibujo lo hace siempre core/generator/logomarks.js. Sin IA todo es determinista:
// rubro + tono eligen símbolos/estilos y un hash estable del nombre del negocio desempata.
import { hex, mix, lum, contrast, ensure } from '../generator/util.js';
import { renderLogo, renderIcon, MARKS, LOGO_STYLES, CONTAINERS } from '../generator/logomarks.js';
import { voseo } from './voseo.js';

export { MARKS, LOGO_STYLES };

const SECTORS = ['gastronomia', 'salud', 'belleza', 'fitness', 'legal', 'construccion', 'tienda', 'educacion', 'tecnologia', 'servicios'];
const TONES = ['cercano', 'profesional', 'premium', 'divertido'];

/* ============================================================ utilidades ============================================================ */

export function hashStr(text) {
  let h = 2166136261;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const ch = (seed, channel) => hashStr(`${seed}#${channel}`);
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const cleanText = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f<>«»"`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const strOf = (v) => (typeof v === 'string' ? v : (v && typeof v === 'object' ? String(v.name ?? v.text ?? v.title ?? '') : (v == null ? '' : String(v))));
const lowerFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const upperFirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const stripEnd = (s) => s.replace(/[\s.,;:!?¡¿…-]+$/g, '').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
const rotate = (arr, k) => { const r = ((k % arr.length) + arr.length) % arr.length; return arr.slice(r).concat(arr.slice(0, r)); };

function redact(msg) {
  return String(msg ?? '')
    .replace(/(?:gsk_|sk-|sk_|AIza|ghp_|xai-)[A-Za-z0-9_-]{8,}/g, '[clave]')
    .replace(/(key|token|authorization|bearer)(["'=:\s]+)[A-Za-z0-9._-]{8,}/gi, '$1$2[oculto]')
    .replace(/\s+/g, ' ').slice(0, 180);
}

/* ---------- color ---------- */

const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function toHsl(h) {
  const [r, g, b] = rgbOf(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hh = 0;
  if (d) {
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
  }
  return { h: (hh * 60 + 360) % 360, s, l };
}
export function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
function lab(h) {
  const [r, g, b] = rgbOf(h).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
/** Distancia perceptual (ΔE76) entre dos hex. */
export function deltaE(a, b) {
  const A = lab(a), B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}
const MIN_DE = 26; // los primarios de las 3 opciones deben distar al menos esto

const FEEL = {
  rojo: 'energía y apetito', bordó: 'tradición y carácter', coral: 'cercanía y calidez', terracota: 'lo artesanal y la tierra',
  naranja: 'entusiasmo y calidez', marrón: 'lo artesanal y lo natural', ámbar: 'calidez y optimismo', amarillo: 'optimismo y visibilidad',
  oliva: 'lo natural y lo sereno', lima: 'frescura y energía', verde: 'frescura y confianza', 'verde bosque': 'naturalidad y solidez',
  turquesa: 'claridad y cuidado', 'verde petróleo': 'serenidad y criterio', celeste: 'limpieza y calma', 'azul petróleo': 'confianza y calma',
  azul: 'confianza y solidez', 'azul noche': 'seriedad y prestigio', índigo: 'profundidad y criterio', violeta: 'creatividad y distinción',
  magenta: 'personalidad y audacia', ciruela: 'sofisticación', rosa: 'delicadeza y cercanía', gris: 'sobriedad', grafito: 'sobriedad y firmeza',
  negro: 'elegancia y fuerza', crema: 'calidez y limpieza', 'gris claro': 'neutralidad',
};
/** Nombre en español del color (familia). */
export function colorName(h) {
  const { h: hue, s, l } = toHsl(h);
  if (l < 0.09) return 'negro';
  if (s < 0.1) return l > 0.8 ? 'gris claro' : l > 0.32 ? 'gris' : 'grafito';
  if (hue < 12 || hue >= 345) return l < 0.33 ? 'bordó' : 'rojo';
  if (hue < 28) return l < 0.42 ? 'terracota' : l > 0.58 ? 'coral' : 'naranja';
  if (hue < 45) return l < 0.33 ? 'marrón' : 'naranja';
  if (hue < 52) return l < 0.33 ? 'marrón' : 'ámbar';
  if (hue < 65) return l < 0.36 ? 'oliva' : 'amarillo';
  if (hue < 95) return l < 0.4 ? 'oliva' : 'lima';
  if (hue < 160) return l < 0.27 ? 'verde bosque' : 'verde';
  if (hue < 190) return l < 0.3 ? 'verde petróleo' : 'turquesa';
  if (hue < 215) return l < 0.33 ? 'azul petróleo' : 'celeste';
  if (hue < 250) return l < 0.3 ? 'azul noche' : 'azul';
  if (hue < 270) return 'índigo';
  if (hue < 300) return 'violeta';
  if (hue < 335) return l < 0.32 ? 'ciruela' : 'magenta';
  return 'rosa';
}
const feelOf = (name) => FEEL[name] || 'carácter propio';

/* ============================================================ catálogos ============================================================ */

const SECTOR_LABEL = {
  gastronomia: 'gastronomía', salud: 'salud y bienestar', belleza: 'belleza y estética', fitness: 'fitness y deporte',
  legal: 'servicios profesionales', construccion: 'construcción y obras', tienda: 'comercio', educacion: 'educación y capacitación',
  tecnologia: 'tecnología', servicios: 'servicios',
};
const SECTOR_NOUN = {
  gastronomia: 'una propuesta gastronómica', salud: 'un espacio de salud', belleza: 'un espacio de belleza', fitness: 'un espacio de entrenamiento',
  legal: 'un estudio profesional', construccion: 'una empresa de obra', tienda: 'una tienda', educacion: 'una propuesta de formación',
  tecnologia: 'una propuesta tecnológica', servicios: 'un servicio profesional',
};
const SECTOR_IDEA = {
  gastronomia: 'la mesa, el sabor y el encuentro', salud: 'el cuidado y la confianza', belleza: 'el cuidado personal y el detalle',
  fitness: 'el movimiento y la constancia', legal: 'el criterio y la confianza', construccion: 'la solidez y el oficio',
  tienda: 'elegir y llevarse algo', educacion: 'aprender y crecer', tecnologia: 'la precisión y la innovación', servicios: 'resolver con confianza',
};
const TONE_ADJ = { cercano: 'cercano y amable', profesional: 'serio y confiable', premium: 'refinado y de alto nivel', divertido: 'alegre y con energía' };

// Símbolos afines por rubro (en orden de afinidad) y comodines "inesperados pero defendibles".
const SECTOR_MARKS = {
  gastronomia: ['espiga', 'cubiertos', 'hoja', 'estrella', 'horizonte'],
  salud: ['cruz', 'corazon', 'hoja', 'onda', 'estrella'],
  belleza: ['flor', 'tijera', 'estrella', 'hoja', 'prisma'],
  fitness: ['mancuerna', 'rayo', 'horizonte', 'prisma', 'onda'],
  legal: ['balanza', 'columna', 'prisma', 'horizonte', 'estrella'],
  construccion: ['casa', 'martillo', 'engranaje', 'llave', 'horizonte'],
  tienda: ['bolsa', 'etiqueta', 'estrella', 'flor', 'prisma'],
  educacion: ['libro', 'birrete', 'estrella', 'orbita', 'hoja'],
  tecnologia: ['chip', 'orbita', 'prisma', 'rayo', 'onda'],
  servicios: ['llave', 'engranaje', 'casa', 'orbita', 'horizonte'],
};
const WILD = ['estrella', 'prisma', 'onda', 'horizonte', 'orbita', 'hoja', 'flor', 'engranaje', 'rayo'];

// Pistas por palabra clave (sobre nombre + descripción + servicios): el símbolo de la primera opción.
const MARK_HINTS = [
  ['espiga', /\b(pan|panaderia|panaderias|panadero|harina|trigo|facturas|medialunas|reposteria|pasteleria|tortas|cerveceria|cerveza)\b/],
  ['cubiertos', /\b(restaurante|resto|cocina|parrilla|comida|comidas|menu|cena|bodegon|pizzeria|cafe|cafeteria|catering|bistro|rotiseria)\b/],
  ['balanza', /\b(abogad\w*|juridic\w*|legal|derecho|escriban\w*|mediacion|sucesion\w*)\b/],
  ['columna', /\b(contador\w*|contable|contaduria|estudio contable|impuestos|notaria)\b/],
  ['mancuerna', /\b(gimnasio|crossfit|musculacion|entrenamiento|funcional|pesas)\b/],
  ['rayo', /\b(electric\w*|energia|solar|boxeo|spinning)\b/],
  ['cruz', /\b(clinica|medic\w*|consultorio|odontolog\w*|dentista|kinesi\w*|farmacia|enfermer\w*|pediatr\w*)\b/],
  ['corazon', /\b(psicolog\w*|terapia|cardiolog\w*|nutricion\w*|geriatric\w*|cuidado de mayores)\b/],
  ['tijera', /\b(peluquer\w*|barber\w*|corte|colorista|sastre\w*|costura)\b/],
  ['flor', /\b(spa|estetica|manicur\w*|uñas|unas|depilacion|masajes|floreria|flores)\b/],
  ['casa', /\b(inmobiliaria|arquitect\w*|propiedades|hogar|refaccion\w*|alquiler\w*)\b/],
  ['martillo', /\b(constructora|obra|obras|albanil\w*|carpinter\w*|herreri\w*|durlock|pintura de obra)\b/],
  ['engranaje', /\b(mecanic\w*|taller|metalurg\w*|repuestos|industria\w*)\b/],
  ['llave', /\b(cerraj\w*|plomer\w*|gasista|service|mantenimiento|instalaciones)\b/],
  ['bolsa', /\b(tienda|indumentaria|ropa|kiosco|almacen|supermercado|boutique|calzado|accesorios)\b/],
  ['etiqueta', /\b(outlet|ofertas|importad\w*|mayorista|liquidacion\w*)\b/],
  ['libro', /\b(libreria|biblioteca|idiomas|ingles|clases|apoyo escolar|profesor\w*)\b/],
  ['birrete', /\b(academia|instituto|universidad|capacitacion|escuela|colegio|cursos|bootcamp)\b/],
  ['chip', /\b(software|sistemas|informatica|desarrollo|desarrollador\w*|app|apps|tecnologia|hardware|computacion)\b/],
  ['orbita', /\b(datos|cloud|nube|digital|marketing|redes|consultoria)\b/],
  ['hoja', /\b(vivero|jardin\w*|organic\w*|natural\w*|herboristeria|vegan\w*|paisajismo|dietetica)\b/],
];

const MARK_INFO = {
  espiga: { shape: 'una espiga de trigo', meaning: 'remite a la cosecha, al grano y a lo que se hornea con paciencia', names: ['Espiga Aurora', 'Cosecha Orbital', 'Trigo Cuántico'] },
  cubiertos: { shape: 'un tenedor y una cuchara', meaning: 'hablan de mesa servida y de compartir', names: ['Mesa Futura', 'Cubiertos Estelares', 'Banquete Aurora'] },
  balanza: { shape: 'una balanza de platillos', meaning: 'simboliza equilibrio y justicia, la base de confiarle un tema a alguien', names: ['Equilibrio Boreal', 'Balanza Atlas', 'Fiel de Cristal'] },
  columna: { shape: 'un frontón con cuatro columnas', meaning: 'evoca instituciones sólidas y trabajo serio', names: ['Pórtico Austral', 'Templo Moderno', 'Columnata Norte'] },
  mancuerna: { shape: 'una mancuerna en diagonal', meaning: 'es esfuerzo, constancia y movimiento', names: ['Peso Pluma Eléctrico', 'Fuerza Cuántica', 'Hierro Aurora'] },
  rayo: { shape: 'un rayo', meaning: 'comunica energía, velocidad y respuesta inmediata', names: ['Chispa Futura', 'Voltaje Austral', 'Relámpago Pop'] },
  cruz: { shape: 'una cruz de esquinas redondeadas', meaning: 'es el símbolo universal del cuidado, pero con un trazo amable', names: ['Cruz Amable', 'Salvia Clínica', 'Pulso Sereno'] },
  corazon: { shape: 'un corazón con latido', meaning: 'junta cuidado, cercanía y vitalidad', names: ['Latido Austral', 'Corazón Aurora', 'Pulso Vivo'] },
  tijera: { shape: 'una tijera abierta', meaning: 'es la herramienta del oficio y habla de precisión y mano de artista', names: ['Filo Dorado', 'Tijera Lunar', 'Corte Maestro'] },
  flor: { shape: 'una flor de seis pétalos', meaning: 'sugiere cuidado, crecimiento y delicadeza', names: ['Pétalo Cuántico', 'Flor Aurora', 'Jardín de Cristal'] },
  casa: { shape: 'una casa de trazo limpio', meaning: 'habla de hogar, de proyecto propio y de construir con cimientos', names: ['Hogar Boreal', 'Refugio Atlas', 'Casa Horizonte'] },
  martillo: { shape: 'un martillo inclinado', meaning: 'es la señal inequívoca de obra y de manos que construyen', names: ['Martillo Austral', 'Obra Maestra', 'Golpe Certero'] },
  bolsa: { shape: 'una bolsa de compras sonriente', meaning: 'dice acá se compra sin necesidad de explicarlo', names: ['Bolsa Sonriente', 'Carrito Aurora', 'Vidriera Futura'] },
  etiqueta: { shape: 'una etiqueta de producto', meaning: 'remite a lo que se elige y se lleva a casa', names: ['Etiqueta Estelar', 'Marca de Mostrador', 'Tag Aurora'] },
  libro: { shape: 'un libro abierto', meaning: 'invita a aprender y deja una página lista para escribir', names: ['Página Aurora', 'Libro Abierto', 'Saber Boreal'] },
  birrete: { shape: 'un birrete', meaning: 'es el símbolo de la formación y del objetivo cumplido', names: ['Birrete Estelar', 'Graduación Aurora', 'Cima del Saber'] },
  chip: { shape: 'un chip de circuito', meaning: 'traduce lo técnico en una forma limpia y reconocible', names: ['Circuito Boreal', 'Silicio Aurora', 'Núcleo Cuántico'] },
  orbita: { shape: 'órbitas alrededor de un núcleo', meaning: 'sugieren un sistema donde todo gira en torno a cada cliente', names: ['Órbita Austral', 'Átomo Aurora', 'Sistema Propio'] },
  llave: { shape: 'una llave', meaning: 'comunica soluciones que abren puertas', names: ['Llave Maestra', 'Puerta Aurora', 'Cerradura Cuántica'] },
  engranaje: { shape: 'un engranaje', meaning: 'transmite procesos que encajan y funcionan', names: ['Engranaje Boreal', 'Mecanismo Aurora', 'Rueda Perfecta'] },
  hoja: { shape: 'un brote de dos hojas', meaning: 'habla de crecimiento natural y de algo que recién empieza', names: ['Brote Aurora', 'Raíz Futura', 'Verde Cuántico'] },
  estrella: { shape: 'una estrella de cuatro puntas', meaning: 'es destello y excelencia sin recargar el dibujo', names: ['Destello Austral', 'Estrella Polar', 'Centella Aurora'] },
  prisma: { shape: 'un prisma que descompone la luz', meaning: 'cuenta que un mismo servicio tiene muchas facetas', names: ['Prisma Boreal', 'Cristal Austral', 'Facetas de Autor'] },
  onda: { shape: 'ondas en movimiento', meaning: 'sugieren fluidez, ritmo y algo que nunca se queda quieto', names: ['Marea Aurora', 'Ritmo Líquido', 'Ola Cuántica'] },
  horizonte: { shape: 'un sol sobre el horizonte', meaning: 'sugiere un nuevo comienzo y mirar lejos', names: ['Horizonte Dorado', 'Amanecer Austral', 'Sol de Cristal'] },
};

// Paletas [primario, secundario, acento, modo] por rubro y arquetipo. modo: l=claro, c=crema, d=oscuro.
const PALETTES = {
  gastronomia: {
    afin: [['#b45309', '#7c2d12', '#d97706', 'c'], ['#9a3412', '#78350f', '#ca8a04', 'c'], ['#7f1d1d', '#9a3412', '#d97706', 'c']],
    audaz: [['#dc2626', '#7f1d1d', '#fbbf24', 'l'], ['#0f766e', '#134e4a', '#f97316', 'l'], ['#facc15', '#a16207', '#dc2626', 'd']],
    inesperada: [['#4d7c0f', '#365314', '#f472b6', 'c'], ['#1e3a8a', '#1e40af', '#f59e0b', 'l'], ['#6d28d9', '#4c1d95', '#fb923c', 'l']],
  },
  salud: {
    afin: [['#0e7490', '#0f766e', '#16a34a', 'l'], ['#0369a1', '#075985', '#14b8a6', 'l'], ['#047857', '#065f46', '#38bdf8', 'l']],
    audaz: [['#e11d48', '#9f1239', '#0ea5e9', 'l'], ['#7c3aed', '#5b21b6', '#34d399', 'l'], ['#2563eb', '#1e3a8a', '#fbbf24', 'l']],
    inesperada: [['#c2410c', '#7c2d12', '#14b8a6', 'c'], ['#be185d', '#831843', '#10b981', 'l'], ['#134e4a', '#0f766e', '#fde047', 'd']],
  },
  belleza: {
    afin: [['#a8326b', '#6b2145', '#c08a4b', 'l'], ['#9d174d', '#831843', '#d4a373', 'c'], ['#7e22ce', '#581c87', '#e9b872', 'l']],
    audaz: [['#d4af37', '#a8801c', '#f5e6c8', 'd'], ['#db2777', '#9d174d', '#22d3ee', 'l'], ['#f472b6', '#be185d', '#fde68a', 'd']],
    inesperada: [['#166534', '#14532d', '#f9a8d4', 'c'], ['#1e3a8a', '#312e81', '#fda4af', 'l'], ['#b45309', '#78350f', '#a78bfa', 'c']],
  },
  fitness: {
    afin: [['#ea580c', '#c2410c', '#facc15', 'd'], ['#dc2626', '#991b1b', '#fbbf24', 'd'], ['#f97316', '#9a3412', '#22d3ee', 'd']],
    audaz: [['#84cc16', '#4d7c0f', '#f5f5f4', 'd'], ['#22d3ee', '#0e7490', '#f472b6', 'd'], ['#e11d48', '#be123c', '#a3e635', 'd']],
    inesperada: [['#6d28d9', '#4c1d95', '#fb923c', 'l'], ['#0f766e', '#115e59', '#fde047', 'l'], ['#1d4ed8', '#1e3a8a', '#fb7185', 'l']],
  },
  legal: {
    afin: [['#1e3a5f', '#8a6d3b', '#a8803c', 'c'], ['#14532d', '#365314', '#b08d57', 'c'], ['#7f1d1d', '#451a1a', '#a8803c', 'c']],
    audaz: [['#0f172a', '#1e293b', '#38bdf8', 'l'], ['#1d4ed8', '#1e3a8a', '#f59e0b', 'l'], ['#be123c', '#881337', '#0f172a', 'l']],
    inesperada: [['#0f766e', '#134e4a', '#e11d48', 'c'], ['#92400e', '#451a03', '#0ea5e9', 'c'], ['#374151', '#111827', '#f59e0b', 'l']],
  },
  construccion: {
    afin: [['#b45309', '#374151', '#f59e0b', 'l'], ['#92400e', '#44403c', '#eab308', 'c'], ['#475569', '#1e293b', '#f97316', 'l']],
    audaz: [['#facc15', '#ca8a04', '#f5f5f4', 'd'], ['#ea580c', '#1f2937', '#fde047', 'd'], ['#0369a1', '#0c4a6e', '#fb923c', 'l']],
    inesperada: [['#15803d', '#14532d', '#f59e0b', 'c'], ['#7c3aed', '#4c1d95', '#facc15', 'l'], ['#be123c', '#4c0519', '#94a3b8', 'l']],
  },
  tienda: {
    afin: [['#4f46e5', '#0e7490', '#e11d48', 'l'], ['#0f766e', '#115e59', '#f59e0b', 'l'], ['#c2410c', '#9a3412', '#0ea5e9', 'l']],
    audaz: [['#e11d48', '#9f1239', '#fbbf24', 'l'], ['#7c3aed', '#5b21b6', '#f472b6', 'l'], ['#fde047', '#a16207', '#f87171', 'd']],
    inesperada: [['#065f46', '#064e3b', '#fb923c', 'c'], ['#1e40af', '#1e3a8a', '#fda4af', 'c'], ['#a21caf', '#701a75', '#a3e635', 'l']],
  },
  educacion: {
    afin: [['#2563eb', '#6d28d9', '#d97706', 'l'], ['#1d4ed8', '#0f766e', '#f59e0b', 'l'], ['#0369a1', '#3730a3', '#ea580c', 'l']],
    audaz: [['#f97316', '#c2410c', '#2563eb', 'l'], ['#db2777', '#9d174d', '#facc15', 'l'], ['#16a34a', '#166534', '#7c3aed', 'l']],
    inesperada: [['#7f1d1d', '#450a0a', '#fbbf24', 'c'], ['#0f766e', '#134e4a', '#f472b6', 'c'], ['#312e81', '#1e1b4b', '#34d399', 'd']],
  },
  tecnologia: {
    afin: [['#6366f1', '#0891b2', '#22d3ee', 'd'], ['#38bdf8', '#2563eb', '#a78bfa', 'd'], ['#2563eb', '#1e40af', '#06b6d4', 'l']],
    audaz: [['#a3e635', '#65a30d', '#22d3ee', 'd'], ['#f43f5e', '#be123c', '#facc15', 'd'], ['#e879f9', '#a21caf', '#22d3ee', 'd']],
    inesperada: [['#b45309', '#78350f', '#2dd4bf', 'c'], ['#166534', '#14532d', '#fde047', 'c'], ['#be185d', '#831843', '#38bdf8', 'l']],
  },
  servicios: {
    afin: [['#0f766e', '#1e3a5f', '#d97706', 'l'], ['#1d4ed8', '#0f172a', '#f59e0b', 'l'], ['#334155', '#0f766e', '#f97316', 'l']],
    audaz: [['#ea580c', '#9a3412', '#0f766e', 'l'], ['#7c3aed', '#4c1d95', '#2dd4bf', 'l'], ['#e11d48', '#881337', '#0ea5e9', 'l']],
    inesperada: [['#365314', '#1a2e05', '#fb7185', 'c'], ['#0c4a6e', '#0f172a', '#fcd34d', 'c'], ['#9a3412', '#431407', '#38bdf8', 'c']],
  },
};
const ARCH = ['afin', 'audaz', 'inesperada'];

// Tipografías de Google Fonts. Cada categoría: pares [heading, body]; FONT_FEEL describe el carácter del heading.
const FONT_PAIRS = {
  serif: [['Playfair Display', 'Lato'], ['Cormorant Garamond', 'Montserrat'], ['Merriweather', 'Public Sans'], ['Lora', 'Raleway'], ['Libre Baskerville', 'Karla'], ['DM Serif Display', 'DM Sans'], ['Fraunces', 'Manrope']],
  sans: [['Poppins', 'Open Sans'], ['Montserrat', 'Inter'], ['Outfit', 'Inter'], ['Plus Jakarta Sans', 'Inter'], ['Manrope', 'Inter'], ['Urbanist', 'Nunito']],
  strong: [['Oswald', 'Inter'], ['Barlow Condensed', 'Barlow'], ['Archivo', 'Inter'], ['Roboto Slab', 'Roboto'], ['Rubik', 'Karla'], ['Bebas Neue', 'Inter']],
  friendly: [['Nunito', 'Nunito'], ['Quicksand', 'Nunito'], ['Fredoka', 'Nunito'], ['Comfortaa', 'Nunito'], ['Poppins', 'Nunito']],
  tech: [['Space Grotesk', 'Inter'], ['IBM Plex Sans', 'IBM Plex Sans'], ['Sora', 'Inter'], ['Syne', 'Work Sans'], ['Bricolage Grotesque', 'Inter']],
};
const FONT_FEEL = {
  'Playfair Display': 'la serifa de contraste suma elegancia y oficio', 'Cormorant Garamond': 'la serifa fina y editorial suma delicadeza',
  Merriweather: 'la serifa robusta se lee con claridad y transmite seriedad', Lora: 'la serifa cálida suma cercanía sin perder formalidad',
  'Libre Baskerville': 'la serifa clásica suma reputación', 'DM Serif Display': 'la serifa de titular suma personalidad', Fraunces: 'la serifa blanda suma carácter propio',
  Poppins: 'la geométrica amable suma un aire moderno', Montserrat: 'la geométrica urbana suma seguridad', Outfit: 'la geométrica limpia suma actualidad',
  'Plus Jakarta Sans': 'la sans moderna suma profesionalismo', Manrope: 'la sans serena suma precisión', Urbanist: 'la sans suave suma un tono contemporáneo',
  Oswald: 'la condensada potente suma presencia', 'Barlow Condensed': 'la condensada firme suma ritmo deportivo', Archivo: 'la grotesca sólida suma contundencia',
  'Roboto Slab': 'la slab firme suma un aire de obra bien hecha', Rubik: 'la sans de esquinas suaves suma presencia amable', 'Bebas Neue': 'las mayúsculas condensadas suman impacto',
  Nunito: 'la redondeada suma cercanía', Quicksand: 'la redondeada ligera suma simpatía', Fredoka: 'la redondeada suma un toque juguetón', 'Comfortaa': 'la redondeada generosa suma alegría',
  'Space Grotesk': 'la grotesca de aire técnico suma futuro', 'IBM Plex Sans': 'la sans técnica suma rigor', Sora: 'la sans amplia suma un aire futurista',
  Syne: 'la sans de formas poco convencionales suma personalidad', 'Bricolage Grotesque': 'la grotesca con carácter suma originalidad',
};
const FONT_WHITELIST = new Set(Object.values(FONT_PAIRS).flat(2));
const SECTOR_FONT_CHAR = {
  gastronomia: ['serif', 'friendly'], salud: ['sans', 'friendly'], belleza: ['serif', 'sans'], fitness: ['strong', 'sans'], legal: ['serif', 'sans'],
  construccion: ['strong', 'serif'], tienda: ['sans', 'friendly'], educacion: ['friendly', 'sans'], tecnologia: ['tech', 'sans'], servicios: ['sans', 'serif'],
};
const TONE_STYLE_PREF = {
  cercano: ['isotipo', 'tipografico', 'emblema', 'monograma'],
  profesional: ['monograma', 'emblema', 'tipografico', 'isotipo'],
  premium: ['monograma', 'tipografico', 'emblema', 'isotipo'],
  divertido: ['isotipo', 'emblema', 'tipografico', 'monograma'],
};
const STYLE_DESC = {
  monograma: 'un monograma contundente', emblema: 'un emblema compacto', isotipo: 'un símbolo limpio y grande', tipografico: 'un wordmark con el nombre al frente',
};
const STYLE_LEAD = { monograma: 'Monograma con', emblema: 'Emblema con', isotipo: 'Isotipo de', tipografico: 'Wordmark con' };
const CONCEPT_END = {
  afin: 'que habla el idioma del rubro', audaz: 'con un contraste que se hace notar', inesperada: 'en una combinación que nadie espera',
};
const GENERIC_WORDS = new Set([
  'estudio', 'taller', 'centro', 'clinica', 'consultorio', 'panaderia', 'restaurante', 'resto', 'cafeteria', 'gimnasio', 'tienda', 'kiosco', 'instituto',
  'academia', 'agencia', 'grupo', 'servicios', 'casa', 'boutique', 'salon', 'peluqueria', 'ferreteria', 'carniceria', 'libreria', 'juridico',
]);
const ARTICLES = new Set(['la', 'el', 'los', 'las', 'de', 'del', 'y', 'e', 'the', 'un', 'una', 'en', 'al']);

/* ============================================================ contexto del negocio ============================================================ */

function monogramOf(name) {
  const words = String(name).split(/[\s\-_/&+.,]+/).filter(Boolean);
  const sig = words.filter((w) => !ARTICLES.has(norm(w)));
  const pool = sig.filter((w) => !GENERIC_WORDS.has(norm(w)));
  const use = pool.length ? pool : sig.length ? sig : words;
  const letters = use.slice(0, 2).map((w) => (w.match(/\p{L}/u) || [''])[0].toUpperCase()).join('');
  return letters || 'M';
}

function makeCtx(brief = {}, vision = null) {
  const b = brief && typeof brief === 'object' ? brief : {};
  const name = cleanText(b.businessName, 40) || 'Tu marca';
  const sector = SECTORS.includes(b.sector) ? b.sector : 'servicios';
  const tone = TONES.includes(b.tone) ? b.tone : 'profesional';
  const audience = lowerFirst(stripEnd(cleanText(strOf(b.audience), 90)));
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => stripEnd(cleanText(strOf(x), 70))).filter(Boolean);
  const diffs = list(b.differentiators);
  const services = list(b.services);
  const description = cleanText(b.description, 300);
  const colors = b.colors && typeof b.colors === 'object' ? b.colors : {};
  const clientPrimary = hex(colors.primary, null);
  const clientSecondary = hex(colors.secondary, null);
  const textAll = norm([name, description, ...services].join(' '));
  const hint = (MARK_HINTS.find(([, re]) => re.test(textAll)) || [])[0] || null;
  const v = vision && typeof vision === 'object' ? vision : {};
  const allowedNums = new Set((JSON.stringify(b).match(/\d+/g) || []));
  return {
    name, sector, tone, audience, diffs, services, description, clientPrimary, clientSecondary, hint, allowedNums,
    seed: `${norm(name)}|${sector}`, visionName: cleanText(v.name, 50), visionStyle: String(v.style || ''),
    brief: b,
  };
}

/* ============================================================ paletas ============================================================ */

function bgFor(mode, primary, secondary) {
  if (mode === 'd') return mix('#0d1014', primary, 0.1);
  if (mode === 'c') return mix('#fffaf0', secondary, 0.045);
  return mix('#ffffff', primary, 0.035);
}
function textFor(bg, primary) {
  return lum(bg) < 0.25 ? mix('#f4f6f8', primary, 0.06) : mix('#0b0f14', primary, 0.14);
}

/** Ajusta una paleta para cumplir AA: text/bg, primary/bg y secondary/bg >= 4.5; accent/bg >= 3. `lock` fija el primario del cliente. */
export function fitPalette(p, lock = false) {
  let primary = hex(p.primary, '#1e3a5f');
  let bg = hex(p.bg, '#ffffff');
  if (lock && contrast(primary, bg) < 4.5) {
    const alts = [mix('#ffffff', primary, 0.035), mix('#fffaf0', primary, 0.05), mix('#0d1014', primary, 0.1), '#ffffff', '#0b0d12'];
    bg = alts.find((c) => contrast(primary, c) >= 4.5) || (contrast(primary, '#ffffff') >= contrast(primary, '#000000') ? '#ffffff' : '#000000');
  }
  if (!lock) primary = ensure(primary, bg, 4.5);
  const secondary = ensure(hex(p.secondary, mix(primary, lum(bg) < 0.25 ? '#ffffff' : '#000000', 0.35)), bg, 4.5);
  const accent = ensure(hex(p.accent, fromHsl(toHsl(primary).h + 150, 0.65, 0.5)), bg, 3);
  const text = ensure(hex(p.text, textFor(bg, primary)), bg, 4.5);
  return { primary, secondary, accent, bg, text };
}

function buildPalette([primary, secondary, accent, mode]) {
  const bg = bgFor(mode, primary, secondary);
  return fitPalette({ primary, secondary, accent, bg, text: textFor(bg, primary) });
}

function clientPalette(ctx) {
  const primary = ctx.clientPrimary;
  const h = toHsl(primary).h;
  const secondary = ctx.clientSecondary || mix(primary, lum(primary) > 0.6 ? '#000000' : '#000000', 0.4);
  const accent = fromHsl(h + 150, 0.65, 0.5);
  const bg = bgFor('l', primary, secondary);
  return fitPalette({ primary, secondary, accent, bg, text: textFor(bg, primary) }, true);
}

/** Paleta determinista del slot (0 afín, 1 audaz, 2 inesperada), distinta de los primarios ya tomados. */
function pickPalette(ctx, slot, takenPrimaries) {
  if (slot === 0 && ctx.clientPrimary) return clientPalette(ctx);
  const own = rotate(PALETTES[ctx.sector][ARCH[slot]], ch(ctx.seed, `pal${slot}`));
  const others = ARCH.filter((_, i) => i !== slot).flatMap((a, i) => rotate(PALETTES[ctx.sector][a], ch(ctx.seed, `pal${slot}o${i}`)));
  let fallback = null;
  for (const cand of [...own, ...others]) {
    const pal = buildPalette(cand);
    fallback ||= pal;
    if (takenPrimaries.every((t) => deltaE(pal.primary, t) >= MIN_DE)) return pal;
  }
  // último recurso: rotar el tono del primario hasta separarlo
  for (let k = 1; k <= 11; k++) {
    const shifted = fromHsl(toHsl(fallback.primary).h + 30 * k, 0.65, 0.4);
    const pal = fitPalette({ ...fallback, primary: shifted, secondary: mix(shifted, '#000000', 0.35), accent: fromHsl(toHsl(shifted).h + 150, 0.65, 0.5) });
    if (takenPrimaries.every((t) => deltaE(pal.primary, t) >= MIN_DE)) return pal;
  }
  return fallback;
}

/* ============================================================ elección de símbolo / estilo / tipografía ============================================================ */

function pickMark(ctx, slot, takenMarks) {
  const L = SECTOR_MARKS[ctx.sector];
  const ordered = rotate(L, ch(ctx.seed, 'mark'));
  let pool;
  if (slot === 0) pool = ctx.hint ? [ctx.hint, ...ordered] : ordered;
  else if (slot === 1) pool = ctx.hint ? [...ordered.filter((m) => m !== ctx.hint)] : ordered.slice(1).concat(ordered[0]);
  else pool = [...rotate(WILD.filter((m) => !L.includes(m)), ch(ctx.seed, 'wild')), ...WILD];
  return pool.find((m) => !takenMarks.has(m)) || MARKS.find((m) => !takenMarks.has(m)) || MARKS[0];
}

function pickStyle(ctx, slot, takenStyles) {
  const pref = TONE_STYLE_PREF[ctx.tone];
  const a = ch(ctx.seed, 'style') % 2, c = ch(ctx.seed, 'style2') % 2;
  const orders = [
    [pref[a], pref[1 - a], pref[2], pref[3]],
    [pref[1 - a], pref[a], pref[3], pref[2]],
    [pref[2 + c], pref[3 - c], pref[0], pref[1]],
  ];
  if (ctx.visionStyle === 'elegante' && slot === 0 && ctx.tone !== 'divertido') orders[0] = ['monograma', 'tipografico', 'emblema', 'isotipo'];
  if (ctx.visionStyle === 'futurista' && slot === 2) orders[2] = ['isotipo', 'monograma', 'emblema', 'tipografico'];
  return orders[slot].find((s) => !takenStyles.has(s)) || orders[slot][0];
}

function pickFonts(ctx, slot, takenHeadings) {
  const base = SECTOR_FONT_CHAR[ctx.sector];
  let cat;
  if (slot < 2) cat = base[slot];
  else {
    const pool = ctx.tone === 'premium' ? ['serif', 'sans', 'tech'] : ctx.tone === 'divertido' ? ['friendly', 'strong', 'tech'] : ['sans', 'serif', 'strong', 'tech'];
    const cands = rotate(pool.filter((c) => !base.includes(c)), ch(ctx.seed, 'fc'));
    cat = (ctx.visionStyle === 'futurista' && !base.includes('tech')) ? 'tech' : (cands[0] || 'sans');
  }
  const pairs = rotate(FONT_PAIRS[cat], ch(ctx.seed, `font${slot}`));
  const all = Object.values(FONT_PAIRS).flat();
  const pair = pairs.find((p) => !takenHeadings.has(p[0])) || all.find((p) => !takenHeadings.has(p[0])) || pairs[0];
  return { heading: pair[0], body: pair[1] };
}

/* ============================================================ textos (nombre, concepto, justificación) ============================================================ */

const pickVar = (arr, ctx, c) => arr[ch(ctx.seed, c) % arr.length];

function proposalName(ctx, mark, slot, usedNames) {
  const names = rotate(MARK_INFO[mark].names, ch(ctx.seed, `name${slot}`));
  return names.find((n) => !usedNames.has(n)) || names[0];
}

function conceptText(style, mark, arch) {
  return `${STYLE_LEAD[style]} ${MARK_INFO[mark].shape} ${CONCEPT_END[arch]}.`;
}

function rationaleText(ctx, spec, slot) {
  const arch = ARCH[slot];
  const info = MARK_INFO[spec.mark];
  const label = SECTOR_LABEL[ctx.sector];
  const audText = ctx.audience ? `tu público (${ctx.audience})` : 'tu público';
  const styleDesc = STYLE_DESC[spec.style];
  const tag = `r${slot}`;

  const leads = {
    afin: [`Para ${ctx.name} elegimos ${info.shape}`, `Para ${ctx.name} arrancamos por lo más reconocible con ${info.shape}`],
    audaz: [`Acá rompemos el molde con ${info.shape}`, `Para ${ctx.name} apostamos fuerte por ${info.shape}`],
    inesperada: [`La jugada inesperada para ${ctx.name} va por ${info.shape}`, `En ${ctx.name} nos fuimos por el camino menos obvio con ${info.shape}`],
  }[arch];
  const tails = {
    afin: [`así ${ctx.name} se reconoce como ${SECTOR_NOUN[ctx.sector]} de un vistazo, incluso en la pestaña del navegador`,
      `un código que ${audText} ya conoce en el rubro de ${label}`],
    audaz: [`pero resuelto como ${styleDesc}, para que ${ctx.name} no se confunda con nadie`,
      `llevado a ${styleDesc} para que ${ctx.name} se grabe en la memoria`],
    inesperada: [`algo que no se espera de ${SECTOR_NOUN[ctx.sector]}, y justamente por eso se recuerda`,
      `un cruce poco habitual con el rubro de ${label} que da de qué hablar sin perder el hilo de ${SECTOR_IDEA[ctx.sector]}`],
  }[arch];
  const s1 = `${pickVar(leads, ctx, `${tag}a`)}: ${info.meaning}, ${pickVar(tails, ctx, `${tag}b`)}.`;

  const p = spec.palette;
  const n1 = colorName(p.primary), n2 = colorName(p.accent);
  const colors = n1 === n2 ? `${n1} (${feelOf(n1)}) en dos tonos` : `${n1} (${feelOf(n1)}) con ${n2} (${feelOf(n2)})`;
  const bgDesc = lum(p.bg) < 0.2 ? 'oscuro' : (rgbOf(p.bg)[0] - rgbOf(p.bg)[2] > 8 ? 'crema' : 'claro');
  const palTail = {
    afin: `es el registro que el rubro ya usa, así que se lee como familiar y confiable, con un tono ${TONE_ADJ[ctx.tone]} que acompaña lo que definiste`,
    audaz: `un contraste alto y deliberado, pensado para que ${ctx.name} destaque entre los logos de ${label} sin perder legibilidad`,
    inesperada: `una pareja que casi nadie usa en ${label}, defendible porque suma ${feelOf(n1)} por un lado y ${feelOf(n2)} por el otro, y se lee con contraste suficiente`,
  }[arch];
  const s2 = `La paleta combina ${colors} sobre un fondo ${bgDesc}: ${palTail}.`;

  const styleNote = {
    monograma: `el monograma ${spec.monogram} funciona solo como ícono`,
    emblema: 'el emblema se recorta limpio en redes y en la pestaña',
    isotipo: 'el símbolo funciona solo, hasta como favicon',
    tipografico: `el wordmark pone el nombre ${ctx.name} bien al frente`,
  }[spec.style];
  const s3 = `${spec.fonts.heading} para los títulos y ${spec.fonts.body} para el texto: ${FONT_FEEL[spec.fonts.heading] || 'una pareja tipográfica equilibrada'}, y ${styleNote}.`;

  let s4 = '';
  if (ctx.diffs[0]) {
    s4 = {
      afin: `Y como lo que más te distingue es «${ctx.diffs[0]}», la propuesta lo acompaña sin competir con tu mensaje.`,
      audaz: `Y como lo que más te distingue es «${ctx.diffs[0]}», la propuesta le da volumen visual sin taparlo.`,
      inesperada: `Y como lo que más te distingue es «${ctx.diffs[0]}», este camino deja ese diferencial como protagonista del resto del sitio.`,
    }[arch];
  } else if (ctx.services[0]) {
    s4 = `Y si lo primero que mostrás es «${ctx.services[0]}», el logo le deja lugar para brillar en el resto del sitio.`;
  } else if (ctx.visionName) {
    s4 = `Todo va en la línea del concepto «${ctx.visionName}» que armamos para tu sitio.`;
  }
  return voseo([s1, s2, s3, s4].filter(Boolean).join(' '));
}

/* ============================================================ opciones ============================================================ */

/** Especificación determinista (sin SVG) del slot. `taken` = { marks:Set, styles:Set, primaries:[], headings:Set, names:Set }. */
function fallbackSpec(ctx, slot, taken) {
  const mark = pickMark(ctx, slot, taken.marks);
  const style = pickStyle(ctx, slot, taken.styles);
  const palette = pickPalette(ctx, slot, taken.primaries);
  const fonts = pickFonts(ctx, slot, taken.headings);
  const spec = { name: proposalName(ctx, mark, slot, taken.names), style, mark, palette, fonts, monogram: monogramOf(ctx.name) };
  spec.concept = conceptText(style, mark, ARCH[slot]);
  spec.rationale = rationaleText(ctx, spec, slot);
  return spec;
}

function remember(taken, spec) {
  taken.marks.add(spec.mark); taken.styles.add(spec.style); taken.primaries.push(spec.palette.primary);
  taken.headings.add(spec.fonts.heading); taken.names.add(spec.name);
}
const newTaken = () => ({ marks: new Set(), styles: new Set(), primaries: [], headings: new Set(), names: new Set() });

function finalize(spec, ctx, idx, source) {
  const container = CONTAINERS[ch(ctx.seed, `cont${idx}`) % CONTAINERS.length];
  const backdrop = ['circle', 'squircle', 'none'][ch(ctx.seed, `back${idx}`) % 3];
  const base = {
    style: spec.style, mark: spec.mark, name: ctx.name, monogram: spec.monogram, palette: spec.palette, fonts: spec.fonts,
    container, backdrop,
  };
  const svg = sanitizeSvg(renderLogo(base));
  const icon = sanitizeSvg(renderIcon(base));
  if (!svg || !icon || svg.length > 6144) throw new Error('el generador produjo un SVG inválido');
  return {
    id: `logo-${idx + 1}`, name: spec.name, concept: spec.concept, rationale: spec.rationale,
    palette: { ...spec.palette }, fonts: { ...spec.fonts }, style: spec.style, mark: spec.mark, monogram: spec.monogram,
    svg, icon, source,
  };
}

/* ============================================================ IA: especificación validada ============================================================ */

const TOMAS_SYSTEM = [
  'Sos Tomas, diseñador visionario y excéntrico de nacimiento: pensás en 2040, tu entusiasmo es contagioso y tus metáforas son atrevidas.',
  'Aun así sos respetuoso con los hechos del cliente y con la accesibilidad (contraste AA).',
  'Escribís en español rioplatense (voseo). Proponés logos para un negocio que NO tiene logo.',
  'REGLAS: NUNCA devuelvas SVG, HTML, URLs ni código; solo una especificación en JSON. No inventes datos del negocio (precios, años, premios, cifras, clientes, ubicaciones).',
  'La justificación (rationale) debe apoyarse en hechos del brief (rubro, público, tono, diferenciales, nombre) y explicar por qué la forma, la paleta y la tipografía le quedan bien a ESE negocio.',
].join(' ');

function aiPrompt(ctx) {
  const facts = {
    negocio: ctx.name, rubro: ctx.sector, tono: ctx.tone, descripcion: ctx.description, publico: ctx.audience,
    servicios: ctx.services, diferenciales: ctx.diffs, colorPrimarioDelCliente: ctx.clientPrimary || null, conceptoCreativo: ctx.visionName || null,
  };
  const fonts = [...FONT_WHITELIST].join(', ');
  return [
    `Datos del cliente (usalos como base, sin inventar nada más):\n${JSON.stringify(facts)}`,
    'Devolvé EXACTAMENTE este JSON con 3 propuestas distintas entre sí (forma, estilo, paleta y tipografías diferentes):',
    '{"options":[{"name":"título creativo corto","concept":"una frase","rationale":"2 a 4 frases en voseo que justifiquen con hechos del brief","style":"...","mark":"...","monogram":"1-2 letras del nombre","palette":{"primary":"#rrggbb","secondary":"#rrggbb","accent":"#rrggbb","bg":"#rrggbb","text":"#rrggbb"},"fonts":{"heading":"...","body":"..."}}, {...}, {...}]}',
    `style ∈ [${LOGO_STYLES.join(', ')}]. mark ∈ [${MARKS.join(', ')}]. fonts ∈ [${fonts}].`,
    'Opción 1: afín al rubro (reconocible). Opción 2: audaz. Opción 3: inesperada pero defendible.',
    ctx.clientPrimary ? `El cliente ya eligió el color primario ${ctx.clientPrimary}: la opción 1 usa exactamente ese palette.primary; las otras exploran.` : '',
    'Contraste AA: palette.text sobre palette.bg y palette.primary sobre palette.bg deben tener ratio >= 4.5. En rationale y concept: sin números, sin precios, sin HTML, sin enlaces.',
  ].filter(Boolean).join('\n');
}

const FORBIDDEN_TEXT = /[<>`{}\\]|https?:|www\.|\.(?:com|ar|net|org)\b|@|[$€£%]|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i;
const INVENTED_CLAIMS = /\b(premiad\w*|galardon\w*|l[ií]der(?:es)? del mercado|n[úu]mero uno|a[nñ]os de (?:experiencia|trayectoria)|garantizad\w*|certificad\w*|el mejor del|desde el a[nñ]o)\b/i;

function textOk(v, field, min, max, ctx) {
  if (typeof v !== 'string') return { reason: `${field} no es texto` };
  const t = v.replace(/\s+/g, ' ').trim();
  if (t.length < min) return { reason: `${field} demasiado corto` };
  if (t.length > max) return { reason: `${field} demasiado largo` };
  if (FORBIDDEN_TEXT.test(t)) return { reason: `${field} contiene HTML, enlaces o símbolos no permitidos` };
  if ((t.match(/\d+/g) || []).some((x) => !ctx.allowedNums.has(x))) return { reason: `${field} inventa números` };
  if (INVENTED_CLAIMS.test(t) && !INVENTED_CLAIMS.test(ctx.description + ctx.diffs.join(' '))) return { reason: `${field} afirma datos que el brief no tiene` };
  return { value: t };
}
const sentences = (t) => t.split(/(?<=[.!?])\s+/).filter((s) => s.replace(/[^\p{L}]/gu, '').length > 2);

/** Valida una opción cruda de la IA. -> { ok:true, spec } | { ok:false, reason }. */
export function validateAiOption(raw, ctx) {
  const bad = (reason) => ({ ok: false, reason });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('no es un objeto');
  if (!LOGO_STYLES.includes(raw.style)) return bad('style fuera del catálogo');
  if (!MARKS.includes(raw.mark)) return bad('mark fuera del catálogo');
  const nm = textOk(raw.name, 'name', 3, 40, ctx); if (nm.reason) return bad(nm.reason);
  const cc = textOk(raw.concept, 'concept', 10, 180, ctx); if (cc.reason) return bad(cc.reason);
  const ra = textOk(raw.rationale, 'rationale', 60, 700, ctx); if (ra.reason) return bad(ra.reason);
  let sents = sentences(ra.value);
  if (sents.length < 2) return bad('rationale con menos de 2 frases');
  sents = sents.slice(0, 4);
  const pal = raw.palette;
  if (!pal || typeof pal !== 'object') return bad('palette ausente');
  const P = {};
  for (const k of ['primary', 'secondary', 'accent', 'bg', 'text']) {
    const h = hex(pal[k], null);
    if (!h) return bad(`palette.${k} no es un hex válido`);
    P[k] = h;
  }
  const f = raw.fonts;
  if (!f || !FONT_WHITELIST.has(f.heading) || !FONT_WHITELIST.has(f.body)) return bad('fonts fuera de la lista de Google Fonts admitida');
  let mono = typeof raw.monogram === 'string' ? raw.monogram.trim().toUpperCase() : '';
  if (!/^\p{L}{1,2}$/u.test(mono)) mono = monogramOf(ctx.name);
  const lock = false;
  const fitted = fitPalette(P, lock);
  if (contrast(fitted.text, fitted.bg) < 4.5 || contrast(fitted.primary, fitted.bg) < 4.5) return bad('la paleta no cumple contraste AA');
  return {
    ok: true,
    spec: {
      name: nm.value, concept: cc.value, rationale: voseo(sents.join(' ')), style: raw.style, mark: raw.mark, palette: fitted,
      fonts: { heading: f.heading, body: f.body }, monogram: mono,
    },
  };
}

/* ============================================================ proposeLogos ============================================================ */

/** Fuerza el primario del cliente en una paleta ya validada (conserva secundario/acento si siguen siendo accesibles). */
function lockClient(palette, ctx) {
  return fitPalette({ ...palette, primary: ctx.clientPrimary, secondary: ctx.clientSecondary || palette.secondary }, true);
}

export async function proposeLogos(brief, vision, llm) {
  const notes = [];
  proposeLogos.lastNotes = notes;
  const ctx = makeCtx(brief, vision);
  const taken = newTaken();
  const specs = [null, null, null];
  const sources = ['fallback', 'fallback', 'fallback'];

  let rawOptions = null;
  if (llm && llm.available && typeof llm.completeJSON === 'function') {
    try {
      const res = await Promise.race([
        llm.completeJSON({ system: TOMAS_SYSTEM, prompt: aiPrompt(ctx) }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo de espera agotado')), 90000).unref?.()),
      ]);
      rawOptions = Array.isArray(res) ? res : (res && (res.options || res.logos || res.propuestas));
      if (!Array.isArray(rawOptions)) { notes.push('la IA no devolvió una lista de opciones; se usaron las propuestas deterministas'); rawOptions = null; }
    } catch (e) {
      notes.push(`la IA falló (${redact(e?.message || e)}); se usaron las propuestas deterministas`);
    }
  } else {
    notes.push('IA no disponible: propuestas deterministas');
  }

  for (let i = 0; i < 3; i++) {
    let spec = null;
    if (rawOptions && rawOptions[i] !== undefined) {
      const v = validateAiOption(rawOptions[i], ctx);
      if (!v.ok) notes.push(`logo-${i + 1}: opción de IA descartada (${v.reason})`);
      else {
        const s = v.spec;
        if (i === 0 && ctx.clientPrimary) s.palette = lockClient(s.palette, ctx);
        if (taken.marks.has(s.mark)) notes.push(`logo-${i + 1}: opción de IA descartada (símbolo repetido)`);
        else if (taken.primaries.some((t) => deltaE(s.palette.primary, t) < MIN_DE * 0.75)) notes.push(`logo-${i + 1}: opción de IA descartada (paleta demasiado parecida a otra)`);
        else if (i > 0 && ctx.clientPrimary && deltaE(s.palette.primary, ctx.clientPrimary) < MIN_DE * 0.75) notes.push(`logo-${i + 1}: opción de IA descartada (paleta demasiado parecida al color del cliente)`);
        else if (taken.headings.has(s.fonts.heading)) notes.push(`logo-${i + 1}: opción de IA descartada (tipografía repetida)`);
        else { spec = s; sources[i] = 'ai'; }
      }
    } else if (rawOptions) {
      notes.push(`logo-${i + 1}: la IA no devolvió esta opción`);
    }
    if (!spec) spec = fallbackSpec(ctx, i, taken);
    specs[i] = spec;
    remember(taken, spec);
  }

  // El color del cliente se respeta tal cual en una de las opciones.
  if (ctx.clientPrimary && !specs.some((s) => s.palette.primary === ctx.clientPrimary)) {
    specs[0] = { ...specs[0], palette: lockClient(specs[0].palette, ctx) };
  }

  return specs.map((s, i) => finalize(s, ctx, i, sources[i]));
}
proposeLogos.lastNotes = [];

/* ============================================================ sanitizeSvg ============================================================ */

const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs', 'linearGradient', 'radialGradient', 'stop', 'text', 'tspan', 'title', 'desc', 'clipPath', 'mask']);
const SHAPE_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'text']);
const TEXT_TAGS = new Set(['text', 'tspan', 'title', 'desc']);
const SVG_ATTRS = new Set([
  'id', 'xmlns', 'viewBox', 'width', 'height', 'preserveAspectRatio', 'role', 'aria-label', 'aria-hidden',
  'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'fx', 'fy', 'fr', 'dx', 'dy', 'd', 'points', 'transform',
  'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'color', 'style',
  'gradientUnits', 'gradientTransform', 'spreadMethod', 'offset', 'stop-color', 'stop-opacity', 'href', 'xlink:href',
  'clip-path', 'mask', 'clipPathUnits', 'maskUnits', 'maskContentUnits',
  'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'textLength', 'lengthAdjust',
]);
const STYLE_PROPS = new Set([
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'stroke-dashoffset', 'stroke-opacity', 'opacity', 'stop-color', 'stop-opacity', 'font-family', 'font-size', 'font-weight', 'font-style',
  'letter-spacing', 'text-anchor', 'clip-path', 'mask', 'color',
]);
const MAX_SVG_BYTES = 200 * 1024;
const REF_RE = /^#[A-Za-z_][\w:.-]*$/;

function decodeEntities(v) {
  let bad = false;
  const out = v.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const l = e.toLowerCase();
    if (l === 'amp') return '&';
    if (l === 'lt') return '<';
    if (l === 'gt') return '>';
    if (l === 'quot') return '"';
    if (l === 'apos') return "'";
    const cp = l[1] === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10);
    if (!(cp >= 32 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff)) { bad = true; return ''; }
    return String.fromCodePoint(cp);
  });
  if (/&/.test(out.replace(/&(?!\S*;)/g, ''))) bad = true; // entidad no reconocida
  return { value: out, bad };
}
const escAttr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const escText = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlsOk(v) {
  const re = /url\(\s*([^)]*)\)/gi;
  let m;
  while ((m = re.exec(v))) {
    const inner = m[1].trim().replace(/^['"]|['"]$/g, '').trim();
    if (!REF_RE.test(inner)) return false;
  }
  return true;
}
const DANGEROUS = /javascript:|vbscript:|data:|expression\s*\(|@import|behavior\s*:|-moz-binding|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i;

function cleanStyle(v) {
  const kept = [];
  for (const decl of v.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (!STYLE_PROPS.has(prop) || !val || val.length > 200 || DANGEROUS.test(val) || /[<>\\{}]/.test(val) || !urlsOk(val)) continue;
    kept.push(`${prop}:${val}`);
  }
  return kept.join(';');
}

function cleanAttr(name, raw) {
  if (!SVG_ATTRS.has(name) || /^on/i.test(name)) return null;
  const dec = decodeEntities(raw);
  if (dec.bad) return null;
  let v = dec.value;
  if (/[<>]/.test(v) || v.length > 8000 || DANGEROUS.test(v)) return null;
  if (name === 'href' || name === 'xlink:href') return REF_RE.test(v.trim()) ? v.trim() : null;
  if (name === 'style') { v = cleanStyle(v); return v || null; }
  if (name === 'id') return /^[A-Za-z_][\w:.-]*$/.test(v) ? v : null;
  if (name === 'd' || name === 'points' || name === 'transform' || name === 'gradientTransform' || name === 'viewBox') {
    return /^[\w\s.,\-+()]*$/.test(v) ? v : null;
  }
  if (name === 'font-family') return /^[\w\s,'"\-]*$/.test(v) ? v : null;
  if (!urlsOk(v)) return null;
  if (v.length > 400) return null;
  return v;
}

function parseAttrs(src) {
  const attrs = [];
  const re = /\s*([^\s=\/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/y;
  let i = 0;
  const s = src.replace(/\s+$/, '');
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m || m[0].length === 0) return null;
    i = re.lastIndex;
    attrs.push([m[1], m[2] ?? m[3] ?? null]);
  }
  return attrs;
}

function sanitizeInner(input) {
  if (typeof input !== 'string' || !input) return null;
  if (Buffer.byteLength(input, 'utf8') > MAX_SVG_BYTES) return null;
  const s = input.replace(/^﻿/, '');
  if (/<!DOCTYPE|<!ENTITY|<!ATTLIST|<!ELEMENT|<!NOTATION/i.test(s) || s.includes('\u0000')) return null;
  const out = [];
  const stack = [];
  let i = 0, count = 0, shapes = 0, rootSeen = false, rootClosed = false;

  const onText = (t, cdata = false) => {
    if (!stack.length) return !/\S/.test(t);
    const top = stack[stack.length - 1];
    if (!top.kept || !TEXT_TAGS.has(top.name)) return true;
    let txt = t;
    if (!cdata) { const d = decodeEntities(t); if (d.bad) return false; txt = d.value; }
    txt = txt.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    if (txt) out.push(escText(txt));
    return true;
  };

  while (i < s.length) {
    const lt = s.indexOf('<', i);
    const end = lt < 0 ? s.length : lt;
    if (end > i && !onText(s.slice(i, end))) return null;
    if (lt < 0) break;
    i = lt;
    if (s.startsWith('<!--', i)) { const e = s.indexOf('-->', i + 4); if (e < 0) return null; i = e + 3; continue; }
    if (s.startsWith('<![CDATA[', i)) { const e = s.indexOf(']]>', i + 9); if (e < 0) return null; if (!onText(s.slice(i + 9, e), true)) return null; i = e + 3; continue; }
    if (s.startsWith('<?', i)) { const e = s.indexOf('?>', i + 2); if (e < 0) return null; i = e + 2; continue; }
    if (s.startsWith('<!', i)) return null;
    let j = i + 1, q = null;
    for (; j < s.length; j++) {
      const c = s[j];
      if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break;
    }
    if (j >= s.length) return null;
    const raw = s.slice(i + 1, j);
    i = j + 1;

    if (raw[0] === '/') {
      const name = raw.slice(1).trim();
      const top = stack.pop();
      if (!top || top.name !== name) return null;
      if (top.kept) out.push(`</${name}>`);
      if (!stack.length) rootClosed = true;
      continue;
    }
    const selfClose = raw.endsWith('/');
    const body = selfClose ? raw.slice(0, -1) : raw;
    const nm = /^([^\s\/>]+)/.exec(body);
    if (!nm) return null;
    const name = nm[1];
    if (!/^[A-Za-z][\w:.-]*$/.test(name)) return null;
    if (++count > 5000) return null;
    if (!stack.length) {
      if (rootClosed || rootSeen) return null;
      if (name !== 'svg') return null;
      rootSeen = true;
    }
    const parentKept = !stack.length || stack[stack.length - 1].kept;
    const kept = parentKept && SVG_TAGS.has(name);
    if (kept) {
      const attrs = parseAttrs(body.slice(name.length));
      if (!attrs) return null;
      const seen = new Set();
      const parts = [];
      let vb = null, width = null, height = null;
      for (const [an, av] of attrs) {
        if (seen.has(an)) continue;
        seen.add(an);
        if (av === null) continue;
        if (name === 'svg' && (an === 'xmlns' || an.startsWith('xmlns:'))) continue;
        const cv = cleanAttr(an, av);
        if (cv === null) continue;
        if (name === 'svg') { if (an === 'viewBox') vb = cv; if (an === 'width') width = cv; if (an === 'height') height = cv; }
        parts.push(`${an}="${escAttr(cv)}"`);
      }
      if (name === 'svg' && stack.length === 0) {
        if (!vb) {
          const w = parseFloat(width), h = parseFloat(height);
          if (!(w > 0 && h > 0)) return null;
          parts.push(`viewBox="0 0 ${w} ${h}"`);
        }
        parts.unshift('xmlns="http://www.w3.org/2000/svg"');
      }
      if (SHAPE_TAGS.has(name)) shapes++;
      out.push(`<${name}${parts.length ? ' ' + parts.join(' ') : ''}${selfClose ? '/' : ''}>`);
    }
    if (!selfClose) stack.push({ name, kept });
    else if (!stack.length) rootClosed = true;
  }
  if (stack.length || !rootSeen || shapes === 0) return null;
  const res = out.join('');
  if (Buffer.byteLength(res, 'utf8') > MAX_SVG_BYTES) return null;
  return res;
}

/**
 * Sanea un SVG con allowlist estricta de elementos y atributos. Elimina scripts, manejadores on*, foreignObject, image, use,
 * href externos, url(http…), @import, DOCTYPE/entidades y estilos peligrosos. Devuelve null si no puede sanearse
 * (mal formado, sin raíz <svg>, sin formas, > 200 KB, DOCTYPE).
 */
export function sanitizeSvg(svg) {
  try { return sanitizeInner(svg); } catch { return null; }
}

/* ============================================================ integración con el brief ============================================================ */

export function applyLogoToBrief(brief, option) {
  const copy = JSON.parse(JSON.stringify(brief && typeof brief === 'object' ? brief : {}));
  const svg = sanitizeSvg(option?.svg);
  if (!option || !svg) return copy;
  const p = option.palette || {};
  copy.logo = {
    kind: 'generated', id: option.id, name: option.name, svg,
    palette: { primary: p.primary, secondary: p.secondary, accent: p.accent, bg: p.bg, text: p.text },
    fonts: { heading: option.fonts?.heading, body: option.fonts?.body }, style: option.style, mark: option.mark,
  };
  const c = copy.colors && typeof copy.colors === 'object' ? copy.colors : {};
  if (!hex(c.primary, null)) {
    copy.colors = { ...c, primary: p.primary, secondary: hex(c.secondary, null) || p.secondary };
  }
  return copy;
}

/**
 * Dado un array de hex dominantes de la imagen subida (orden = dominancia), devuelve {primary, secondary, accent}
 * accesibles sobre fondo claro (primary/secondary >= 4.5, accent >= 3). null si no hay ningún hex válido.
 */
export function paletteFromImageColors(colors) {
  const list = [...new Set((Array.isArray(colors) ? colors : []).slice(0, 64).map((c) => hex(typeof c === 'string' ? c : c?.hex, null)).filter(Boolean))];
  if (!list.length) return null;
  const info = list.map((c, i) => { const t = toHsl(c); return { h: c, i, hue: t.h, s: t.s, l: t.l }; });
  const usable = info.filter((c) => c.l > 0.08 && c.l < 0.94);
  const vivid = usable.filter((c) => c.s >= 0.2);
  const pool = vivid.length ? vivid : usable.length ? usable : info;
  const score = (c) => c.s * 0.5 + (1 - c.i / info.length) * 0.5;
  const best = (arr, far) => arr.filter((c) => far.every((f) => deltaE(c.h, f) >= 20)).sort((a, b) => score(b) - score(a))[0];
  const lead = pool.slice().sort((a, b) => (vivid.length ? score(b) - score(a) : a.l - b.l))[0];
  const primary = ensure(lead.h, '#ffffff', 4.5);
  const hue = toHsl(primary).h;
  const sec = best(usable.length ? usable : info, [primary]);
  const secondary = ensure(sec ? sec.h : mix(primary, '#000000', 0.4), '#ffffff', 4.5);
  const acc = best(vivid.length ? vivid : usable, [primary, secondary]);
  const accent = ensure(acc ? acc.h : fromHsl(hue + 150, 0.62, 0.45), '#ffffff', 3);
  return { primary, secondary, accent };
}
