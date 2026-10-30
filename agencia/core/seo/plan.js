// Plan SEO determinista (sin IA): rico, específico con datos del brief y variado por rubro/nombre.
import { DISCLAIMER, normBrief, norm, normWords, cap, lowerFirst, uniq, hash, pickBy, clipWords, listJoin, safeSentence, slug, telOf, socialUrls, esc } from './util.js';

const k = (re, label, art, schema) => ({ re, label, art, schema });
export const SECTOR_DATA = {
  gastronomia: { label: 'Gastronomía', def: { label: 'negocio gastronómico', art: 'un', search: 'restaurante', schema: 'FoodEstablishment' }, ask: 'pedido',
    kinds: [k(/panader|panific|facturas|medialuna/, 'panadería', 'una', 'Bakery'), k(/pasteler|tortas|reposter/, 'pastelería', 'una', 'Bakery'), k(/cafeter|\bcafe\b|barista/, 'cafetería', 'una', 'CafeOrCoffeeShop'),
      k(/pizz/, 'pizzería', 'una', 'Restaurant'), k(/parrill|asado/, 'parrilla', 'una', 'Restaurant'), k(/helader/, 'heladería', 'una', 'IceCreamShop'), k(/\bbar\b|cervecer|coctel|tragos/, 'bar', 'un', 'BarOrPub'),
      k(/rotiser|viandas/, 'rotisería', 'una', 'FoodEstablishment'), k(/hamburgues/, 'hamburguesería', 'una', 'FastFoodRestaurant'), k(/restaurante|\bresto\b|cocina/, 'restaurante', 'un', 'Restaurant')],
    trans: ['pedir {s}', 'comprar {s}', '{s} por encargo'], info: ['cómo elegir {kind}', 'qué es {s}', 'ideas para disfrutar {s}'],
    blog: ['Cómo elegir {s}: guía rápida', 'El detrás de escena de {s}', 'Ideas para disfrutar {s}', 'Preguntas que nos hacen sobre {s}'],
    extra: { id: 'menu-fotos', title: 'Carta, fotos y plataformas de pedidos', why: 'En gastronomía mucha gente decide mirando fotos y la carta en Google Maps antes de entrar al sitio.', steps: ['Subí a la ficha de Google fotos reales de tus platos o productos y del local.', 'Cargá la carta o la lista de productos en la ficha, con los nombres tal cual figuran en tu web.', 'Si usás plataformas de pedidos o delivery, mantené el mismo nombre, teléfono y horarios que en tu sitio.'], effort: 'baja', impact: 'medio', timeline: '1 a 2 semanas' } },
  salud: { label: 'Salud y bienestar', def: { label: 'centro de salud y bienestar', art: 'un', search: 'consultorio', schema: 'MedicalBusiness' }, ask: 'turno',
    kinds: [k(/odontolog|dentist|ortodoncia/, 'consultorio odontológico', 'un', 'Dentist'), k(/psicolog|terapia/, 'consultorio de psicología', 'un', 'MedicalBusiness'), k(/kinesi|fisioterap/, 'centro de kinesiología', 'un', 'MedicalBusiness'),
      k(/veterinari|mascota/, 'veterinaria', 'una', 'VeterinaryCare'), k(/nutri/, 'consultorio de nutrición', 'un', 'MedicalBusiness'), k(/optic|oftalmo/, 'centro de oftalmología', 'un', 'MedicalBusiness'), k(/clinica|medic|doctor/, 'clínica', 'una', 'MedicalClinic')],
    trans: ['turno para {s}', 'sacar turno {s}', '{s} precio'], info: ['cuándo consultar por {s}', 'qué incluye {s}', 'cómo prepararse para {s}'],
    blog: ['Cuándo conviene consultar por {s}', 'Qué incluye {s}', 'Mitos y verdades sobre {s}', 'Cómo prepararte para {s}'],
    extra: { id: 'directorios-salud', title: 'Directorios de profesionales y cartillas', why: 'Los directorios de salud y las cartillas de coberturas que ya trabajás son menciones confiables y relevantes para tu rubro.', steps: ['Revisá en qué cartillas o directorios de profesionales ya figurás y corregí nombre, dirección y teléfono.', 'Si tu colegio profesional ofrece listado público, pedí figurar con el enlace a tu sitio.', 'Usá siempre la misma especialidad y los mismos datos de contacto en todos lados.'], effort: 'media', impact: 'alto', timeline: '2 a 4 semanas' } },
  belleza: { label: 'Belleza y estética', def: { label: 'centro de belleza y estética', art: 'un', search: 'centro de estética', schema: 'HealthAndBeautyBusiness' }, ask: 'turno',
    kinds: [k(/peluquer|corte|colorista|barber/, 'peluquería', 'una', 'HairSalon'), k(/unas|manicur|nail/, 'estudio de uñas', 'un', 'NailSalon'), k(/spa|masaje|relax/, 'spa', 'un', 'DaySpa'), k(/estetic|depilaci|facial/, 'centro de estética', 'un', 'BeautySalon'), k(/maquill/, 'estudio de maquillaje', 'un', 'BeautySalon')],
    trans: ['turno {s}', 'reservar {s}', '{s} precio'], info: ['cómo elegir {kind}', 'cada cuánto hacerse {s}', 'cuidados después de {s}'],
    blog: ['Cada cuánto conviene {s}', 'Cuidados después de {s}', 'Cómo elegir {s}', 'Preguntas frecuentes sobre {s}'],
    extra: { id: 'galeria-redes', title: 'Trabajos reales en Instagram y Google', why: 'En belleza se decide por lo visual: fotos reales y actuales ayudan a que te elijan.', steps: ['Publicá trabajos reales con el permiso de cada clienta o cliente.', 'Usá en las publicaciones el nombre del servicio y la zona, tal como lo buscaría alguien.', 'Subí las mejores fotos también a tu ficha de Google.'], effort: 'media', impact: 'medio', timeline: 'continuo' } },
  fitness: { label: 'Fitness y deporte', def: { label: 'espacio de entrenamiento', art: 'un', search: 'gimnasio', schema: 'SportsActivityLocation' }, ask: 'inscripción',
    kinds: [k(/gimnasio|musculaci|\bgym\b/, 'gimnasio', 'un', 'ExerciseGym'), k(/crossfit|funcional/, 'box de entrenamiento funcional', 'un', 'ExerciseGym'), k(/yoga/, 'estudio de yoga', 'un', 'SportsActivityLocation'), k(/pilates/, 'estudio de pilates', 'un', 'SportsActivityLocation'), k(/natacion|pileta/, 'escuela de natación', 'una', 'SportsActivityLocation'), k(/entrenador|personal/, 'entrenamiento personalizado', 'un', 'SportsActivityLocation')],
    trans: ['inscripción {s}', '{s} precio', 'clases de {s}'], info: ['cómo empezar {s}', 'beneficios de {s}', 'qué llevar a {s}'],
    blog: ['Cómo empezar con {s}', 'Beneficios de {s}', 'Qué llevar a tu primera clase de {s}', 'Errores comunes en {s}'],
    extra: { id: 'clases-horarios', title: 'Clases y horarios visibles en Google', why: 'La gente busca "clases cerca de mí" y quiere ver horarios actualizados sin entrar a otra página.', steps: ['Cargá los horarios en la ficha de Google y actualizalos cuando cambien.', 'Subí fotos reales del espacio y de las clases.', 'Publicá novedades de clases en la ficha y en tus redes.'], effort: 'baja', impact: 'medio', timeline: '1 semana' } },
  legal: { label: 'Estudio profesional', def: { label: 'estudio profesional', art: 'un', search: 'estudio jurídico', schema: 'LegalService' }, ask: 'consulta',
    kinds: [k(/abogad|juridic|legal/, 'estudio jurídico', 'un', 'LegalService'), k(/contador|contable|impuest/, 'estudio contable', 'un', 'AccountingService'), k(/escriban/, 'escribanía', 'una', 'LegalService'), k(/arquitect/, 'estudio de arquitectura', 'un', 'ProfessionalService')],
    trans: ['consulta por {s}', 'presupuesto {s}', '{s} precio'], info: ['qué hacer ante {s}', 'qué documentación se necesita para {s}', 'cómo es el proceso de {s}'],
    blog: ['Qué hacer ante {s}', 'Documentación habitual para {s}', 'Cómo es el proceso de {s}', 'Errores frecuentes en {s}'],
    extra: { id: 'colegio-profesional', title: 'Colegio profesional y artículos de autoridad', why: 'Los listados de colegios profesionales y los artículos útiles aportan señales de confianza propias de tu rubro.', steps: ['Verificá que figurás en el listado público de tu colegio o consejo, con el enlace a tu sitio si lo permite.', 'Escribí artículos claros que respondan dudas reales de tus clientes.', 'Firmá los artículos con nombre y matrícula SOLO si es un dato real y verificable.'], effort: 'media', impact: 'alto', timeline: '1 a 3 meses' } },
  construccion: { label: 'Construcción y obras', def: { label: 'empresa de construcción y obras', art: 'una', search: 'constructora', schema: 'GeneralContractor' }, ask: 'presupuesto',
    kinds: [k(/electric/, 'servicio de electricidad', 'un', 'Electrician'), k(/plomer|gasista|sanitari/, 'servicio de plomería y gas', 'un', 'Plumber'), k(/pintur/, 'servicio de pintura', 'un', 'HousePainter'), k(/carpinter|muebles/, 'carpintería', 'una', 'HomeAndConstructionBusiness'), k(/arquitect|diseno de interiores/, 'estudio de arquitectura', 'un', 'ProfessionalService'), k(/construc|obra|remodelaci|reforma/, 'constructora', 'una', 'GeneralContractor')],
    trans: ['presupuesto {s}', 'contratar {s}', '{s} precio'], info: ['cómo elegir quién haga {s}', 'qué tener en cuenta en {s}', 'cuánto tiempo lleva {s}'],
    blog: ['Cómo elegir quién haga {s}', 'Qué preguntar antes de contratar {s}', 'Etapas de {s}', 'Errores comunes en {s}'],
    extra: { id: 'portfolio-obras', title: 'Portfolio de obras con permiso de los clientes', why: 'Las obras reales, bien descriptas y con permiso, son la mejor prueba para quien tiene que confiar en alguien.', steps: ['Armá fichas de trabajos terminados: qué se hizo, dónde (zona) y fotos del antes y el después.', 'Pedí autorización escrita a cada cliente antes de publicar.', 'Subí esas fotos a tu ficha de Google con descripciones claras.'], effort: 'media', impact: 'alto', timeline: '2 a 6 semanas' } },
  tienda: { label: 'Tienda', def: { label: 'tienda', art: 'una', search: 'tienda', schema: 'Store' }, ask: 'compra',
    kinds: [k(/ropa|indumentaria|moda/, 'tienda de ropa', 'una', 'ClothingStore'), k(/libreri|libros/, 'librería', 'una', 'BookStore'), k(/ferreter/, 'ferretería', 'una', 'HardwareStore'), k(/mueble|decoraci/, 'tienda de muebles y decoración', 'una', 'FurnitureStore'), k(/flor|florer/, 'florería', 'una', 'Florist'), k(/joyer|bijou/, 'joyería', 'una', 'JewelryStore')],
    trans: ['comprar {s}', '{s} precio', '{s} online'], info: ['cómo elegir {s}', 'qué tener en cuenta al comprar {s}', 'ideas con {s}'],
    blog: ['Cómo elegir {s}', 'Guía de compra de {s}', 'Ideas para combinar {s}', 'Cuidados de {s}'],
    extra: { id: 'productos-google', title: 'Productos en Google (fichas gratuitas) y marketplaces', why: 'Los productos con fotos y datos claros pueden aparecer en las pestañas de compras y en tu ficha.', steps: ['Evaluá cargar tus productos en Google Merchant Center para fichas gratuitas.', 'Mantené nombres, descripciones y disponibilidad iguales entre tu sitio y los marketplaces donde vendas.', 'Subí los productos principales a tu ficha de Google.'], effort: 'media', impact: 'medio', timeline: '2 a 4 semanas' } },
  educacion: { label: 'Educación y capacitación', def: { label: 'espacio de formación', art: 'un', search: 'cursos', schema: 'EducationalOrganization' }, ask: 'inscripción',
    kinds: [k(/idioma|ingles|english|frances|aleman/, 'academia de idiomas', 'una', 'EducationalOrganization'), k(/musica|guitarra|piano|canto/, 'escuela de música', 'una', 'EducationalOrganization'), k(/apoyo escolar|clases particulares|tutor/, 'espacio de apoyo escolar', 'un', 'EducationalOrganization'), k(/curso|capacitaci|taller/, 'centro de capacitación', 'un', 'EducationalOrganization')],
    trans: ['inscripción {s}', 'curso de {s}', '{s} online'], info: ['cómo aprender {s}', 'cuánto lleva aprender {s}', 'por dónde empezar con {s}'],
    blog: ['Cómo empezar a aprender {s}', 'Errores comunes al aprender {s}', 'Recursos para practicar {s}', 'Preguntas frecuentes sobre {s}'],
    extra: { id: 'contenido-educativo', title: 'Contenido educativo y videos', why: 'Los contenidos que enseñan algo gratis suelen atraer búsquedas informativas y generar confianza.', steps: ['Publicá clases cortas o consejos en video (por ejemplo en YouTube) y enlazalos a tu sitio.', 'Escribí guías para principiantes en el blog.', 'Pedí a ex alumnos que quieran contar su experiencia en tu ficha de Google.'], effort: 'alta', impact: 'medio', timeline: '2 a 6 meses' } },
  tecnologia: { label: 'Tecnología', def: { label: 'empresa de tecnología', art: 'una', search: 'desarrollo de software', schema: 'ProfessionalService' }, ask: 'cotización',
    kinds: [k(/software|desarrollo|aplicaci|\bapp\b|sistemas/, 'empresa de desarrollo de software', 'una', 'ProfessionalService'), k(/pagina web|sitio web|diseno web|web/, 'estudio de desarrollo web', 'un', 'ProfessionalService'), k(/soporte|informatic|computaci|redes/, 'servicio de soporte informático', 'un', 'ProfessionalService'), k(/marketing|redes sociales|publicidad/, 'agencia de marketing digital', 'una', 'ProfessionalService')],
    trans: ['cotizar {s}', 'contratar {s}', '{s} precio'], info: ['cómo elegir quién haga {s}', 'cuánto tiempo lleva {s}', 'qué necesito para {s}'],
    blog: ['Cómo elegir proveedor de {s}', 'Qué preparar antes de contratar {s}', 'Casos de uso de {s}', 'Errores comunes en {s}'],
    extra: { id: 'casos-linkedin', title: 'Casos de estudio y perfiles profesionales', why: 'Los casos reales y los perfiles profesionales consistentes ayudan a validar quién sos y qué hacés.', steps: ['Redactá casos de estudio con permiso de cada cliente: problema, solución y resultado medido.', 'Completá el perfil de LinkedIn de la empresa con el mismo nombre y descripción que tu web.', 'Enlazá desde esos perfiles a tu sitio.'], effort: 'media', impact: 'alto', timeline: '1 a 3 meses' } },
  servicios: { label: 'Servicios', def: { label: 'negocio de servicios', art: 'un', search: 'servicios profesionales', schema: 'ProfessionalService' }, ask: 'consulta',
    kinds: [k(/limpieza/, 'servicio de limpieza', 'un', 'HomeAndConstructionBusiness'), k(/mudanza|flete|transporte/, 'servicio de fletes y mudanzas', 'un', 'MovingCompany'), k(/jardin|paisaj/, 'servicio de jardinería', 'un', 'HomeAndConstructionBusiness'), k(/fotograf/, 'estudio de fotografía', 'un', 'ProfessionalService'), k(/evento|fiesta/, 'servicio de organización de eventos', 'un', 'ProfessionalService'), k(/mecanic|taller|auto/, 'taller mecánico', 'un', 'AutoRepair')],
    trans: ['contratar {s}', 'presupuesto {s}', '{s} precio'], info: ['cómo elegir {s}', 'qué incluye {s}', 'qué preguntar antes de contratar {s}'],
    blog: ['Cómo elegir {s}', 'Qué incluye {s}', 'Qué preguntar antes de contratar {s}', 'Errores comunes con {s}'],
    extra: { id: 'zonas-servicio', title: 'Zonas de servicio y casos reales', why: 'Dejar claro dónde trabajás y mostrar trabajos reales ayuda tanto a las personas como a los buscadores.', steps: ['Definí el área de servicio en la ficha de Google (si no atendés en un local).', 'Armá una lista de zonas o barrios donde trabajás realmente y publicala en el sitio.', 'Sumá fotos de trabajos reales con permiso de los clientes.'], effort: 'baja', impact: 'medio', timeline: '1 a 2 semanas' } },
};

