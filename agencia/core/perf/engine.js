// Motor de optimización con verificación y reversión paso a paso.
import { OPTIMIZATIONS } from './optimizations.js';
import { verifyStep, paritySnapshot, compareFingerprints, structuralChecks, parityChecks, fingerprint } from './verify.js';
import { bytes, gzipBytes, deliverable, isMetaFile, localPath, isExternalUrl, isDataUrl } from './util.js';
import { scanHtml, parseTagAttrs } from './html.js';

const pageFiles = (files) => Object.entries(deliverable(files)).filter(([k]) => !isMetaFile(k));

/** Requests estáticamente detectables: documento + subrecursos propios + externos. */
export function listRequests(files) {
  const html = files['index.html'] || '';
  const own = ['index.html']; const external = [];
  const add = (u, kind) => {
    if (!u || isDataUrl(u) || /^(mailto|tel|javascript|#)/i.test(u.trim())) return;
    if (isExternalUrl(u)) { if (!external.some((e) => e.url === u)) external.push({ url: u, kind }); return; }
    const p = localPath(u);
    if (p && !own.includes(p)) own.push(p);
  };
  for (const t of scanHtml(html)) {
    if (t.t !== 'open') continue;
    const a = parseTagAttrs(t.v);
    if (t.name === 'link' && /stylesheet|icon/i.test(a.rel || '')) add(a.href, /stylesheet/i.test(a.rel) ? 'css' : 'icon');
    else if (t.name === 'script' && a.src) add(a.src, 'js');
    else if ((t.name === 'img' || t.name === 'source' || t.name === 'video' || t.name === 'audio' || t.name === 'iframe') && a.src) add(a.src, t.name);
  }
  for (const [k, v] of Object.entries(deliverable(files))) {
    if (!k.endsWith('.css')) continue;
    for (const m of v.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) add(m[1], 'css-asset');
  }
  return { own, external };
}

export function measure(files) {
  const f = deliverable(files);
  const pf = pageFiles(files);
  const sum = (pred) => pf.filter(([k]) => pred(k)).reduce((n, [, v]) => n + bytes(v), 0);
  const r = listRequests(files);
  return {
    htmlBytes: sum((k) => k.endsWith('.html')),
    cssBytes: sum((k) => k.endsWith('.css')),
    jsBytes: sum((k) => k.endsWith('.js')),
    totalBytes: sum(() => true),
    gzipBytes: pf.reduce((n, [, v]) => n + gzipBytes(v), 0),
    requests: r.own.length + r.external.length,
    _files: Object.keys(f).length,
  };
}
const pub = ({ _files, ...m }) => m;

const total = (files) => Object.entries(deliverable(files)).reduce((n, [, v]) => n + bytes(v), 0);
const changed = (a, b) => { const ka = Object.keys(b); return ka.length !== Object.keys(a).length || ka.some((k) => a[k] !== b[k]); };

/**
 * Corre las optimizaciones, verifica cada una contra el paso anterior y la revierte si algo cambia.
 * -> { files, applied, skipped, verification, notes, before, after }
 */
export function runEngine(files, { structure, brief, optimizations = OPTIMIZATIONS } = {}) {
  const original = { ...files };
  const ctx = { structure, brief, notes: [] };
  const base = paritySnapshot(original, ctx);
  const applied = []; const skipped = [];
  let cur = { ...original };
  for (const opt of optimizations) {
    let res;
    try { res = opt.run({ ...cur }, ctx); } catch (e) { skipped.push({ id: opt.id, reason: `error interno: ${e.message}` }); continue; }
    if (!res || res.skip || !res.files) { skipped.push({ id: opt.id, reason: res?.reason || 'sin cambios' }); continue; }
    if (!changed(cur, res.files)) { skipped.push({ id: opt.id, reason: 'sin cambios' }); continue; }
    const checks = verifyStep(cur, res.files, base, ctx);
    const failed = checks.filter((c) => !c.passed);
    if (failed.length) { skipped.push({ id: opt.id, reason: `revertida: ${failed.map((c) => `${c.id} (${c.details})`).join('; ')}` }); continue; }
    applied.push({ id: opt.id, name: opt.name, savedBytes: total(cur) - total(res.files), details: res.details || '' });
    cur = res.files;
  }
  const before = pub(measure(original));
  // Verificación final contra el ORIGINAL
  let checks = [...compareFingerprints(fingerprint(original), fingerprint(cur)), ...structuralChecks(cur), ...parityChecks(base, cur, ctx)];
  let ok = checks.every((c) => c.passed);
  if (!ok) {
    const why = checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.details}`).join('; ');
    skipped.push({ id: 'todo', reason: `verificación final falló, se devuelve el original: ${why}` });
    return { files: original, applied: [], skipped, verification: { ok: false, checks, reason: why }, notes: ctx.notes, before, after: before };
  }
  return { files: cur, applied, skipped, verification: { ok, checks }, notes: ctx.notes, before, after: pub(measure(cur)) };
}
