// Verificación "manteniendo todo": huella semántica del sitio + chequeos estructurales + paridad con tester/security/reviewer.
import { parseHtml, decodeEntities, runTests } from '../agents/tester.js';
import { auditSecurity } from '../agents/security.js';
import { reviewRequirements } from '../agents/reviewer.js';
import { scanHtml, BLOCK_TAGS } from './html.js';
import { cssBalanced } from './css.js';
import { compiles } from './js.js';
import { deliverable, stripVersion, firstDiff } from './util.js';

const PERF_REL = /preload|preconnect|dns-prefetch|modulepreload|prefetch/i;
const IGNORE_ATTRS = { img: ['loading', 'decoding', 'fetchpriority', 'width', 'height'], iframe: ['loading'], script: ['defer'] };
const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'poster', 'srcset', 'data'];
const A11Y = (k) => k.startsWith('aria-') || ['alt', 'role', 'for', 'title', 'placeholder', 'lang', 'label', 'tabindex'].includes(k);

function canon(o) {
  if (Array.isArray(o)) return o.map(canon);
  if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canon(o[k])]));
  return o;
}

function normUrl(v) {
  let s = stripVersion(v);
  if (/fonts\.googleapis\.com/i.test(s)) s = s.replace(/([?&])display=[^&]*&?/i, '$1').replace(/[?&]$/, '');
  return s;
}

function visibleText(html) {
  let out = '';
  for (const t of scanHtml(html)) {
    if (t.t === 'text') out += t.v;
    else if (t.t === 'open' || t.t === 'close') out += BLOCK_TAGS.has(t.name) ? ' ' : '';
  }
  return decodeEntities(out).replace(/\s+/g, ' ').trim();
}

export function fingerprint(files) {
  const f = deliverable(files);
  const html = f['index.html'] || '';
  const parsed = parseHtml(html);
  const els = parsed.elements.filter((e) => !(e.tag === 'link' && PERF_REL.test(e.attrs.rel || '')));
  const struct = []; const urls = []; const a11y = []; const idc = []; const meta = []; const other = [];
  for (const e of els) {
    struct.push(e.tag);
    const ign = IGNORE_ATTRS[e.tag] || [];
    const ent = Object.entries(e.attrs).filter(([k]) => !ign.includes(k)).sort(([a], [b]) => (a < b ? -1 : 1));
    idc.push(`${e.tag}|${e.attrs.id || ''}|${(e.attrs.class || '').split(/\s+/).filter(Boolean).sort().join(' ')}`);
    const u = ent.filter(([k]) => URL_ATTRS.includes(k)).map(([k, v]) => `${k}=${normUrl(v)}`);
    if (u.length) urls.push(`${e.tag}|${u.join('|')}`);
    const a = ent.filter(([k]) => A11Y(k)).map(([k, v]) => `${k}=${v}`);
    if (a.length) a11y.push(`${e.tag}|${a.join('|')}`);
    if (e.tag === 'meta' || e.tag === 'title') meta.push(`${e.tag}|${ent.map(([k, v]) => `${k}=${v}`).join('|')}`);
    other.push(`${e.tag}|${ent.filter(([k]) => !URL_ATTRS.includes(k)).map(([k, v]) => `${k}=${v}`).join('|')}`);
  }
  const ld = []; const inlineJs = []; const inlineCss = [];
  for (const e of els) {
    if (e.tag === 'script' && !e.attrs.src) {
      if ((e.attrs.type || '').toLowerCase() === 'application/ld+json') {
        try { ld.push(JSON.stringify(canon(JSON.parse(e.rawText || '')))); } catch { ld.push(`INVALID:${(e.rawText || '').trim()}`); }
      } else inlineJs.push(e.rawText || '');
    }
    if (e.tag === 'style') inlineCss.push(e.rawText || '');
  }
  const headings = [...html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '').matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)]
    .map((m) => `h${m[1]}:${decodeEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()}`);
  const classes = [...new Set(els.flatMap((e) => (e.attrs.class || '').split(/\s+/).filter(Boolean)))].sort();
  const ids = els.map((e) => e.attrs.id).filter(Boolean).sort();
  return { text: visibleText(html), struct, urls, a11y, idc, classes, ids, meta: [...meta, ...ld.map((x) => `ld|${x}`)], headings, inlineJs, inlineCss, other };
}