export function detectKind(b) {
  const D = SECTOR_DATA[b.sector] || SECTOR_DATA.servicios;
  const hay = norm([b.name, b.description, b.services.map((s) => `${s.name} ${s.description}`).join(' ')].join(' '));
  const hit = D.kinds.find((x) => x.re.test(hay));
  if (hit) return { label: hit.label, art: hit.art, search: hit.label, schema: hit.schema, detected: true };
  return { ...D.def, detected: false };
}

const inPlace = (b) => (b.place ? ` en ${b.place.label}` : '');
const asks = { whatsapp: 'por WhatsApp', call: 'por teléfono', form: 'desde el formulario de la página', reserve: 'por los medios de contacto de la página' };
export function channels(b) {
  const c = b.contact;
  const out = [];
  if (c.whatsapp) out.push(`WhatsApp al ${c.whatsapp}`);
  if (c.phone) out.push(`teléfono al ${c.phone}`);
  if (c.email) out.push(`email a ${c.email}`);
  if (c.instagram) out.push(`Instagram ${c.instagram.startsWith('@') || /^https?:/.test(c.instagram) ? c.instagram : `@${c.instagram}`}`);
  return out;
}

const svcName = (s) => lowerFirst(s.name);
const hasSection = (structure, ...types) => types.find((t) => (structure?.sections || []).some((s) => s.type === t || s.id === t));

