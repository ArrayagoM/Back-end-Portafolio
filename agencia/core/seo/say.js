// Frases de Rocío (burbujas de diálogo): voseo rioplatense, extrovertidas, basadas en números reales y sin promesas.
import { pickBy } from './util.js';

export function sayLines(plan, validation) {
  const p = plan || {};
  const seed = p.businessName || 'rocio';
  const L = [];
  L.push(pickBy([
    '¡Hola, soy Rocío! Vamos a hacer que te encuentren hasta en la luna, y de paso en Google.',
    '¡Llegó Rocío, la de las palabras clave! Te armo el terreno para que te encuentren, hasta en la luna.',
  ], seed));
  const kw = (p.primaryKeywords || []).length;
  const lt = (p.longTail || []).length;
  L.push(`Armé ${kw} palabras clave principales y ${lt} búsquedas más específicas: ahí es donde tu gente escribe de verdad.`);
  const lc = (p.localTargets || []).length;
  L.push(lc
    ? `Tu zona es oro: preparé ${lc} combinaciones de servicio y lugar para las búsquedas de "cerca de mí".`
    : 'No me pasaste ubicación y no invento barrios: si atendés en una zona, contámela y le sumo SEO local.');
  if (validation) {
    const total = validation.checks.length + validation.aiReadiness.checks.length;
    const fails = [...validation.checks, ...validation.aiReadiness.checks].filter((c) => !c.passed);
    L.push(`Revisé tu sitio con ${total} controles y sacó ${validation.score} de 100 en SEO.`);
    L.push(fails.length
      ? pickBy([`Ojo con esto, que se arregla rápido: ${fails[0].name.toLowerCase()}.`, `Encontré ${fails.length} detalle(s) para pulir; el primero: ${fails[0].name.toLowerCase()}.`], seed)
      : 'No encontré detalles para corregir: tu sitio quedó prolijo como mate recién cebado.');
    L.push(`Para las IAs (ChatGPT, Gemini, Perplexity y compañía) el puntaje es ${validation.aiReadiness.score} de 100: más chances de que te citen, nunca certeza.`);
  } else {
    L.push('Para las IAs preparé un bloque de respuesta directa y un llms.txt: más chances de que te entiendan y te citen.');
  }
  const off = (p.offSite || []).length;
  L.push(`Te dejé ${off} acciones fuera del sitio. Empezá por la ficha de Google: suele ser un golazo.`);
  L.push('Spoiler honesto: los buscadores no se compran ni se prometen. Yo te traigo chances reales, mediciones y objetivos realistas.');
  return L.slice(0, 7);
}
