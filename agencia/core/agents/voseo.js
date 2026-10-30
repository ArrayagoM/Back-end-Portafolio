// Tuteo -> voseo rioplatense para el copy que genera el sistema o la IA.

// Imperativos inequívocos (en tuteo) -> voseo
const VOSEO_VERBS = {
  pide: 'pedí', solicita: 'solicitá', mira: 'mirá', conoce: 'conocé', descubre: 'descubrí', haz: 'hacé', ven: 'vení', elige: 'elegí',
  escribenos: 'escribinos', llamanos: 'llamanos', contactanos: 'contactanos', cuentanos: 'contanos', envianos: 'mandanos',
  inscribete: 'inscribite', registrate: 'registrate', cotiza: 'cotizá', visita: 'visitá', prueba: 'probá',
};
// Palabras que también son sustantivos: solo son imperativo si siguen con tu/una/ya/hoy...
const VOSEO_AMBIGUOUS = { agenda: 'agendá', reserva: 'reservá', consulta: 'consultá', pregunta: 'preguntá', compra: 'comprá' };
const NEXT_OK = /^(?:tu|tus|una|un|ya|hoy|ahora|gratis|sin|con)\b/i;
const VOSEO_WORDS = [
  [/\btienes\b/gi, 'tenés'], [/\bpuedes\b/gi, 'podés'], [/\bquieres\b/gi, 'querés'], [/\bnecesitas\b/gi, 'necesitás'],
  [/\beres\b/gi, 'sos'], [/\bbuscas\b/gi, 'buscás'], [/\bsientes\b/gi, 'sentís'], [/\bpiensas\b/gi, 'pensás'],
];
const keepCase = (from, to) => (from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
const deaccent = (w) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Pasa de tuteo a voseo rioplatense los imperativos iniciales y las formas más comunes ("Agenda tu consulta" -> "Agendá tu consulta"). */
export function voseo(text) {
  let out = String(text ?? '');
  out = out.replace(/(^|[.!?¡¿]\s*)([A-Za-zÁÉÍÓÚáéíóúñÑ]+)(\s+\S+)?/g, (m, pre, word, rest = '') => {
    const k = deaccent(word);
    let to = VOSEO_VERBS[k];
    if (!to && VOSEO_AMBIGUOUS[k] && NEXT_OK.test(rest.trim())) to = VOSEO_AMBIGUOUS[k];
    return to ? pre + keepCase(word, to) + rest : m;
  });
  for (const [re, to] of VOSEO_WORDS) out = out.replace(re, (w) => keepCase(w, to));
  return out;
}