const ASKQ = { pedido: 'hacer un pedido', turno: 'sacar un turno', 'inscripción': 'inscribirme', consulta: 'hacer una consulta', presupuesto: 'pedir un presupuesto', compra: 'comprar', 'cotización': 'pedir una cotización' };
function buildFaq(b, kind, D, seed) {
  const out = [];
  const ch = channels(b);
  const name = b.name;
  if (b.services.length) out.push({ q: pickBy([`¿Qué servicios ofrece ${name}?`, `¿Qué hace ${name}?`, `¿Qué puedo encontrar en ${name}?`], seed), a: `${name} ofrece ${listJoin(b.services.slice(0, 8).map((s) => s.name))}.` });
  if (b.contact.address) out.push({ q: pickBy([`¿Dónde queda ${name}?`, `¿Dónde está ${name}?`], seed, 1), a: `${name} está en ${b.contact.address}${b.place && !norm(b.contact.address).includes(norm(b.place.label)) ? `, ${b.place.label}` : ''}.` });
  if (b.contact.hours) out.push({ q: `¿Cuáles son los horarios de ${name}?`, a: `Los horarios de atención son: ${b.contact.hours}.` });
  if (ch.length) out.push({ q: `¿Cómo puedo ${ASKQ[D.ask] || 'contactar a'} ${ASKQ[D.ask] ? 'en ' : ''}${name}?`, a: `Podés comunicarte con ${name} por ${listJoin(ch.slice(0, 3))}.` });
  const priced = b.services.find((s) => s.price);
  if (priced) out.push({ q: `¿Cuánto cuesta ${svcName(priced)}?`, a: `${priced.name}: ${priced.price}.` });
  else if (b.services[0] && ch.length) out.push({ q: `¿Cuánto cuesta ${svcName(b.services[0])}?`, a: `Para conocer el valor actualizado de ${svcName(b.services[0])}, consultá por ${ch[0].split(' ')[0] === 'WhatsApp' ? 'WhatsApp' : ch[0].split(' ')[0]}.` });
  const det = b.services.find((s) => s.description && !/garant|asegur/i.test(s.description));
  if (det) out.push({ q: `¿Qué incluye ${svcName(det)}?`, a: `${det.name}: ${det.description.replace(/[.\s]+$/, '')}.` });
  if (b.differentiators.length) out.push({ q: `¿Por qué elegir ${name}?`, a: `${cap(listJoin(b.differentiators.slice(0, 4)))}.` });
  if (b.audience) out.push({ q: `¿Para quién es ${name}?`, a: `${name} está pensado para: ${b.audience.replace(/[.\s]+$/, '')}.` });
  if (b.contact.instagram) out.push({ q: `¿${name} tiene Instagram?`, a: `Sí, podés encontrar a ${name} en Instagram: ${b.contact.instagram.startsWith('@') || /^https?:/.test(b.contact.instagram) ? b.contact.instagram : `@${b.contact.instagram}`}.` });
  return out.slice(0, 8);
}

