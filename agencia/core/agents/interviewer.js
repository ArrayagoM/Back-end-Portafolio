// Agente INTERVIEWER: entrevista al comerciante y arma el Brief.
// Sin dependencias. Estado en project.answers ({[qid]:string}); el índice se deriva de las respuestas.

import { intlDigits } from '../phone.js';
import { voseo } from './voseo.js';

export const SECTORS = [
  'gastronomia', 'salud', 'belleza', 'fitness', 'legal', 'construccion',
  'tienda', 'educacion', 'tecnologia', 'servicios',
];
export const TONES = ['cercano', 'profesional', 'premium', 'divertido'];
export const BOLDNESS = ['sobrio', 'atrevido', 'extremo'];
export const CTA_TYPES = ['whatsapp', 'call', 'form', 'reserve'];
export const SECTION_TYPES = ['hero', 'about', 'services', 'benefits', 'testimonials', 'gallery', 'hours', 'faq', 'contact', 'footer'];

export const QUESTIONS = [
  { id: 'q_name', field: 'businessName', required: true,
    question: '¿Cómo se llama tu negocio?',
    hint: 'El nombre tal cual lo conocen tus clientes.', example: 'Panadería La Espiga' },
  { id: 'q_what', field: 'description', required: true,
    question: '¿Qué vendés o qué servicio ofrecés? Contame en pocas palabras a qué se dedica tu negocio.',
    hint: 'Pensá cómo se lo explicarías a alguien que no te conoce.',
    example: 'Hacemos pan artesanal, facturas y tortas por encargo en el barrio de Caballito.' },
  { id: 'q_audience', field: 'audience', required: true,
    question: '¿A quién le vendés? ¿Quiénes son tus clientes ideales?',
    hint: 'Edad, zona, necesidades: lo que sepas de ellos.',
    example: 'Familias del barrio y oficinas cercanas que buscan productos frescos todos los días.' },
  { id: 'q_diff', field: 'differentiators', required: false,
    question: '¿Qué te diferencia de la competencia? ¿Por qué te eligen a vos?',
    hint: 'Podés listar varios puntos, uno por línea o separados por comas.',
    example: 'Masa madre propia, entregas el mismo día, más de 20 años de experiencia' },
  { id: 'q_services', field: 'services', required: true,
    question: 'Listame tus principales servicios o productos, con precio si querés mostrarlo.',
    hint: 'Uno por línea. Formato libre: "Nombre: descripción - $precio". Si no querés mostrar precios, omitilos.',
    example: '- Pan de campo: horneado cada mañana - $2.500\n- Tortas por encargo: desde 8 porciones\n- Medialunas: $400 la unidad' },
  { id: 'q_tone', field: 'tone', required: false,
    question: '¿Cómo querés que suene tu marca? (cercana, profesional, premium, divertida…)',
    hint: 'Elegí el estilo con el que te sentís cómodo hablándole a tus clientes.',
    example: 'Cercana y cálida, como hablar con un vecino.' },
  { id: 'q_colors', field: 'colors', required: false,
    question: '¿Tenés colores de marca o alguno que te guste? Si no, lo decido yo según tu rubro.',
    hint: 'Podés decir nombres de colores o códigos hex (#aabbcc).',
    example: 'Verde oliva y beige' },
  { id: 'q_contact', field: 'contact', required: true,
    question: '¿Cómo te contactan tus clientes? Pasame WhatsApp/teléfono, email, Instagram, dirección y horarios.',
    hint: 'Uno por línea. Poné solo los datos que quieras que se vean en la web.',
    example: 'WhatsApp: 11 5555-1234\nEmail: hola@laespiga.com\nInstagram: @laespigabakery\nDirección: Av. Rivadavia 4500, CABA\nHorarios: lunes a sábado de 7 a 20 hs' },
  { id: 'q_cta', field: 'cta', required: true,
    question: '¿Qué querés que haga la persona que visita tu web? (que te escriba por WhatsApp, te llame, reserve, pida presupuesto…)',
    hint: 'Es la acción principal; va a ser el botón destacado de la página.',
    example: 'Que me escriban por WhatsApp para hacer pedidos.' },
  { id: 'q_testimonials', field: 'testimonials', required: false,
    question: '¿Tenés testimonios o comentarios de clientes que quieras mostrar?',
    hint: 'Formato: "Texto del comentario" - Nombre. Si no tenés, respondé "no".',
    example: '"Las mejores facturas de la zona" - Marta G.' },
  { id: 'q_sections', field: 'wantedSections', required: false,
    question: '¿Querés alguna sección en particular? (galería, preguntas frecuentes, horarios, quiénes somos…)',
    hint: 'Si no sabés, decime "las que recomiendes" y las elijo yo.',
    example: 'Galería de fotos y preguntas frecuentes' },
  { id: 'q_bold', field: 'boldness', required: false,
    question: '¿Qué tan atrevido querés el diseño? (sobrio / atrevido / extremo)',
    hint: 'Sobrio: prolijo y discreto. Atrevido: animaciones y composiciones llamativas (lo recomendado). Extremo: fuera de lo común, sin miedo.',
    example: 'Extremo, quiero que nadie se olvide de mi web.' },
];

