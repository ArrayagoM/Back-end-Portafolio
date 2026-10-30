// Minificador y podador de CSS propio (tokenizador + AST). Respeta strings, url(), calc(), @media, @supports, var().
const isWs = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const PUNCT = '{};,:()[]';

function scanString(src, i) {
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === q) return j + 1;
    if (src[j] === '\n') return j;
    j++;
  }
  return src.length;
}

export function tokenizeCss(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  const pushWs = () => { if (toks.length && toks[toks.length - 1].t === 'ws') return; toks.push({ t: 'ws', v: ' ' }); };
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; pushWs(); continue; }
    if (isWs(c)) { while (i < n && isWs(src[i])) i++; pushWs(); continue; }
    if (c === '"' || c === "'") { const j = scanString(src, i); toks.push({ t: 'raw', v: src.slice(i, j) }); i = j; continue; }
    if (PUNCT.includes(c)) { toks.push({ t: 'p', v: c }); i++; continue; }
    let j = i;
    while (j < n && !isWs(src[j]) && !PUNCT.includes(src[j]) && src[j] !== '"' && src[j] !== "'" && !(src[j] === '/' && src[j + 1] === '*')) {
      if (src[j] === '\\') j++;
      j++;
    }
    if (j === i) j = i + 1;
    const word = src.slice(i, j);
    if (/^url$/i.test(word) && src[j] === '(') {
      let k = j + 1;
      while (k < n && isWs(src[k])) k++;
      let end;
      if (src[k] === '"' || src[k] === "'") {
        end = scanString(src, k);
        while (end < n && isWs(src[end])) end++;
        if (src[end] === ')') end++;
      } else {
        end = k;
        while (end < n && src[end] !== ')') { if (src[end] === '\\') end++; end++; }
        end = Math.min(n, end + 1);
      }
      toks.push({ t: 'raw', v: src.slice(i, end) });
      i = end;
      continue;
    }
    toks.push({ t: 'w', v: word });
    i = j;
  }
  return toks;
}