export function buildAnswerBlock(b, kind) {
  const name = b.name;
  const s1 = `${name} es ${kind.art} ${kind.label}${inPlace(b)}.`;
  const sv = b.services.length ? `Ofrece ${listJoin(b.services.slice(0, 5).map((s) => lowerFirst(s.name)))}.` : (safeSentence(b.description, 140) || '');
  const bits = [];
  if (b.contact.address) bits.push(`atiende en ${b.contact.address}`);
  if (b.contact.hours) bits.push(`en el horario ${b.contact.hours}`);
  const ch = channels(b).slice(0, 2);
  let s3 = bits.length ? `${cap(bits.join(', '))}.` : '';
  if (ch.length) s3 = `${s3 ? s3 + ' ' : ''}Se puede contactar por ${listJoin(ch)}.`;
  return [s1, sv, s3].filter(Boolean).join(' ').replace(/\.\./g, '.');
}

export const BOTS = [
  { name: 'OAI-SearchBot', purpose: 'busqueda', owner: 'OpenAI (ChatGPT search)' }, { name: 'ChatGPT-User', purpose: 'usuario', owner: 'OpenAI (visitas pedidas por un usuario)' },
  { name: 'GPTBot', purpose: 'entrenamiento', owner: 'OpenAI (entrenamiento de modelos)' }, { name: 'Claude-SearchBot', purpose: 'busqueda', owner: 'Anthropic (búsqueda de Claude)' },
  { name: 'Claude-User', purpose: 'usuario', owner: 'Anthropic (visitas pedidas por un usuario)' }, { name: 'ClaudeBot', purpose: 'entrenamiento', owner: 'Anthropic (entrenamiento)' },
  { name: 'PerplexityBot', purpose: 'busqueda', owner: 'Perplexity (índice de búsqueda)' }, { name: 'Perplexity-User', purpose: 'usuario', owner: 'Perplexity (visitas pedidas por un usuario)' },
  { name: 'Google-Extended', purpose: 'entrenamiento', owner: 'Google (Gemini; no afecta la búsqueda de Google)' }, { name: 'Applebot-Extended', purpose: 'entrenamiento', owner: 'Apple (entrenamiento)' },
  { name: 'CCBot', purpose: 'entrenamiento', owner: 'Common Crawl (datasets abiertos)' },
];

