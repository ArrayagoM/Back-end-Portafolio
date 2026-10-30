// Agente RENDIMIENTO "Lucho": valida la velocidad del sitio generado y lo optimiza sin cambiar contenido ni comportamiento.
// Contrato: optimizeSite(files, {structure, brief}) -> {files, report}; validatePerformance(...); sayLines(report, validation).
import { runEngine } from '../perf/engine.js';
import { validatePerformance } from '../perf/validate.js';
import { kb } from '../perf/util.js';

export const PERSONA = { id: 'perf', name: 'Lucho', role: 'Rendimiento' };

export { validatePerformance };

export function optimizeSite(files, { structure, brief } = {}) {
  const input = files && typeof files === 'object' ? files : {};
  const empty = { htmlBytes: 0, cssBytes: 0, jsBytes: 0, totalBytes: 0, gzipBytes: 0, requests: 0 };
  if (typeof input['index.html'] !== 'string') {
    return {
      files: { ...input },
      report: { before: empty, after: empty, savingsPct: 0, applied: [], skipped: [{ id: 'todo', reason: 'no hay index.html para optimizar' }], verification: { ok: false, checks: [], reason: 'sin index.html' }, notes: ['Sin index.html no hay nada que acelerar.'] },
    };
  }
  const r = runEngine(input, { structure, brief });
  const savingsPct = r.before.totalBytes ? Math.round((1 - r.after.totalBytes / r.before.totalBytes) * 1000) / 10 : 0;
  const notes = [...r.notes];
  if (!r.verification.ok) notes.push(`Se devolvió el sitio ORIGINAL porque la verificación falló: ${r.verification.reason}`);
  else notes.push('Cada optimización se verificó contra el paso anterior (texto, ids/clases, enlaces, headings, aria/alt, meta/JSON-LD, JS compilable, CSS balanceado, tester/security/reviewer) y se revirtió si algo cambiaba.');
  return {
    files: r.files,
    report: { before: r.before, after: r.after, savingsPct, applied: r.applied, skipped: r.skipped, verification: r.verification, notes },
  };
}

const sz = (n) => { const v = n / 1024; return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10).replace('.', ','); };

/** Frases de Lucho (voseo rioplatense). Usa solo números del reporte y la validación. */
export function sayLines(report, validation) {
  const b = report?.before || {}; const a = report?.after || {};
  const lines = [];
  const ok = report?.verification?.ok !== false && (report?.applied || []).length > 0;
  lines.push('¡Llegó Lucho! Acá cada kilobyte es un enemigo y yo vengo con la lupa.');
  if (!report?.verification?.ok && report?.verification) {
    lines.push('Probé varias optimizaciones, pero la verificación me marcó un cambio y no me la juego: te dejo el sitio original intacto.');
    lines.push(`Medí ${sz(b.totalBytes || 0)} KB en total y ${b.requests ?? 0} requests; prefiero lento y fiel antes que rápido y roto.`);
  } else if (!ok) {
    lines.push(`Revisé todo: ${sz(b.totalBytes || 0)} KB en total y ${b.requests ?? 0} requests. No encontré nada que pueda tocar sin riesgo, ¡qué prolijos!`);
  } else {
    if (a.cssBytes < b.cssBytes) lines.push(`¡Bajé el CSS de ${sz(b.cssBytes)} a ${sz(a.cssBytes)} KB! Le saqué hasta las reglas que nadie usaba.`);
    if (a.jsBytes < b.jsBytes) lines.push(`El JS pasó de ${sz(b.jsBytes)} a ${sz(a.jsBytes)} KB: chau comentarios, chau espacios, mismo comportamiento.`);
    if (a.htmlBytes < b.htmlBytes) lines.push(`El HTML bajó de ${sz(b.htmlBytes)} a ${sz(a.htmlBytes)} KB sin tocar una sola palabra del texto.`);
    lines.push(`En total: de ${sz(b.totalBytes)} a ${sz(a.totalBytes)} KB, un ${report.savingsPct}% menos. ¡Eso es volar!`);
    const names = (report.applied || []).length;
    lines.push(`Apliqué ${names} optimización(es) y las verifiqué una por una (${report.verification.checks.length} chequeos); lo que cambiaba algo, lo revertí.`);
    if ((report.applied || []).some((x) => x.id === 'cache-headers')) lines.push('Dejé la caché armada con ?v=hash: los visitantes que vuelven casi no descargan nada.');
  }
  if (validation && typeof validation.score === 'number') {
    lines.push(`Puntaje de rendimiento estimado: ${validation.score}/100 (${validation.checks.filter((c) => !c.passed).length} observaciones). Ojo: es una estimación, no Lighthouse.`);
  }
  if (a.gzipBytes && lines.length < 7) lines.push(`Y con gzip todo viaja en unos ${sz(a.gzipBytes)} KB. ¡Milisegundos que te regalo!`);
  const out = lines.slice(0, 7);
  while (out.length < 5) out.push('Cada milisegundo cuenta, y yo los cuento todos.');
  return out;
}

export default { PERSONA, optimizeSite, validatePerformance, sayLines };
void kb;