/* ---------- estado de la entrevista (derivado de project.answers) ---------- */

function answersOf(project) {
  if (!project.answers || typeof project.answers !== 'object') project.answers = {};
  return project.answers;
}

export function nextQuestion(project) {
  const a = answersOf(project);
  return QUESTIONS.find((q) => !(q.id in a)) || null;
}

const SKIP_RE = /^(no|nada|ninguno|ninguna|no tengo|todavia no|aun no|saltar|skip|paso|n\/a|-+|\.+|no se|ns|las que recomiendes|las que vos quieras|lo que recomiendes|elegi vos|elegilo vos|a criterio tuyo)$/;

export function norm(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function isSkip(text) {
  const t = norm(text).trim().replace(/[.!¡¿?,\s]+$/g, '').replace(/^[¡¿\s]+/, '');
  return t === '' || (t.length <= 28 && SKIP_RE.test(t));
}

export function recordAnswer(project, text) {
  const q = nextQuestion(project);
  if (!q) return project;
  const clean = String(text ?? '').trim();
  // respuesta vacía a una pregunta obligatoria: se vuelve a preguntar
  if (!clean && q.required) return project;
  answersOf(project)[q.id] = clean;
  return project;
}

/* ---------- utilidades de parseo ---------- */

export function splitList(text) {
  const raw = String(text ?? '').replace(/\r/g, '');
  let parts = raw.split(/\n|;|•|·|•/);
  if (parts.length === 1) {
    // una sola línea: coma o " y " final
    parts = raw.split(/,(?!\d{3}\b)/);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      const m = last.match(/^(.+?)\s+y\s+(.+)$/i);
      if (m && m[1].split(/\s+/).length <= 4) parts.splice(parts.length - 1, 1, m[1], m[2]);
    }
  }
  return parts
    .map((p) => p.replace(/^\s*(?:[-*–—+>]|\d+[.)])\s*/, '').trim())
    .map((p) => p.replace(/[.\s]+$/, ''))
    .filter(Boolean);
}

const PRICE_RE = /(?:(?:u\$s|usd|ars)\s?)?\$\s?\d[\d.,]*(?:\s?(?:mil|k|usd|pesos))?|\b\d[\d.,]*\s?(?:pesos|usd|d[oó]lares)\b/i;