const link = (base, id) => `${base || '/'}${id ? `#${id}` : ''}`;
export function buildLlmsTxt(b, kind, answerBlock, structure) {
  const base = b.website;
  const ids = new Set((structure?.sections || []).map((s) => s.id || s.type));
  const L = [`# ${b.name}`, '', `> ${answerBlock.split(/(?<=\.)\s/).slice(0, 2).join(' ')}`, ''];
  if (b.description) L.push(safeSentence(b.description, 300), '');
  if (b.services.length) {
    L.push('## Servicios', ...b.services.slice(0, 12).map((s) => `- [${s.name}](${link(base, ids.has('services') ? 'services' : '')})${s.description ? `: ${s.description.replace(/\s+/g, ' ')}` : ''}${s.price ? ` (${s.price})` : ''}`), '');
  }
  const info = [];
  if (b.contact.address) info.push(`- [Dónde estamos](${link(base, ids.has('contact') ? 'contact' : '')}): ${b.contact.address}`);
  if (b.contact.hours) info.push(`- [Horarios](${link(base, ids.has('hours') ? 'hours' : ids.has('contact') ? 'contact' : '')}): ${b.contact.hours}`);
  if (info.length) L.push('## Información del negocio', ...info, '');
  const c = [];
  if (b.contact.whatsapp) c.push(`- [WhatsApp](https://wa.me/${b.contact.whatsapp.replace(/\D/g, '')})`);
  if (b.contact.phone) c.push(`- [Teléfono](tel:${telOf({ phone: b.contact.phone })}): ${b.contact.phone}`);
  if (b.contact.email) c.push(`- [Email](mailto:${b.contact.email}): ${b.contact.email}`);
  for (const s of socialUrls(b.contact)) c.push(`- [${cap(s.network)}](${s.url})`);
  if (c.length) L.push('## Contacto', ...c, '');
  if (ids.has('faq')) L.push('## Optional', `- [Preguntas frecuentes](${link(base, 'faq')})`, '');
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function buildOffSite(b, kind, D, seed) {
  const place = b.place?.label;
  const gbpCat = cap(kind.label);
  const nameLine = `Usá el nombre exacto "${b.name}", igual que en tu sitio.`;
  const items = [
    { id: 'gbp', title: 'Google Business Profile completo y verificado', why: 'La ficha de Google es la base del SEO local: alimenta Maps y las búsquedas "cerca de mí".', steps: ['Entrá a business.google.com y reclamá o creá la ficha de tu negocio.', nameLine, `Elegí como categoría principal algo parecido a "${gbpCat}" y sumá secundarias solo si realmente aplican.`, b.contact.address ? 'Cargá la dirección tal cual figura en tu sitio.' : 'Si atendés en domicilio sin local, configurá el área de servicio en lugar de la dirección.', 'Completá teléfono, horarios, servicios y el enlace a tu sitio; verificá la ficha con el método que Google te ofrezca.', 'Subí fotos reales y publicá novedades con regularidad.'], effort: 'baja', impact: 'alto', timeline: '1 a 3 días (más el tiempo de verificación de Google)' },
    { id: 'reviews', title: 'Reseñas reales de clientes (sin incentivos indebidos)', why: 'Las reseñas reales y recientes ayudan a que las personas te elijan y suman señales locales.', steps: ['Copiá el enlace directo para dejar reseñas desde tu ficha de Google.', `Pedilas con un mensaje simple: "Hola, gracias por elegir ${b.name}. Si tenés un minuto, nos ayuda mucho que cuentes cómo te fue: [enlace de tu ficha]. ¡Gracias!"`, 'Pedí reseñas a todos tus clientes, no solo a los que sabés que van a estar contentos: Google no permite filtrar.', 'No ofrezcas descuentos ni regalos a cambio de reseñas, y nunca escribas reseñas propias o falsas.', 'Respondé todas las reseñas con amabilidad, incluidas las críticas.'], effort: 'media', impact: 'alto', timeline: 'continuo (empezá esta semana)' },
    { id: 'nap', title: 'Consistencia de nombre, dirección y teléfono en directorios', why: 'Los mismos datos en todos lados ayudan a buscadores e IAs a reconocer que hablan del mismo negocio.', steps: ['Armá una planilla con el nombre, la dirección, el teléfono y el horario exactos de tu negocio.', 'Revisá y completá: Bing Places, Apple Business Connect y Páginas Amarillas Argentina (o el equivalente de tu país).', 'Sumá directorios de tu rubro y cámaras comerciales de tu zona.', 'Corregí cualquier dato viejo o distinto.'], effort: 'media', impact: 'medio', timeline: '1 a 2 semanas' },
    { id: 'backlinks', title: 'Enlaces locales y prensa', why: 'Que sitios reales y relevantes de tu zona te enlacen es una señal de confianza.', steps: ['Listá proveedores, cámaras, asociaciones, eventos y medios locales con los que ya tenés relación.', 'Pedí que te mencionen con enlace a tu sitio (por ejemplo en un listado de socios o proveedores).', 'Ofrecé a medios y blogs locales una historia real tuya: novedades, un evento o un aporte útil.', 'Evitá comprar enlaces o armar redes artificiales: pueden perjudicarte.'], effort: 'alta', impact: 'alto', timeline: '2 a 6 meses' },
    { id: 'social', title: 'Perfiles sociales vinculados (sameAs)', why: 'Perfiles coherentes y enlazados ayudan a que los buscadores entiendan quién sos.', steps: ['Ordená tus perfiles reales (Instagram, Facebook y los que uses) con el mismo nombre, descripción y enlace a tu sitio.', 'Agregá al sitio los enlaces a esos perfiles.', 'Sumá solo perfiles que existan y estén activos al bloque sameAs de los datos estructurados.'], effort: 'baja', impact: 'medio', timeline: '2 a 5 días' },
    { id: 'gsc', title: 'Google Search Console', why: 'Es la fuente oficial de cómo Google ve tu sitio: indexación, búsquedas e impresiones.', steps: ['Entrá a search.google.com/search-console y agregá tu sitio.', 'Verificá la propiedad (por DNS o con una etiqueta HTML).', 'Enviá el sitemap.xml y pedí la indexación de la página principal.', 'Revisá cada mes los informes de Páginas, Rendimiento y Experiencia.'], effort: 'baja', impact: 'alto', timeline: '1 día' },
    { id: 'bing-indexnow', title: 'Bing Webmaster Tools e IndexNow', why: 'Bing es una fuente que usan Copilot y otros buscadores; avisar cambios acelera que los vean.', steps: ['Entrá a Bing Webmaster Tools; podés importar tu sitio directo desde Google Search Console.', 'Enviá el sitemap.xml.', 'Activá IndexNow (clave en un archivo de texto en la raíz del sitio) para avisar páginas nuevas o cambiadas.'], effort: 'baja', impact: 'medio', timeline: '1 día' },
    { id: 'analytics', title: 'Medición con Search Console y analítica', why: 'Sin medir no se puede mejorar: necesitás saber qué búsquedas traen gente y qué acciones hacen.', steps: ['Anotá la línea de base del mes 0: impresiones, clics y posición promedio en Search Console.', 'Medí los clics a WhatsApp, llamadas y formulario como acciones importantes.', 'Si usás GA4, tené en cuenta que requiere ajustar la política de seguridad del sitio y avisar el uso de cookies; una alternativa liviana es medir con enlaces con parámetros UTM.', 'Revisá un tablero simple una vez por mes.'], effort: 'media', impact: 'alto', timeline: '1 semana' },
    { id: 'content', title: 'Contenido útil y calendario del blog', why: 'Responder dudas reales amplía las búsquedas por las que podés aparecer y alimenta respuestas de IA.', steps: ['Elegí 4 temas a partir de las preguntas de tus clientes.', ...D.blog.map((t, i) => `Semana ${i + 1}: ${t.replace('{s}', b.services[i % Math.max(1, b.services.length)] ? svcName(b.services[i % b.services.length]) : kind.label)}.`), 'Publicá, compartilo en tus redes y actualizá las notas viejas cada tanto.'], effort: 'alta', impact: 'medio', timeline: 'continuo (2 a 4 notas por mes)' },
    { id: 'ai-testing', title: 'Pruebas mensuales en asistentes de IA', why: 'Las respuestas de IA varían: conviene medir si te mencionan en lugar de suponerlo.', steps: [`Armá 5 preguntas de prueba, por ejemplo: "¿qué ${kind.label} recomendás${inPlace(b)}?"`, 'Probalas una vez por mes en ChatGPT, Gemini, Perplexity, Claude y Copilot, en ventana privada.', 'Anotá si te mencionan, si citan tu sitio y qué dicen.', 'Compará mes a mes y corregí los datos incorrectos desde tu sitio y tus fichas.'], effort: 'baja', impact: 'medio', timeline: 'mensual' },
    D.extra,
  ];
  void place; void seed;
  return items;
}

function buildTargets(b) {
  const pl = b.place;
  return [
    { metric: 'Indexación de la página principal en Google', realisticRange: 'entre 1 y 14 días después de enviar el sitemap, si el sitio es accesible y no tiene noindex', horizon: 'primeras 2 semanas' },
    { metric: 'Primeras impresiones en Google (Search Console)', realisticRange: 'suelen aparecer entre 2 y 6 semanas después de publicar, con volúmenes bajos al principio', horizon: '2 a 6 semanas' },
    { metric: 'Búsquedas por el nombre del negocio', realisticRange: 'posiciones entre 1 y 5 si el nombre es poco común; más difícil si se parece a otros', horizon: '2 a 8 semanas' },
    { metric: pl ? `Búsquedas locales (servicio + ${pl.label})` : 'Búsquedas por servicio', realisticRange: 'con competencia baja o media, posiciones entre 5 y 20; con competencia alta puede llevar más de 6 meses', horizon: '3 a 6 meses' },
    { metric: 'Reseñas reales en la ficha de Google', realisticRange: 'un ritmo sostenido de 2 a 4 por mes pidiéndolas a clientes reales', horizon: 'continuo' },
    { metric: 'Clics orgánicos mensuales', realisticRange: 'crecimiento gradual respecto de la línea base del mes 0; no hay una cifra fija porque depende del rubro y la zona', horizon: '3 a 6 meses' },
    { metric: 'Menciones en respuestas de IA', realisticRange: 'pueden aparecer o no; el objetivo es mejorar la proporción de consultas de prueba donde te mencionan frente al mes base', horizon: '3 a 6 meses' },
  ];
}

const TIPS = ['Poné al inicio de la página un párrafo de 2 o 3 frases que diga quién sos, qué hacés, dónde y cómo contactarte.', 'Usá títulos que planteen preguntas reales de tus clientes y respondelas justo debajo.', 'Mantené el mismo nombre, dirección y teléfono en tu sitio, tu ficha y tus directorios.', 'Escribí hechos concretos y verificables (servicios, zona, horarios) en lugar de frases vagas.', 'Usá listas y tablas simples para servicios y horarios: son fáciles de leer y de citar.', 'No dejes información importante solo dentro de imágenes o de scripts.', 'Mantené los datos estructurados (JSON-LD) iguales a lo que se ve en la página.', 'Enlazá tus perfiles reales con sameAs para que se entienda que son la misma entidad.', 'Actualizá la página cuando cambien horarios, servicios o datos de contacto.', 'Sumá una sección de preguntas frecuentes con respuestas breves y exactas.', 'Publicá contenido propio y útil: las IAs suelen citar fuentes claras y específicas.'];

export function deriveKeywordTerms(rawBrief) {
  const b = normBrief(rawBrief);
  const kind = detectKind(b);
  return { kind, services: b.services.map((s) => norm(s.name)), place: b.place?.areas.map(norm) || [], name: norm(b.name) };
}

/** Plan SEO 100% determinista. */
export function deterministicPlan(rawBrief, structure) {
  const b = normBrief(rawBrief);
  const D = SECTOR_DATA[b.sector] || SECTOR_DATA.servicios;
  const kind = detectKind(b);
  const seed = b.name;
  const pl = b.place;
  const main = pl?.label;
  const k1 = kind.search || kind.label;
  const sv = b.services.map(svcName);
  const withPlace = (t) => (main ? `${t} en ${main}` : t);

  const primary = uniq([withPlace(k1), sv[0] ? withPlace(sv[0]) : '', sv[1] ? withPlace(sv[1]) : '', k1, sv[0] || ''].filter(Boolean)).slice(0, 5);
  const modsAll = ['cerca de mí', 'opiniones', 'precios', 'recomendado'];
  const secondary = uniq([b.name, ...(pl?.areas || []).map((a) => `${k1} ${a}`), ...sv.slice(2, 8).map(withPlace), `${k1} cerca de mí`, ...modsAll.map((m) => `${k1} ${m}`).sort((x, y) => hash(seed + x) - hash(seed + y)), ...b.services.slice(0, 4).map((s) => `${svcName(s)} ${pickBy(modsAll, seed + s.name)}`)]).filter((x) => !primary.some((p) => normWords(p) === normWords(x))).slice(0, 10);
  const fill = (tpl, s) => tpl.replace('{s}', s).replace('{kind}', k1);
  const topS = sv.length ? sv.slice(0, 3) : [k1];
  const longTail = uniq([...topS.flatMap((s) => D.trans.map((t) => withPlace(fill(t, s)))), ...topS.flatMap((s) => D.info.map((t) => fill(t, s)).slice(0, 2)), `${k1} cerca de mí`, ...(pl ? pl.areas.map((a) => `${k1} en ${a} opiniones`) : [])]).slice(0, 14);

  const sec = (...types) => hasSection(structure, ...types) || 'hero';
  const intents = [
    { query: b.name, intent: 'navegacional', section: sec('hero') },
    ...(b.contact.instagram ? [{ query: `${b.name} instagram`, intent: 'navegacional', section: sec('contact', 'footer') }] : []),
    { query: withPlace(k1), intent: main ? 'local' : 'informacional', section: sec('hero') },
    { query: `${k1} cerca de mí`, intent: 'local', section: sec('hours', 'contact') },
    ...topS.slice(0, 2).map((s) => ({ query: withPlace(fill(D.trans[0], s)), intent: 'transaccional', section: sec('services', 'contact') })),
    ...topS.slice(0, 2).map((s) => ({ query: fill(D.info[0], s), intent: 'informacional', section: sec('faq', 'about', 'services') })),
    { query: fill(D.info[1], topS[0]), intent: 'informacional', section: sec('faq', 'about') },
  ];

  const intentsU = intents.filter((x, i, a) => a.findIndex((y) => y.query === x.query) === i);
  const localTargets = [];
  if (pl) {
    const pats = ['{service} en {place}', '{service} {place}', '{service} cerca de {place}'];
    const pat = pickBy(pats, seed);
    for (const area of pl.areas.slice(0, 2)) for (const s of uniq([k1, ...sv.slice(0, 3)])) localTargets.push({ service: s, place: area, queryPattern: area === pl.areas[0] ? pat : pats[0] });
  }

  const T = [];
  const long = (p) => `${p} en ${main}`;
  const t1 = main ? `${cap(k1)} en ${main} | ${b.name}` : `${b.name} | ${cap(k1)}`;
  const t2 = main ? `${b.name}: ${k1} en ${main}` : `${cap(k1)}: ${b.name}`;
  const t3 = sv.length > 1 ? `${cap(sv[0])} y ${sv[1]}${inPlace(b)} | ${b.name}` : t1;
  T.push(...[t1, t2, t3].sort((x, y) => hash(seed + x) - hash(seed + y)));
  void long;
  const titleTag = T.find((t) => t.length <= 60) || clipWords(`${b.name} | ${cap(k1)}`, 60) || clipWords(b.name, 60);

  const ctaPhrase = { whatsapp: 'Escribinos por WhatsApp', call: 'Llamanos', form: 'Consultanos', reserve: 'Reservá tu turno' }[b.cta.type];
  const cta = clipWords((b.cta.label || ctaPhrase).replace(/[.!\s]+$/, ''), 40);
  const head = `${b.name}: ${k1}${inPlace(b)}.`;
  const parts = [head, b.services.length ? `${cap(listJoin(sv.slice(0, 3)))}.` : safeSentence(b.description, 80), `${cap(cta)}.`];
  let metaDescription = parts.filter(Boolean).join(' ');
  if (metaDescription.length > 155) metaDescription = [head, `${cap(cta)}.`].join(' ');
  if (metaDescription.length > 155) metaDescription = `${clipWords(head, 155 - cta.length - 2)} ${cap(cta)}.`;

  const sections = (structure?.sections || []).map((s) => s.type);
  const H = { services: `Servicios de ${k1}${inPlace(b)}`, about: `Quiénes somos: ${b.name}`, benefits: `Por qué elegir ${b.name}`, faq: `Preguntas frecuentes sobre ${k1}`, hours: 'Horarios y cómo llegar', contact: `Contacto: ${D.ask} con ${b.name}`, testimonials: 'Opiniones de clientes', gallery: `Galería de ${k1}` };
  const P = { services: 'Cubrir las búsquedas por servicio y producto', about: 'Reforzar la entidad: quién es el negocio', benefits: 'Responder por qué elegirlos con hechos', faq: 'Capturar preguntas reales y ser citable por IAs', hours: 'Datos locales consistentes (NAP)', contact: 'Conversión y datos de contacto', testimonials: 'Prueba social real', gallery: 'Contenido visual con alt descriptivo' };
  const headingPlan = [{ level: 1, text: main ? `${b.name}: ${k1} en ${main}` : `${b.name}: ${k1}`, purpose: 'Un único h1 con nombre, rubro y lugar (la intención principal)' }];
  for (const t of sections) if (H[t]) {
    headingPlan.push({ level: 2, text: H[t], purpose: P[t] });
    if (t === 'services') for (const s of b.services.slice(0, 6)) headingPlan.push({ level: 3, text: cap(s.name), purpose: `Búsquedas de "${svcName(s)}"` });
  }

  const faq = buildFaq(b, kind, D, seed);
  const answerBlock = buildAnswerBlock(b, kind);
  const trainingBots = BOTS.filter((x) => x.purpose === 'entrenamiento').map((x) => x.name);
  const allowAI = !b.blockAI;
  const robotsPolicy = {
    allowAI, allowTraining: allowAI && !b.excludeAITraining, bots: BOTS.map((x) => x.name), trainingBots, botInfo: BOTS,
    note: b.excludeAITraining ? 'Se permiten los bots de búsqueda y de visitas de usuarios; se excluye el entrenamiento de modelos. Excluir el entrenamiento no te saca de Google ni de las búsquedas con IA.' : 'Se permiten los buscadores y los asistentes de IA. Si más adelante querés excluir solo el entrenamiento de modelos (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot), se puede sin salir de los buscadores.',
  };
  const entityFacts = [{ label: 'Nombre', value: b.name }, { label: 'Rubro', value: kind.label }];
  if (pl) entityFacts.push({ label: 'Zona', value: pl.areas.join(', ') });
  if (b.contact.address) entityFacts.push({ label: 'Dirección', value: b.contact.address });
  if (b.contact.phone) entityFacts.push({ label: 'Teléfono', value: b.contact.phone });
  if (b.contact.whatsapp) entityFacts.push({ label: 'WhatsApp', value: b.contact.whatsapp });
  if (b.contact.email) entityFacts.push({ label: 'Email', value: b.contact.email });
  if (b.contact.hours) entityFacts.push({ label: 'Horarios', value: b.contact.hours });
  if (b.website) entityFacts.push({ label: 'Sitio', value: b.website });
  const tips = TIPS.slice().sort((x, y) => hash(seed + x) - hash(seed + y)).slice(0, 8);
  const aiVisibility = { answerBlock, entityFacts, llmsTxt: buildLlmsTxt(b, kind, answerBlock, structure), robotsPolicy, citabilityTips: tips };

  return {
    businessName: b.name, sector: b.sector, kind: { label: kind.label, detected: kind.detected, schema: kind.schema },
    primaryKeywords: primary, secondaryKeywords: secondary, longTail, intents: intentsU, localTargets,
    titleTag, metaDescription, headingPlan, faq, aiVisibility,
    offSite: buildOffSite(b, kind, D, seed), targets: buildTargets(b), disclaimer: DISCLAIMER,
    notes: [...(pl ? [] : ['El brief no trae ubicación: no se generó SEO local. Si tenés local o zona de trabajo, sumala y se completa esa parte.']), ...(kind.detected ? [] : [`No se detectó el tipo exacto de negocio: se usó un rubro genérico ("${kind.label}"). Confirmalo con el cliente.`])],
    source: 'determinista',
  };
}
void esc; void slug;
