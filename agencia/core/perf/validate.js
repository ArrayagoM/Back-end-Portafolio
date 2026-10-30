// Validación de rendimiento ESTÁTICA con presupuestos explícitos y score por reglas transparentes.
import { scanHtml, parseTagAttrs } from './html.js';
import { parseCss, minifyCss } from './css.js';
import { minifyJs } from './js.js';
import { minifyHtml } from './html.js';
import { parseHtml } from '../agents/tester.js';
import { deliverable, gzipBytes, brotliBytes, bytes, kb, isExternalUrl } from './util.js';
import { listRequests } from './engine.js';

/** Presupuestos (límites) documentados. */
export const BUDGET_LIMITS = {
  htmlGzipKB: 40,        // index.html comprimido
  cssJsGzipKB: 60,       // todo el CSS + JS comprimido
  ownRequests: 8,        // documento + subrecursos propios (las fuentes externas no cuentan)
  blockingScripts: 0,    // <script src> sin defer/async/module
  imagesWithoutDims: 0,  // <img> sin width/height (o aspect-ratio)
  domNodes: 1500,        // elementos en el HTML (excl. exclusivo)
  inlineCssKB: 14,       // <style> inline
  inlineJsKB: 2,         // JS inline ejecutable
  blockingStylesheets: 2,
  thirdPartyOrigins: 2,
  minifySlackPct: 8,     // ahorro posible por minificar tolerado
};

/** Penalización por check fallido en el score (0-100). */
export const SCORE_RULES = { high: 15, medium: 8, low: 3 };

export const DISCLAIMER = 'Estimación estática (reglas sobre bytes, HTML, CSS y JS del sitio generado). No es una medición de Lighthouse ni de un navegador real: los tiempos reales dependen de la red, el hosting y el dispositivo.';

const LAYOUT_PROPS = /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|margin(-\w+)?|padding(-\w+)?|font-size|line-height|border-width|flex-basis|gap)$/;
const ABS_OK = /^(top|left|right|bottom)$/;

function chk(id, name, passed, details, severity = 'medium') { return { id, name, passed: !!passed, details: details || (passed ? 'OK' : ''), severity }; }

function animationIssues(css) {
  const issues = []; let lowOnly = true;
  const checkTransition = (decls, where) => {
    const val = decls.filter((d) => d.k === 'decl' && /^transition(-property)?:/i.test(d.text)).map((d) => d.text.replace(/^[^:]+:/, '')).join(',');
    if (!val) return;
    const abs = decls.some((d) => d.k === 'decl' && /^position:(absolute|fixed)/i.test(d.text));
    for (const part of val.split(',')) {
      const prop = part.trim().split(/\s+/)[0].toLowerCase();
      if (prop === 'all') { issues.push(`transition: all en ${where}`); lowOnly = false; }
      else if (LAYOUT_PROPS.test(prop)) {
        if (ABS_OK.test(prop) && abs) issues.push(`transition de ${prop} en ${where} (elemento absoluto: costo bajo)`);
        else { issues.push(`transition de ${prop} en ${where}`); lowOnly = false; }
      }
    }
  };
  (function walk(items, inKeyframes) {
    for (const it of items) {
      if (it.k === 'rule' && !inKeyframes) checkTransition(it.items, it.prelude);
      else if (it.k === 'rule' && inKeyframes) {
        for (const d of it.items) {
          const prop = (d.text || '').split(':')[0].toLowerCase();
          if (d.k === 'decl' && LAYOUT_PROPS.test(prop)) { issues.push(`@keyframes anima ${prop}`); lowOnly = false; }
        }
      } else if (it.k === 'at') walk(it.items, /keyframes/i.test(it.prelude));
    }
  })(parseCss(css), false);
  return { issues: [...new Set(issues)], lowOnly };
}