export function parseServices(text) {
  if (isSkip(text)) return [];
  const items = [];
  for (const line of splitList(text)) {
    let rest = line;
    let price;
    const pm = rest.match(PRICE_RE);
    if (pm) {
      price = pm[0].replace(/\s+/g, ' ').trim();
      rest = (rest.slice(0, pm.index) + ' ' + rest.slice(pm.index + pm[0].length));
    }
    rest = rest
      .replace(/\b(desde|a|por|sale|cuesta|cuestan|valor|precio|de)\s*[:\-–]?\s*$/i, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+[-–—:]\s*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    let name = rest;
    let description = '';
    const sep = rest.match(/\s*(?::|\s[-–—]\s|\()\s*/);
    if (sep && sep.index > 1) {
      name = rest.slice(0, sep.index).trim();
      description = rest.slice(sep.index + sep[0].length).replace(/\)\s*$/, '').trim();
    }
    name = name.replace(/[.,:;\s]+$/, '').replace(/^["“']|["”']$/g, '');
    description = description.replace(/^[-–—:,\s]+|[-–—:,\s]+$/g, '').replace(/[.]$/, '');
    if (!name || name.length > 90) continue;
    const s = { name, description };
    if (price) s.price = price;
    items.push(s);
  }
  return items.slice(0, 12);
}

export function digitsOnly(s) {
  return String(s ?? '').replace(/\D/g, '');
}

const COLOR_NAMES = {
  'verde oliva': '#6b7a3a', 'azul marino': '#1f3a5f', 'azul oscuro': '#1e3a8a', 'verde oscuro': '#14532d',
  'verde agua': '#2bb5a0', 'verde menta': '#3dbb8a', 'verde lima': '#84cc16', 'azul cielo': '#38a3e8', 'azul rey': '#1d4ed8',
  'rojo oscuro': '#991b1b', 'celeste': '#38a3e8', 'turquesa': '#14b8a6', 'bordo': '#7f1d1d', 'rojo': '#dc2626',
  'azul': '#2563eb', 'verde': '#16a34a', 'amarillo': '#eab308', 'naranja': '#ea580c', 'violeta': '#7c3aed',
  'morado': '#7e22ce', 'lila': '#a78bfa', 'rosa': '#ec4899', 'fucsia': '#c026d3', 'negro': '#111111',
  'blanco': '#ffffff', 'gris': '#6b7280', 'dorado': '#b8892b', 'plateado': '#9ca3af', 'beige': '#d6c2a3',
  'marron': '#7c4a2d', 'cafe': '#6f4e37', 'crema': '#f3e9d2', 'coral': '#f97316', 'salmon': '#f08a6b',
  'terracota': '#c2613f', 'mostaza': '#c9a227', 'cobre': '#b87333', 'bordeaux': '#7f1d1d', 'esmeralda': '#059669',
  'petroleo': '#0f4c5c', 'vino': '#722f37', 'durazno': '#f4a982', 'magenta': '#c026d3',
};
const NEUTRALS = new Set(['#ffffff', '#111111', '#6b7280', '#9ca3af', '#f3e9d2', '#d6c2a3']);

export function parseColors(text) {
  if (!text || isSkip(text)) return {};
  const t = norm(text);
  const found = []; // {idx, hex}
  for (const m of String(text).matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    found.push({ idx: m.index, hex: '#' + h });
  }
  const names = Object.keys(COLOR_NAMES).sort((a, b) => b.length - a.length);
  const taken = [];
  for (const n of names) {
    const re = new RegExp(`\\b${n}s?\\b`, 'g');
    for (const m of t.matchAll(re)) {
      if (taken.some(([s, e]) => m.index < e && m.index + n.length > s)) continue;
      taken.push([m.index, m.index + n.length]);
      found.push({ idx: m.index, hex: COLOR_NAMES[n] });
    }
  }
  found.sort((a, b) => a.idx - b.idx);
  const uniq = [];
  for (const f of found) if (!uniq.includes(f.hex)) uniq.push(f.hex);
  if (!uniq.length) return {};
  const chromatic = uniq.filter((h) => !NEUTRALS.has(h));
  const primary = chromatic[0] || uniq[0];
  const rest = uniq.filter((h) => h !== primary);
  const secondary = (chromatic.find((h) => h !== primary)) || rest[0];
  const out = { primary };
  if (secondary) out.secondary = secondary;
  return out;
}

const TONE_WORDS = {
  premium: ['premium', 'elegante', 'lujo', 'lujoso', 'exclusiv', 'sofisticad', 'refinad', 'distinguid', 'alta gama', 'boutique', 'selecto'],
  profesional: ['profesional', 'serio', 'seria', 'formal', 'corporativ', 'confianza', 'confiable', 'institucional', 'sobri', 'tecnic'],
  divertido: ['divertid', 'joven', 'alegre', 'canchero', 'informal', 'descontractur', 'colorid', 'jugueton', 'humor', 'energet', 'desenfad'],
  cercano: ['cercan', 'amigable', 'familiar', 'calid', 'humilde', 'casual', 'barrial', 'simpatic', 'amable', 'vecino', 'simple', 'natural'],
};

export function parseTone(text, sector) {
  const t = norm(text);
  let best = null;
  let bestScore = 0;
  for (const tone of TONES) {
    let s = 0;
    for (const w of TONE_WORDS[tone]) if (t.includes(w)) s++;
    if (s > bestScore) { best = tone; bestScore = s; }
  }
  if (best) return best;
  if (sector === 'legal' || sector === 'tecnologia' || sector === 'construccion') return 'profesional';
  if (sector === 'fitness') return 'divertido';
  return 'cercano';
}

const SECTOR_WORDS = {
  gastronomia: ['restaurante', 'resto', 'comida', 'cocina', 'pizz', 'panader', 'pasteler', 'cafe', 'cafeteria', 'bar ', 'cerveceria', 'parrilla', 'heladeria', 'helado', 'menu', 'delivery', 'empanada', 'hamburguesa', 'sushi', 'catering', 'viandas', 'torta', 'facturas', 'medialuna', 'gastronom', 'chef', 'rotiseria', 'bodegon', 'vinoteca', 'pan '],
  salud: ['salud', 'medic', 'doctor', 'doctora', 'clinica', 'consultorio', 'odontolog', 'dentista', 'psicolog', 'terapia', 'kinesio', 'nutricion', 'pediatr', 'dermatolog', 'turnos medicos', 'fonoaudiolog', 'veterinari', 'farmacia', 'paciente', 'oftalmolog', 'cardiolog'],
  belleza: ['peluquer', 'barber', 'belleza', 'estetica', 'spa', 'manicur', 'unas', 'maquillaje', 'depilacion', 'masaje', 'cosmetolog', 'salon de', 'tintura', 'corte de pelo', 'tatuaje', 'pestanas', 'cejas'],
  fitness: ['gimnasio', 'gym', 'entrenamiento', 'entrenador', 'fitness', 'crossfit', 'yoga', 'pilates', 'funcional', 'musculacion', 'personal trainer', 'deporte', 'running', 'zumba', 'natacion', 'boxeo'],
  legal: ['abogad', 'estudio juridico', 'juridic', 'legal', 'escribania', 'escribano', 'contador', 'contable', 'impuestos', 'derecho', 'sucesion', 'divorcio', 'mediacion', 'gestoria', 'asesoria'],
  construccion: ['construccion', 'obra', 'arquitect', 'albanil', 'plomer', 'electricista', 'pintur', 'reforma', 'remodelacion', 'carpinter', 'herrer', 'techista', 'gasista', 'ingenier', 'durlock', 'maestro mayor', 'pileta', 'paisajism', 'jardiner'],
  tienda: ['tienda', 'venta de', 'vendemos', 'indumentaria', 'ropa', 'zapatill', 'calzado', 'accesorios', 'regaleria', 'libreria', 'jugueteria', 'ferreteria', 'muebles', 'decoracion', 'joyeria', 'bijouterie', 'productos', 'e-commerce', 'ecommerce', 'envios', 'mayorista', 'kiosco', 'almacen', 'florist', 'mascotas', 'petshop'],
  educacion: ['clases', 'curso', 'academia', 'instituto', 'escuela', 'profesor', 'profesora', 'capacitacion', 'taller', 'idiomas', 'ingles', 'apoyo escolar', 'tutor', 'educacion', 'alumnos', 'formacion', 'colegio', 'jardin de infantes', 'musica'],
  tecnologia: ['software', 'desarrollo web', 'aplicacion', 'sistemas', 'informatica', 'tecnologia', 'programacion', 'hosting', 'redes', 'soporte tecnico', 'reparacion de pc', 'celulares', 'marketing digital', 'diseno web', 'ciberseguridad'],
  servicios: ['servicio', 'limpieza', 'mudanza', 'flete', 'transporte', 'eventos', 'fotograf', 'diseno', 'consultor', 'cerrajer', 'lavadero', 'taller mecanico', 'mecanic', 'seguros', 'inmobiliaria', 'organizacion'],
};

export function detectSector(text) {
  const t = ' ' + norm(text) + ' ';
  let best = 'servicios';
  let bestScore = 0;
  for (const [sector, words] of Object.entries(SECTOR_WORDS)) {
    let s = 0;
    for (const w of words) if (t.includes(w.endsWith(' ') ? w : w)) s += w.length > 5 ? 2 : 1;
    if (s > bestScore) { best = sector; bestScore = s; }
  }
  return best;
}

const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;
const DAY_FULL = 'lunes|martes|miercoles|jueves|viernes|sabados?|domingos?|feriados?|fines? de semana';
const DAY_ABBR = 'lun|mar|mie|jue|vie|sab|dom';
// Horario inequívoco: días completos, "horario(s)", abrimos/atendemos, "9 a 18", "9 hs", "08:30"
const HOURS_STRONG = new RegExp(
  String.raw`\b(?:${DAY_FULL}|horarios?|abierto|abrimos|atendemos|cerrado|(?:${DAY_ABBR})\.?\s*(?:a|al|y|-|–)\s*(?:${DAY_ABBR})\b|(?:${DAY_ABBR})\.?\s+\d)`
  + String.raw`|\b\d{1,2}(?::\d{2})?\s*(?:hs|h|horas)\b|\b\d{1,2}(?::\d{2})?\s*(?:a|-|–)\s*\d{1,2}(?::\d{2})?\s*(?:hs|h|horas)?(?![\w.])`,
);
const HOURS_LABEL = /^(?:horarios?|atenci[oó]n|abrimos|atendemos)\b/i;
const ADDRESS_LABEL = /^(?:direcci[oó]n|ubicaci[oó]n|domicilio|estamos en|nos encontramos en|local)\b/i;
const ADDRESS_RE = /\b(calle|av\.?|avenida|ruta|bv\.?|boulevard|bulevar|direccion|esquina|barrio|local|piso|pasaje|diagonal|camino|km)\b|[a-zñ .]+\s\d{2,5}\b/;
const BARE_LABEL = /^(?:whatsapp|wsp|wpp|tel|telefono|cel|celular|email|mail|correo|instagram|ig|contacto)\s*:?\s*[,.\-]?\s*$/;

/**
 * Reparte una línea en dirección y horarios. Una línea con comas ("Av. Colón 800 Córdoba, Lunes a viernes 9 a 18")
 * se parte en trozos y cada trozo se clasifica: los trozos neutros ("CABA", "piso 5") siguen al anterior.
 */
function splitAddressHours(segs) {
  const addr = [];
  const hours = [];
  const strip = (s) => s
    .replace(/^(?:whatsapp|wsp|wpp|tel[eé]fono|tel|cel|celular|email|mail|correo|instagram|ig|direcci[oó]n|ubicaci[oó]n|domicilio|estamos en|nos encontramos en|horarios?|atenci[oó]n)\s*[:\-–]?\s*/i, '')
    .replace(/^[\s,.:\-–]+|[\s,.:\-–]+$/g, '')
    .trim();
  for (const seg of segs) {
    let mode = null;
    // trozos separados por coma, guion con espacios o punto final de oración (no el de "Av." / "Dr.")
    for (const piece of seg.split(/,\s*|\s[-–—]\s|(?<!\b(?:av|bv|dr|dra|gral|pte|sta|sto|pje|nro|lic))\.\s+(?=[A-ZÁÉÍÓÚÑ])/i)) {
      const p = piece.trim();
      const n = norm(p);
      if (!n || BARE_LABEL.test(n)) { mode = null; continue; }
      if (HOURS_LABEL.test(n)) mode = 'h';
      else if (ADDRESS_LABEL.test(n)) mode = 'a';
      else if (HOURS_STRONG.test(n)) mode = 'h';
      else if (ADDRESS_RE.test(n)) mode = 'a';
      // sin pista propia: continúa el modo anterior (ej. "CABA" después de la dirección)
      const text = strip(p);
      if (!text) continue;
      if (mode === 'h') hours.push(text);
      else if (mode === 'a') addr.push(text);
    }
  }
  return { address: addr.join(', '), hours: hours.join(', ') };
}

export function parseContact(text) {
  const out = {};
  if (!text || isSkip(text)) return out;
  let rest = String(text);

  const em = rest.match(EMAIL_RE);
  if (em) { out.email = em[0].toLowerCase(); rest = rest.replace(em[0], ' '); }

  const ig = rest.match(/instagram\.com\/([A-Za-z0-9_.]+)/i) || rest.match(/(?:^|[\s:(,;])@([A-Za-z0-9_.]{2,30})\b/);
  if (ig) { out.instagram = '@' + ig[1].replace(/\/$/, ''); rest = rest.replace(ig[0], ' '); }

  // teléfonos: miramos línea por línea para detectar etiqueta whatsapp
  const lines = rest.split(/\n|;|\|/);
  const phones = [];
  for (const line of lines) {
    const isWa = /whats|wsp|wpp|\bwa\b|guasap/i.test(line);
    for (const m of line.matchAll(PHONE_RE)) {
      const d = digitsOnly(m[0]);
      if (d.length < 8 || d.length > 15) continue;
      // "9 a 18" o "800 Córdoba" no son teléfonos, pero un rango de horas largo sí podría confundirse: exigimos que no sea un horario
      if (HOURS_STRONG.test(norm(m[0])) && !/^\+?\d[\d\s().-]*\d$/.test(m[0].trim())) continue;
      phones.push({ raw: m[0].trim().replace(/[-\s.]+$/, ''), digits: d, wa: isWa, line });
    }
  }
  const waP = phones.find((p) => p.wa);
  const plain = phones.find((p) => !p.wa) || phones[0];
  if (plain) out.phone = plain.raw;
  if (waP) out.whatsapp = waP.digits;
  for (const p of phones) rest = rest.replace(p.raw, ' ');

  // dirección y horarios sobre lo que queda
  const segs = rest.split(/\n|;|\|/).map((s) => s.trim()).filter(Boolean);
  const { address, hours } = splitAddressHours(segs);
  if (address) out.address = address;
  if (hours) out.hours = hours;
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

export function parseCta(text, contact = {}) {
  const t = norm(text);
  const patterns = {
    reserve: /reserv|turno|cita\b|agendar|agenda|sacar un turno|mesa/,
    whatsapp: /whats|wsp|wpp|mensaje|escrib|chat/,
    call: /llam|telefon|call/,
    form: /formulario|presupuesto|cotiz|consulta|mail|email|correo|pedido|contact/,
  };
  let type = null;
  let min = Infinity;
  for (const [k, re] of Object.entries(patterns)) {
    const m = t.match(re);
    if (m && m.index < min) { min = m.index; type = k; }
  }
  if (!type) type = contact.whatsapp ? 'whatsapp' : contact.phone ? 'call' : 'form';
  if (type === 'whatsapp' && !contact.whatsapp && !contact.phone) type = contact.email ? 'form' : 'form';
  if (type === 'call' && !contact.phone && !contact.whatsapp) type = 'form';
  return type;
}

export function ctaLabel(type, sector) {
  if (type === 'reserve') return sector === 'gastronomia' ? 'Reservá tu mesa' : 'Reservá tu turno';
  if (type === 'whatsapp') return 'Escribinos por WhatsApp';
  if (type === 'call') return 'Llamanos ahora';
  return sector === 'construccion' || sector === 'servicios' || sector === 'tecnologia' ? 'Pedí tu presupuesto' : 'Mandanos tu consulta';
}

export function parseTestimonials(text) {
  if (!text || isSkip(text) || /^(no|todavia no|aun no)\b/.test(norm(text).trim())) return [];
  const out = [];
  const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    let m = line.match(/^[-*•\s]*["“«'](.+?)["”»']\s*[-–—,(:]*\s*(.*?)\)?$/);
    if (m) { out.push({ name: m[2].replace(/^[-–—,\s]+/, '').trim() || 'Cliente', text: m[1].trim() }); continue; }
    m = line.match(/^[-*•\s]*([A-ZÁÉÍÓÚÑ][\wáéíóúñ.\s]{1,30}):\s*(.{8,})$/);
    if (m) { out.push({ name: m[1].trim(), text: m[2].replace(/^["“]|["”]$/g, '').trim() }); continue; }
    if (line.length > 15) out.push({ name: 'Cliente', text: line.replace(/^[-*•\s]+/, '').replace(/^["“]|["”]$/g, '') });
  }
  return out.slice(0, 6);
}

/** 'sobrio' | 'atrevido' (default) | 'extremo' a partir de texto libre. */
export function parseBoldness(text) {
  const t = norm(text);
  if (/extrem|fuera de lo comun|desafiante|rompe|loco|locura|sin miedo|mas atrevido|al maximo|a full/.test(t)) return 'extremo';
  if (/sobri|discret|clasic|prolij|tranquil|simple|minimal|conservador|formal/.test(t) && !/atrevid/.test(t)) return 'sobrio';
  return 'atrevido';
}

export function parseWantedSections(text) {
  if (!text || isSkip(text)) return [];
  const t = norm(text);
  const map = [
    ['gallery', /galeri|fotos|imagenes|portfolio|trabajos/],
    ['testimonials', /testimonio|opiniones|resenas|comentarios/],
    ['faq', /preguntas|faq/],
    ['hours', /horario/],
    ['about', /quienes somos|nosotros|historia|sobre (mi|nosotros)|conocenos/],
    ['services', /servicio|producto|menu|carta|catalogo|precios|tarifas/],
    ['benefits', /beneficio|por que elegir|ventajas/],
    ['contact', /contacto|ubicacion|mapa|como llegar/],
  ];
  return map.filter(([, re]) => re.test(t)).map(([k]) => k);
}

function cleanName(text) {
  let s = String(text ?? '').split('\n')[0].trim();
  const m = s.match(/^(?:(?:mi|el|la)\s+(?:negocio|empresa|local|marca|emprendimiento|estudio|comercio)\s+)?(?:se llama|me llamo|nombre es|llamad[oa]|es)\s+["“«']?(.+)$/i)
    || s.match(/^nombre\s*[:\-]\s*(.+)$/i);
  if (m) s = m[1];
  s = s.replace(/^["“«'\s]+|["”»'\s]+$/g, '').replace(/[.!]+$/, '').trim();
  return s.slice(0, 80);
}

const GOAL_BY_CTA = {
  whatsapp: 'Recibir consultas y pedidos por WhatsApp',
  call: 'Recibir llamadas de nuevos clientes',
  reserve: 'Conseguir reservas y turnos online',
  form: 'Recibir pedidos de presupuesto y consultas',
};

/* ---------- brief heurístico ---------- */

export function heuristicBrief(project) {
  const a = answersOf(project);
  const businessName = cleanName(a.q_name) || 'Mi negocio';
  const description = String(a.q_what ?? '').replace(/\s+/g, ' ').trim();
  const audience = isSkip(a.q_audience) ? '' : String(a.q_audience ?? '').replace(/\s+/g, ' ').trim();
  const services = parseServices(a.q_services);
  const sector = detectSector([businessName, description, audience, services.map((s) => s.name).join(' ')].join(' . '));
  const differentiators = isSkip(a.q_diff) ? [] : splitList(a.q_diff).slice(0, 8);
  const tone = parseTone(a.q_tone, sector);
  const colors = parseColors(a.q_colors);
  const contact = parseContact(a.q_contact);
  const type = parseCta(a.q_cta, contact);
  if (type === 'whatsapp' && !contact.whatsapp && contact.phone) contact.whatsapp = digitsOnly(contact.phone);
  const cta = { label: ctaLabel(type, sector), type };
  return {
    businessName,
    sector,
    description,
    audience,
    goals: [GOAL_BY_CTA[type], 'Dar a conocer ' + businessName + ' y generar confianza'],
    services,
    differentiators,
    tone,
    colors,
    contact,
    cta,
    wantedSections: parseWantedSections(a.q_sections),
    testimonials: parseTestimonials(a.q_testimonials),
    boldness: parseBoldness(a.q_bold),
    language: 'es',
  };
}

/* ---------- validación/normalización (sirve para la salida del LLM) ---------- */

const HEX_RE = /^#[0-9a-f]{6}$/i;
const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, max = 10) => (Array.isArray(v) ? v.map((x) => str(typeof x === 'string' ? x : '', 200)).filter(Boolean).slice(0, max) : []);

export function normalizeBrief(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback;
  const f = fallback;
  const b = {};
  b.businessName = str(raw.businessName, 80) || f.businessName;
  b.sector = SECTORS.includes(raw.sector) ? raw.sector : f.sector;
  b.description = str(raw.description, 600) || f.description;
  b.audience = typeof raw.audience === 'string' ? str(raw.audience, 400) : f.audience;
  const goals = strList(raw.goals, 6);
  b.goals = goals.length ? goals : f.goals;
  const services = Array.isArray(raw.services)
    ? raw.services.map((s) => {
      if (typeof s === 'string') return { name: str(s, 90), description: '' };
      if (!s || typeof s !== 'object') return null;
      const o = { name: str(s.name, 90), description: str(s.description, 300) };
      if (s.price != null && String(s.price).trim()) o.price = String(s.price).trim().slice(0, 40);
      return o;
    }).filter((s) => s && s.name).slice(0, 12)
    : [];
  b.services = services.length ? services : f.services;
  // no inventar: si el cliente no dio ningún servicio, no aceptamos servicios del LLM
  if (!f.services.length) b.services = [];
  const diffs = strList(raw.differentiators, 8);
  b.differentiators = diffs.length || !f.differentiators.length ? diffs : f.differentiators;
  b.tone = TONES.includes(raw.tone) ? raw.tone : f.tone;
  const rc = raw.colors && typeof raw.colors === 'object' ? raw.colors : {};
  const colors = {};
  if (HEX_RE.test(rc.primary || '')) colors.primary = rc.primary.toLowerCase();
  if (HEX_RE.test(rc.secondary || '')) colors.secondary = rc.secondary.toLowerCase();
  b.colors = colors.primary ? colors : f.colors;
  // el contacto solo se acepta si coincide con lo que dijo el cliente (evita datos inventados)
  const rcon = raw.contact && typeof raw.contact === 'object' ? raw.contact : {};
  const contact = { ...f.contact };
  for (const k of ['phone', 'email', 'whatsapp', 'address', 'hours', 'instagram']) {
    const v = str(rcon[k], 200);
    if (!v) continue;
    if (!contact[k]) {
      const allowed = norm(answersText(f)).includes(norm(k === 'whatsapp' ? digitsOnly(v) : v).slice(0, 12));
      if (allowed) contact[k] = k === 'whatsapp' ? digitsOnly(v) : v;
    }
  }
  b.contact = contact;
  const rcta = raw.cta && typeof raw.cta === 'object' ? raw.cta : {};
  const ctaType = CTA_TYPES.includes(rcta.type) ? rcta.type : f.cta.type;
  b.cta = { label: voseo(str(rcta.label, 50)) || f.cta.label, type: ctaType };
  if (b.cta.type === 'whatsapp' && !b.contact.whatsapp && b.contact.phone) b.contact.whatsapp = digitsOnly(b.contact.phone);
  if (b.cta.type === 'whatsapp' && !b.contact.whatsapp) b.cta = { ...f.cta };
  const ws = strList(raw.wantedSections, 10).filter((s) => SECTION_TYPES.includes(s));
  b.wantedSections = ws.length ? ws : f.wantedSections;
  // testimonios: solo los provistos por el cliente
  b.testimonials = f.testimonials;
  b.boldness = f.boldness; // lo decide el cliente, no la IA
  b.language = 'es';
  return b;
}

function answersText(f) {
  return JSON.stringify(f.contact) + ' ' + (f._raw || '');
}

const BRIEF_SYSTEM = `Sos el analista de una agencia que arma landing pages para comerciantes argentinos.
Recibís las respuestas libres de una entrevista y devolvés SOLO un JSON con este esquema exacto:
{"businessName":string,"sector":"gastronomia|salud|belleza|fitness|legal|construccion|tienda|educacion|tecnologia|servicios",
"description":string,"audience":string,"goals":[string],"services":[{"name":string,"description":string,"price":string?}],
"differentiators":[string],"tone":"cercano|profesional|premium|divertido","colors":{"primary":"#hex","secondary":"#hex"?},
"contact":{"phone"?,"email"?,"whatsapp"? (solo dígitos),"address"?,"hours"?,"instagram"?},
"cta":{"label":string,"type":"whatsapp|call|form|reserve"},"wantedSections":[hero|about|services|benefits|testimonials|gallery|hours|faq|contact],
"testimonials":[{"name":string,"text":string}],"language":"es"}
Reglas: NO inventes datos (precios, teléfonos, direcciones, testimonios). Si el cliente no lo dijo, omití el campo o dejá la lista vacía.
Si no dijo colores, devolvé "colors":{}. Español rioplatense.`;

export async function buildBrief(project, llm) {
  const brief = await buildBriefRaw(project, llm);
  // WhatsApp en formato internacional: así brief, requisitos y enlaces wa.me coinciden
  if (brief?.contact?.whatsapp) brief.contact.whatsapp = intlDigits(brief.contact.whatsapp, true);
  return brief;
}

async function buildBriefRaw(project, llm) {
  const base = heuristicBrief(project);
  if (!llm || !llm.available || typeof llm.completeJSON !== 'function') return base;
  try {
    const a = answersOf(project);
    const qa = QUESTIONS.map((q) => `P: ${q.question}\nR: ${a[q.id] ?? '(sin respuesta)'}`).join('\n\n');
    base._raw = Object.values(a).join('\n');
    const raw = await llm.completeJSON({ system: BRIEF_SYSTEM, prompt: `Entrevista:\n\n${qa}\n\nDevolvé el JSON del brief.` });
    const merged = normalizeBrief(raw, base);
    delete base._raw;
    delete merged._raw;
    return merged;
  } catch {
    delete base._raw;
    return base;
  }
}