const ZERO_UNITS = /^(px|em|rem|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/i;
const NO_ZERO_PROPS = new Set(['flex', 'flex-basis', '-webkit-box-flex', 'font']);

function fixWordNumber(v, allowZeroUnit) {
  return v.split('/').map((part) => {
    const m = /^([+-]?)(\d*\.?\d+)([a-zA-Z%]*)$/.exec(part);
    if (!m) return part;
    let [, sign, num, unit] = m;
    if (num.includes('.')) {
      num = num.replace(/0+$/, '').replace(/\.$/, '');
      if (num.startsWith('0.')) num = num.slice(1);
      if (num === '') num = '0';
    }
    if (/^0*$/.test(num)) { num = '0'; sign = ''; if (allowZeroUnit && ZERO_UNITS.test(unit)) unit = ''; }
    else if (/^0+\d/.test(num)) num = num.replace(/^0+/, '');
    return sign + num + unit;
  }).join('/');
}

// Serializa un segmento de tokens. mode: 'sel' | 'at' | 'decl'
function ser(seg, mode, ctx = {}) {
  const t = seg.slice();
  while (t.length && t[0].t === 'ws') t.shift();
  while (t.length && t[t.length - 1].t === 'ws') t.pop();
  let out = '';
  let depth = 0; let bracket = 0; let colonSeen = false; let prev = null; let pendingWs = false;
  let prop = '';
  const custom = mode === 'decl' && t.length && t[0].t === 'w' && t[0].v.startsWith('--');
  for (const tok of t) {
    if (tok.t === 'ws') { pendingWs = true; continue; }
    if (pendingWs && out) {
      let need = true;
      const pv = prev;
      if (pv.t === 'p' && '{};,(['.includes(pv.v)) need = false;
      if (tok.t === 'p' && ',;{})]'.includes(tok.v)) need = false;
      if (mode === 'decl') {
        if (tok.t === 'p' && tok.v === ':' && !colonSeen) need = false;
        if (pv.t === 'p' && pv.v === ':' && out.endsWith(':') && colonSeen && !custom && out.length === out.indexOf(':') + 1) need = false;
        if (!custom && tok.t === 'w' && tok.v.startsWith('!')) need = false;
      }
      if (mode === 'at' && depth > 0 && ((tok.t === 'p' && tok.v === ':') || (pv.t === 'p' && pv.v === ':'))) need = false;
      if (mode === 'sel' && depth === 0 && bracket === 0) {
        if (pv.t === 'w' && /(^|[^\\])[>+~]$/.test(pv.v)) need = false;
        if (tok.t === 'w' && /^[>+~]/.test(tok.v)) need = false;
      }
      if (need) out += ' ';
    }
    pendingWs = false;
    if (tok.t === 'p') {
      if (tok.v === '(') depth++;
      else if (tok.v === ')') depth = Math.max(0, depth - 1);
      else if (tok.v === '[') bracket++;
      else if (tok.v === ']') bracket = Math.max(0, bracket - 1);
      else if (tok.v === ':' && mode === 'decl' && !colonSeen && depth === 0) { colonSeen = true; prop = out.trim().toLowerCase(); }
      out += tok.v;
    } else if (tok.t === 'w' && mode === 'decl' && colonSeen && !custom && !ctx.noNumbers) {
      out += fixWordNumber(tok.v, depth === 0 && !NO_ZERO_PROPS.has(prop));
    } else {
      out += tok.v;
    }
    prev = tok;
  }
  return out;
}

/** Parser: lista de items [{k:'decl'|'stmt'|'rule'|'at', text|prelude, items}] */
export function parseCss(src) {
  const toks = tokenizeCss(src);
  let pos = 0;
  function block(ctx) {
    const items = [];
    let seg = [];
    let depth = 0;
    const flush = () => {
      const nonWs = seg.filter((x) => x.t !== 'ws');
      if (nonWs.length) {
        const first = nonWs[0];
        if (first.t === 'w' && first.v.startsWith('@')) items.push({ k: 'stmt', text: ser(seg, 'at') });
        else items.push({ k: 'decl', text: ser(seg, 'decl', ctx) });
      }
      seg = [];
    };
    while (pos < toks.length) {
      const t = toks[pos];
      if (t.t === 'p') {
        if (t.v === '(' || t.v === '[') depth++;
        else if (t.v === ')' || t.v === ']') depth = Math.max(0, depth - 1);
        else if (depth === 0 && t.v === ';') { pos++; flush(); continue; }
        else if (depth === 0 && t.v === '}') { pos++; flush(); return items; }
        else if (depth === 0 && t.v === '{') {
          pos++;
          const nonWs = seg.filter((x) => x.t !== 'ws');
          const isAt = nonWs.length && nonWs[0].t === 'w' && nonWs[0].v.startsWith('@');
          const prelude = ser(seg, isAt ? 'at' : 'sel');
          seg = [];
          const sub = { ...ctx };
          if (isAt && /^@property/i.test(prelude)) sub.noNumbers = true;
          const kids = block(sub);
          items.push({ k: isAt ? 'at' : 'rule', prelude, items: kids });
          continue;
        }
      }
      seg.push(t);
      pos++;
    }
    flush();
    return items;
  }
  return block({});
}

export function printItems(items) {
  let out = '';
  for (const it of items) {
    if (it.k === 'decl' || it.k === 'stmt') out += it.text + ';';
    else {
      let inner = printItems(it.items);
      if (inner.endsWith(';')) inner = inner.slice(0, -1);
      out += it.prelude + '{' + inner + '}';
    }
  }
  return out;
}

export function minifyCss(src) {
  let out = printItems(parseCss(String(src ?? '')));
  const tail = out.slice(out.lastIndexOf('}') + 1);
  if (out.endsWith(';') && !tail.startsWith('@')) out = out.slice(0, -1);
  return out;
}

export function cssStats(src) {
  let rules = 0; let decls = 0; let ats = 0;
  (function walk(items) {
    for (const it of items) {
      if (it.k === 'decl') decls++;
      else if (it.k === 'stmt') ats++;
      else { if (it.k === 'rule') rules++; else ats++; walk(it.items); }
    }
  })(parseCss(src));
  return { rules, decls, ats };
}

/** Llaves y paréntesis balanceados (ignora strings, comentarios y url()). */
export function cssBalanced(src) {
  let b = 0; let p = 0; let k = 0;
  for (const t of tokenizeCss(src)) {
    if (t.t !== 'p') continue;
    if (t.v === '{') b++;
    else if (t.v === '}') { b--; if (b < 0) return false; }
    else if (t.v === '(') p++;
    else if (t.v === ')') { p--; if (p < 0) return false; }
    else if (t.v === '[') k++;
    else if (t.v === ']') { k--; if (k < 0) return false; }
  }
  return b === 0 && p === 0 && k === 0;
}

// ---------- poda de CSS no usado ----------
export function splitSelectors(sel) {
  const parts = []; let depth = 0; let cur = ''; let q = null;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (q) { cur += c; if (c === '\\') { cur += sel[++i] ?? ''; } else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '\\') { cur += c + (sel[++i] ?? ''); continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += c;
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const IDENT = /[A-Za-z0-9_ -￿-]/;
/** Requisitos de un selector. complex=true => no analizable: se conserva. */
export function selectorRequirements(s) {
  const r = { classes: [], ids: [], tags: [], complex: false };
  let i = 0; let start = true;
  const readIdent = () => { let j = i; while (j < s.length && IDENT.test(s[j])) j++; const v = s.slice(i, j); i = j; return v; };
  const skipGroup = (open, close) => {
    let d = 0; let q = null;
    for (; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === open) d++;
      else if (c === close) { d--; if (d === 0) { i++; return; } }
    }
  };
  while (i < s.length) {
    const c = s[i];
    if (c === '\\' || c === '&' || c === '%' || c === '|' || c === '@') { r.complex = true; return r; }
    if (c === '.') { i++; const v = readIdent(); if (!v) { r.complex = true; return r; } r.classes.push(v); start = false; continue; }
    if (c === '#') { i++; const v = readIdent(); if (!v) { r.complex = true; return r; } r.ids.push(v); start = false; continue; }
    if (c === '[') { skipGroup('[', ']'); start = false; continue; }
    if (c === '(') { skipGroup('(', ')'); continue; }
    if (c === ':') { i++; if (s[i] === ':') i++; readIdent(); start = false; continue; }
    if (c === ' ' || c === '>' || c === '+' || c === '~' || c === ',') { i++; start = true; continue; }
    if (c === '*') { i++; start = false; continue; }
    if (/[A-Za-z]/.test(c)) { const v = readIdent(); if (start) r.tags.push(v.toLowerCase()); start = false; continue; }
    r.complex = true; return r;
  }
  return r;
}

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(?<![\\w-])${esc(w)}(?![\\w-])`);
const ALWAYS_TAGS = new Set(['html', 'body', 'head', 'main']);
const PRUNABLE_AT = /^@(media|supports|layer|container)\b/i;

/**
 * usage: { classes:Set, ids:Set, tags:Set, text:string (JS + valores de atributos), prefixes:[], suffixes:[] }
 * Devuelve { css, removed:[selector], keyframesRemoved:[name] }. Ante cualquier duda conserva.
 */
export function pruneUnusedCss(css, usage) {
  const items = parseCss(css);
  const removed = [];
  const reCache = new Map();
  const inText = (w) => { if (!reCache.has(w)) reCache.set(w, wordRe(w).test(usage.text)); return reCache.get(w); };
  const dyn = (c) => (usage.prefixes || []).some((p) => p && c.startsWith(p)) || (usage.suffixes || []).some((p) => p && c.endsWith(p));
  const classUsed = (c) => usage.classes.has(c) || inText(c) || dyn(c);
  const idUsed = (c) => usage.ids.has(c) || inText(c);
  const tagUsed = (t) => ALWAYS_TAGS.has(t) || t.includes('-') || usage.tags.has(t) || inText(t);
  const selectorKept = (sel) => {
    const r = selectorRequirements(sel);
    if (r.complex) return true;
    return r.classes.every(classUsed) && r.ids.every(idUsed) && r.tags.every(tagUsed);
  };
  function prune(list) {
    const out = [];
    for (const it of list) {
      if (it.k === 'rule') {
        if (it.items.some((x) => x.k === 'rule' || x.k === 'at')) { out.push(it); continue; }
        const sels = splitSelectors(it.prelude);
        const keep = sels.filter((s) => selectorKept(s));
        sels.filter((s) => !keep.includes(s)).forEach((s) => removed.push(s));
        if (!keep.length) continue;
        out.push(keep.length === sels.length ? it : { ...it, prelude: keep.join(',') });
      } else if (it.k === 'at' && PRUNABLE_AT.test(it.prelude)) {
        const kids = prune(it.items);
        if (kids.length || it.items.length === 0) out.push({ ...it, items: kids });
        else removed.push(`${it.prelude} {…}`);
      } else out.push(it);
    }
    return out;
  }
  let pruned = prune(items);
  const keyframesRemoved = [];
  const kfName = (it) => (/^@(-webkit-)?keyframes\s+(.+)$/i.exec(it.prelude) || [])[2];
  const kfAll = pruned.filter((x) => x.k === 'at' && kfName(x));
  if (kfAll.length) {
    const rest = printItems(pruned.filter((x) => !(x.k === 'at' && kfName(x)))) + '\n' + usage.text;
    pruned = pruned.filter((x) => {
      const nm = x.k === 'at' && kfName(x);
      if (!nm) return true;
      const clean = nm.replace(/^["']|["']$/g, '');
      if (wordRe(clean).test(rest)) return true;
      keyframesRemoved.push(clean);
      return false;
    });
  }
  return { css: printItems(pruned), removed, keyframesRemoved };
}

/** Agrega font-display:swap a los @font-face que no lo declaran. */
export function addFontDisplaySwap(css) {
  let count = 0;
  const items = parseCss(css);
  (function walk(list) {
    for (const it of list) {
      if (it.k === 'at') {
        if (/^@font-face/i.test(it.prelude)) {
          if (!it.items.some((d) => d.k === 'decl' && /^font-display\s*:/i.test(d.text))) { it.items.push({ k: 'decl', text: 'font-display:swap' }); count++; }
        } else walk(it.items);
      }
    }
  })(items);
  return { css: printItems(items), count };
}