export function validatePerformance(files, { structure, brief } = {}) {
  void structure; void brief;
  const f = deliverable(files);
  const html = f['index.html'] || '';
  const css = Object.entries(f).filter(([k]) => k.endsWith('.css')).map(([, v]) => v).join('\n');
  const js = Object.entries(f).filter(([k]) => k.endsWith('.js')).map(([, v]) => v).join('\n');
  const parsed = parseHtml(html);
  const els = parsed.elements;
  const toks = scanHtml(html);
  const checks = [];

  const htmlGz = gzipBytes(html);
  const cssGz = Object.entries(f).filter(([k]) => k.endsWith('.css')).reduce((n, [, v]) => n + gzipBytes(v), 0);
  const jsGz = Object.entries(f).filter(([k]) => k.endsWith('.js')).reduce((n, [, v]) => n + gzipBytes(v), 0);
  const L = BUDGET_LIMITS;

  checks.push(chk('perf-html-gzip', `HTML ≤ ${L.htmlGzipKB} KB gzip`, htmlGz / 1024 <= L.htmlGzipKB, `index.html pesa ${kb(htmlGz)} KB gzip (${kb(bytes(html))} KB crudo).`, 'high'));
  checks.push(chk('perf-assets-gzip', `CSS+JS ≤ ${L.cssJsGzipKB} KB gzip`, (cssGz + jsGz) / 1024 <= L.cssJsGzipKB, `CSS ${kb(cssGz)} KB + JS ${kb(jsGz)} KB gzip.`, 'high'));

  const req = listRequests(f);
  checks.push(chk('perf-requests', `≤ ${L.ownRequests} requests propios (+ fuentes)`, req.own.length <= L.ownRequests, `${req.own.length} propios (${req.own.join(', ')}) y ${req.external.length} externo(s).`, 'medium'));

  const blocking = els.filter((e) => e.tag === 'script' && e.attrs.src && !('defer' in e.attrs) && !('async' in e.attrs) && !/module/i.test(e.attrs.type || ''));
  checks.push(chk('perf-blocking-scripts', 'Sin scripts bloqueantes', blocking.length <= L.blockingScripts, blocking.length ? `Bloqueantes: ${blocking.map((e) => e.attrs.src).join(', ')}. Agregá defer.` : 'Todos los <script src> usan defer/async.', 'high'));

  const imgs = els.filter((e) => e.tag === 'img');
  const noDims = imgs.filter((e) => !((e.attrs.width !== undefined && e.attrs.height !== undefined) || /aspect-ratio/i.test(e.attrs.style || '')));
  checks.push(chk('perf-img-dims', 'Imágenes con width/height (sin CLS)', noDims.length <= L.imagesWithoutDims, noDims.length ? `${noDims.length} <img> sin dimensiones: ${noDims.slice(0, 4).map((e) => e.attrs.src || '?').join(', ')}` : `${imgs.length} imagen(es) con dimensiones.`, 'medium'));

  // lazy: la primera imagen NO lazy; las que están tras el pliegue sí
  let foldIdx = toks.length;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'open' && !t.selfClose && (t.name === 'section' || /hero/i.test(parseTagAttrs(t.v).id || parseTagAttrs(t.v).class || ''))) {
      let d = 0;
      for (let j = i; j < toks.length; j++) { if (toks[j].name === t.name) { if (toks[j].t === 'open') d++; else if (toks[j].t === 'close') { d--; if (d === 0) { foldIdx = j; break; } } } }
      break;
    }
  }
  const lazyProblems = [];
  let firstImg = true;
  toks.forEach((t, i) => {
    if (t.t !== 'open' || t.name !== 'img') return;
    const a = parseTagAttrs(t.v);
    if (i <= foldIdx) { if (/^lazy$/i.test(a.loading || '')) lazyProblems.push(`${a.src || 'img'} está sobre el pliegue y es lazy`); if (firstImg && !/^data:/.test(a.src || '')) { if ((a.fetchpriority || '') !== 'high') lazyProblems.push(`${a.src || 'img'} (LCP) sin fetchpriority="high"`); firstImg = false; } }
    else if (!/^lazy$/i.test(a.loading || '')) lazyProblems.push(`${a.src || 'img'} bajo el pliegue sin loading="lazy"`);
  });
  checks.push(chk('perf-img-lazy', 'Lazy-loading correcto (LCP prioritaria, resto lazy)', lazyProblems.length === 0, lazyProblems.length ? lazyProblems.slice(0, 4).join('; ') : imgs.length ? 'OK' : 'No hay <img> (el sitio usa SVG/CSS).', 'medium'));

  // fuentes
  const fontProblems = [];
  for (const e of els) if (e.tag === 'link' && /fonts\.googleapis\.com\/css/i.test(e.attrs.href || '') && !/[?&]display=(swap|optional|fallback)/i.test(e.attrs.href)) fontProblems.push('Google Fonts sin display=swap');
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) if (!/font-display\s*:\s*(swap|optional|fallback)/i.test(m[1])) fontProblems.push('@font-face sin font-display');
  checks.push(chk('perf-font-swap', 'Fuentes con font-display: swap', fontProblems.length === 0, fontProblems.length ? [...new Set(fontProblems)].join('; ') : 'OK', 'medium'));

  const usesGF = els.some((e) => e.tag === 'link' && /fonts\.googleapis\.com/i.test(e.attrs.href || '') && /stylesheet/i.test(e.attrs.rel || ''));
  const pre = els.filter((e) => e.tag === 'link' && /preconnect/i.test(e.attrs.rel || ''));
  const preProblems = [];
  if (usesGF && !pre.some((e) => /fonts\.googleapis\.com/.test(e.attrs.href || ''))) preProblems.push('falta preconnect a fonts.googleapis.com');
  if (usesGF && !pre.some((e) => /fonts\.gstatic\.com/.test(e.attrs.href || ''))) preProblems.push('falta preconnect a fonts.gstatic.com');
  if (!usesGF && pre.length) preProblems.push('preconnect a orígenes sin uso');
  checks.push(chk('perf-preconnect', 'Preconnect solo a orígenes usados', preProblems.length === 0, preProblems.join('; ') || 'OK', 'low'));

  checks.push(chk('perf-no-import', 'Sin @import en CSS', !/@import\b/i.test(css), /@import\b/i.test(css) ? '@import encadena descargas: usá <link>.' : 'OK', 'medium'));

  const inlineCssB = els.filter((e) => e.tag === 'style').reduce((n, e) => n + bytes(e.rawText || ''), 0);
  const inlineJsB = els.filter((e) => e.tag === 'script' && !e.attrs.src && (e.attrs.type || '').toLowerCase() !== 'application/ld+json').reduce((n, e) => n + bytes(e.rawText || ''), 0);
  checks.push(chk('perf-inline-weight', 'Sin CSS/JS inline pesado', inlineCssB / 1024 <= L.inlineCssKB && inlineJsB / 1024 <= L.inlineJsKB, `<style> inline ${kb(inlineCssB)} KB (máx ${L.inlineCssKB}), JS inline ${kb(inlineJsB)} KB (máx ${L.inlineJsKB}).`, 'medium'));

  checks.push(chk('perf-dom-size', `DOM < ${L.domNodes} nodos`, els.length < L.domNodes, `${els.length} elementos.`, 'medium'));

  const anim = animationIssues(css);
  checks.push(chk('perf-animations', 'Animaciones solo con transform/opacity', anim.issues.length === 0, anim.issues.length ? anim.issues.slice(0, 5).join('; ') : 'Sin transition: all ni animación de propiedades de layout.', anim.issues.length && anim.lowOnly ? 'low' : 'medium'));

  const hdr = f['_headers'] || '';
  const hasCache = /Cache-Control:\s*public,\s*max-age=0,\s*must-revalidate/i.test(hdr) && /Cache-Control:[^\n]*immutable/i.test(hdr) && /Vary:\s*Accept-Encoding/i.test(hdr);
  checks.push(chk('perf-cache-headers', 'Cabeceras de caché (HTML revalida, assets versionados immutable, Vary)', hasCache, hasCache ? 'OK' : '_headers sin reglas de caché de rendimiento.', 'medium'));

  const slack = [];
  const pct = (a, b) => (a > 300 ? Math.round((1 - b / a) * 100) : 0);
  const cssP = pct(bytes(css), bytes(minifyCss(css)));
  const jsP = pct(bytes(js), bytes(minifyJs(js).code));
  const htmlP = pct(bytes(html), bytes(minifyHtml(html)));
  if (cssP > L.minifySlackPct) slack.push(`CSS −${cssP}%`);
  if (jsP > L.minifySlackPct) slack.push(`JS −${jsP}%`);
  if (htmlP > L.minifySlackPct) slack.push(`HTML −${htmlP}%`);
  checks.push(chk('perf-minified', 'CSS/JS/HTML minificados', slack.length === 0, slack.length ? `Se podría ahorrar: ${slack.join(', ')}.` : 'OK', 'medium'));

  const blockingCss = els.filter((e) => e.tag === 'link' && /stylesheet/i.test(e.attrs.rel || '') && !e.attrs.media);
  checks.push(chk('perf-render-blocking-css', `≤ ${L.blockingStylesheets} hojas de estilo bloqueantes`, blockingCss.length <= L.blockingStylesheets, `${blockingCss.length} hoja(s) bloqueante(s).`, 'low'));
  const origins = new Set(req.external.map((e) => { try { return new URL(e.url.startsWith('//') ? `https:${e.url}` : e.url).origin; } catch { return e.url; } }));
  checks.push(chk('perf-third-party', `≤ ${L.thirdPartyOrigins} orígenes de terceros`, origins.size <= L.thirdPartyOrigins, `${origins.size} origen(es): ${[...origins].join(', ') || 'ninguno'}.`, 'low'));

  const failed = checks.filter((c) => !c.passed);
  const score = Math.max(0, 100 - failed.reduce((n, c) => n + SCORE_RULES[c.severity], 0));
  const passed = failed.every((c) => c.severity === 'low');

  // Estimaciones (modelo simple: 4G lenta de Lighthouse móvil: 1.6 Mbps = 200 KB/s, RTT 150 ms)
  const RTT = 150; const BW = 200 * 1024;
  const blockingCssGz = blockingCss.reduce((n, e) => { const p = (e.attrs.href || '').split(/[?#]/)[0]; return n + (f[p] ? gzipBytes(f[p]) : 0); }, 0);
  const gfRtt = usesGF ? (pre.length ? 1 : 3) * RTT : 0;
  const lcpMs = Math.round((4 * RTT + (htmlGz / BW) * 1000 + RTT + (blockingCssGz / BW) * 1000 + gfRtt + 100) / 50) * 50;
  const cls = Math.round((noDims.length * 0.05 + (fontProblems.length ? 0.02 : 0) + els.filter((e) => e.tag === 'iframe' && !(e.attrs.width && e.attrs.height)).length * 0.05) * 1000) / 1000;
  const jsRawKB = bytes(js) / 1024;
  const tbt = Math.round(Math.max(0, jsRawKB * 2 - 50));
  const notes = [
    `LCP: 4 RTT de conexión + HTML + CSS bloqueante a ${Math.round(BW / 1024)} KB/s y RTT ${RTT} ms${usesGF ? ' + CSS de Google Fonts' : ''}; asume hosting con TTFB bajo.`,
    'CLS: 0.05 por imagen/iframe sin dimensiones y 0.02 por fuentes sin swap.',
    'TBT: 2 ms por KB de JS en un móvil lento, solo cuenta lo que supera 50 ms en una tarea.',
    `Brotli estimado: HTML ${kb(brotliBytes(html))} KB, CSS ${kb(brotliBytes(css))} KB, JS ${kb(brotliBytes(js))} KB.`,
  ];
  const budgets = {
    htmlGzipKB: { limit: L.htmlGzipKB, value: kb(htmlGz) },
    cssJsGzipKB: { limit: L.cssJsGzipKB, value: kb(cssGz + jsGz) },
    ownRequests: { limit: L.ownRequests, value: req.own.length },
    blockingScripts: { limit: L.blockingScripts, value: blocking.length },
    imagesWithoutDims: { limit: L.imagesWithoutDims, value: noDims.length },
    domNodes: { limit: L.domNodes, value: els.length },
  };
  return {
    passed, score, budgets, checks,
    estimates: { lcp: { ms: lcpMs, rating: lcpMs <= 2500 ? 'bueno' : lcpMs <= 4000 ? 'a mejorar' : 'malo' }, cls: { value: cls, rating: cls < 0.1 ? 'bueno' : 'a mejorar' }, tbt: { ms: tbt, rating: tbt <= 200 ? 'bueno' : 'a mejorar' }, notes },
    disclaimer: DISCLAIMER,
  };
}

export { isExternalUrl };