function cmp(id, name, a, b, extra = '') {
  const same = a.length === b.length && a.every((x, i) => x === b[i]);
  return { id, name, passed: same, details: same ? `${a.length} elementos idénticos${extra}` : firstDiff(a, b) };
}

export function compareFingerprints(a, b) {
  const checks = [];
  checks.push({ id: 'text', name: 'Texto visible idéntico', passed: a.text === b.text, details: a.text === b.text ? `${a.text.length} caracteres` : firstDiff(a.text.split(' '), b.text.split(' ')) });
  checks.push(cmp('structure', 'Mismos elementos en el mismo orden', a.struct, b.struct));
  checks.push({ ...cmp('ids-classes', 'Mismos ids y clases usados', a.idc, b.idc), passed: a.idc.length === b.idc.length && a.idc.every((x, i) => x === b.idc[i]) && a.classes.join() === b.classes.join() && a.ids.join() === b.ids.join() });
  checks.push(cmp('urls', 'Mismos href / src / action', a.urls, b.urls));
  checks.push(cmp('headings', 'Misma estructura de headings', a.headings, b.headings));
  checks.push(cmp('a11y', 'Mismos atributos aria / alt / for / role', a.a11y, b.a11y));
  checks.push(cmp('meta-jsonld', 'Mismos meta y JSON-LD (semánticamente)', a.meta, b.meta));
  checks.push(cmp('inline-code', 'Scripts y estilos inline intactos (hash de la CSP)', [...a.inlineJs, ...a.inlineCss], [...b.inlineJs, ...b.inlineCss]));
  checks.push(cmp('attrs-other', 'Mismos atributos restantes', a.other, b.other));
  return checks;
}

export function structuralChecks(files) {
  const f = deliverable(files);
  const checks = [];
  const bad = Object.entries(f).filter(([k, v]) => k.endsWith('.js') && !compiles(v, k)).map(([k]) => k);
  checks.push({ id: 'js-compiles', name: 'Los .js compilan (vm.Script, sin ejecutar)', passed: bad.length === 0, details: bad.length ? `No compila: ${bad.join(', ')}` : 'OK' });
  const badCss = Object.entries(f).filter(([k, v]) => k.endsWith('.css') && !cssBalanced(v)).map(([k]) => k);
  checks.push({ id: 'css-balanced', name: 'CSS con llaves balanceadas', passed: badCss.length === 0, details: badCss.length ? `Desbalanceado: ${badCss.join(', ')}` : 'OK' });
  return checks;
}

const passedIds = (r) => new Set((r.checks || []).filter((c) => c.passed).map((c) => c.id));
const metIds = (r) => new Set((r.results || []).filter((c) => c.met).map((c) => c.id));

/** Foto de lo que pasan tester/security/reviewer, para exigir "mismos checks pasados" luego. */
export function paritySnapshot(files, { structure, brief } = {}) {
  const snap = { tester: new Set(), security: new Set(), review: new Set() };
  try { snap.tester = passedIds(runTests(files, structure)); } catch { /* sin datos */ }
  try { snap.security = passedIds(auditSecurity(files, structure || {}, brief || {})); } catch { /* sin datos */ }
  if (brief && structure) { try { snap.review = metIds(reviewRequirements(brief, structure, files)); } catch { /* sin datos */ } }
  return snap;
}

export function parityChecks(base, files, ctx) {
  const now = paritySnapshot(files, ctx);
  const lost = (a, b) => [...a].filter((x) => !b.has(x));
  return [['tester', 'QA (tester): mismos checks pasados'], ['security', 'Seguridad (Zoe): mismos checks pasados'], ['review', 'Reviewer: mismos requisitos cumplidos']].map(([k, name]) => {
    const l = lost(base[k], now[k]);
    return { id: `parity-${k}`, name, passed: l.length === 0, details: l.length ? `Dejaron de pasar: ${l.join(', ')}` : `${base[k].size} checks conservados` };
  });
}

/** Verificación completa de un paso: huella vs paso previo, estructura, paridad vs original. */
export function verifyStep(prevFiles, nextFiles, baseSnap, ctx) {
  return [
    ...compareFingerprints(fingerprint(prevFiles), fingerprint(nextFiles)),
    ...structuralChecks(nextFiles),
    ...parityChecks(baseSnap, nextFiles, ctx),
  ];
}
