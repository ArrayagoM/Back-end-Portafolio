// HTML: escáner sin pérdida (join de tokens == original), minificador y utilidades de edición de etiquetas.
export const BLOCK_TAGS = new Set(['html', 'head', 'body', 'title', 'meta', 'link', 'script', 'style', 'base', 'template', 'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'ul', 'br', 'option', 'optgroup', 'legend', 'menu']);
const RAW_ELEMENTS = new Set(['script', 'style', 'textarea', 'pre', 'title']);
const WS = '[ \\t\\r\\n\\f]';

/** Tokens: {t:'text'|'comment'|'doctype'|'open'|'close'|'raw', v, name?, selfClose?} */
export function scanHtml(src) {
  const toks = [];
  const n = src.length;
  let i = 0; let textStart = 0;
  const flushText = (end) => { if (end > textStart) toks.push({ t: 'text', v: src.slice(textStart, end) }); };
  while (i < n) {
    if (src[i] !== '<') { i++; continue; }
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      const end = e < 0 ? n : e + 3;
      flushText(i); toks.push({ t: 'comment', v: src.slice(i, end) }); i = textStart = end; continue;
    }
    if (/^<!doctype/i.test(src.slice(i, i + 9))) {
      const e = src.indexOf('>', i); const end = e < 0 ? n : e + 1;
      flushText(i); toks.push({ t: 'doctype', v: src.slice(i, end) }); i = textStart = end; continue;
    }
    const close = /^<\/([a-zA-Z][\w:-]*)\s*>/.exec(src.slice(i, i + 80));
    if (close) {
      flushText(i); toks.push({ t: 'close', v: close[0], name: close[1].toLowerCase() }); i = textStart = i + close[0].length; continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/.exec(src.slice(i));
    if (!m) { i++; continue; }
    flushText(i);
    const name = m[1].toLowerCase();
    toks.push({ t: 'open', v: m[0], name, selfClose: m[2].trimEnd().endsWith('/') });
    i += m[0].length; textStart = i;
    if (RAW_ELEMENTS.has(name) && !toks[toks.length - 1].selfClose) {
      const lower = src.toLowerCase();
      const e = lower.indexOf(`</${name}`, i);
      if (e < 0) { toks.push({ t: 'raw', v: src.slice(i) }); i = textStart = n; break; }
      const gt = src.indexOf('>', e);
      const end = gt < 0 ? n : gt + 1;
      toks.push({ t: 'raw', v: src.slice(i, end), name });
      i = textStart = end;
    }
  }
  flushText(n);
  return toks;
}

export const joinTokens = (toks) => toks.map((t) => t.v).join('');

/** Colapsa espacios dentro de una etiqueta (fuera de comillas); no toca atributos. */
function compactTag(tag) {
  let out = ''; let q = null; let ws = false;
  for (let i = 0; i < tag.length; i++) {
    const c = tag[i];
    if (q) { out += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { if (ws) { out += ' '; ws = false; } q = c; out += c; continue; }
    if (/\s/.test(c)) { ws = true; continue; }
    if (ws) { if (c !== '>' && !(c === '/' && tag[i + 1] === '>')) out += ' '; ws = false; }
    out += c;
  }
  return out;
}

const isBlockTag = (t, inline) => t && (t.t === 'open' || t.t === 'close') && BLOCK_TAGS.has(t.name) && !(inline && inline.has(t.name));

/**
 * Minifica HTML sin tocar <pre>, <textarea>, <script>, <style>, <title>, atributos ni texto visible.
 * opts: { inlineTags:Set (tags con display inline/inline-block en CSS), preserveText:boolean (white-space:pre en CSS) }
 */
export function minifyHtml(src, opts = {}) {
  const inline = opts.inlineTags || new Set();
  let toks = scanHtml(String(src ?? '')).filter((t) => !(t.t === 'comment' && !/^<!--\s*\[if|<!\[endif/i.test(t.v)));
  const merged = [];
  for (const t of toks) {
    const last = merged[merged.length - 1];
    if (t.t === 'text' && last && last.t === 'text') last.v += t.v; else merged.push({ ...t });
  }
  toks = merged;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'open') t.v = compactTag(t.v);
    if (t.t !== 'text' || opts.preserveText) continue;
    const prev = toks[i - 1]; const next = toks[i + 1];
    let v = t.v.replace(new RegExp(`${WS}+`, 'g'), ' ');
    const prevBlock = !prev || prev.t === 'doctype' || isBlockTag(prev, inline);
    const nextBlock = !next || isBlockTag(next, inline);
    if (v === ' ') { if (prevBlock || nextBlock) v = ''; }
    else {
      if (prevBlock && v.startsWith(' ')) v = v.slice(1);
      if (nextBlock && v.endsWith(' ')) v = v.slice(0, -1);
    }
    t.v = v;
  }
  return joinTokens(toks).trim() + '\n';
}

/** Atributos de una etiqueta de apertura (último gana no; primero gana, como el navegador). */
export function parseTagAttrs(tag) {
  const attrs = {};
  const inner = tag.replace(/^<[^\s/>]+/, '').replace(/\/?>$/, '');
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(inner))) { const k = m[1].toLowerCase(); if (!(k in attrs)) attrs[k] = m[2] ?? m[3] ?? m[4] ?? ''; }
  return attrs;
}

/** Agrega atributos (objeto) a una etiqueta de apertura, antes del cierre. */
export function addAttrs(tag, add) {
  const have = parseTagAttrs(tag);
  const extra = Object.entries(add).filter(([k]) => !(k in have)).map(([k, v]) => (v === true ? k : `${k}="${v}"`)).join(' ');
  if (!extra) return tag;
  return tag.replace(/\s*(\/?)>$/, (_, s) => ` ${extra}${s ? ' /' : ''}>`);
}

export function removeAttr(tag, name) {
  const re = new RegExp(`\\s+${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'=<>\`]+))?(?=[\\s/>])`, 'i');
  return tag.replace(re, '');
}

/** Cierre correspondiente del token i (mismo nombre, por profundidad). -1 si no hay. */
export function matchingClose(toks, i) {
  const name = toks[i].name; let d = 0;
  for (let j = i; j < toks.length; j++) {
    if (toks[j].name !== name) continue;
    if (toks[j].t === 'open' && !toks[j].selfClose) d++;
    else if (toks[j].t === 'close') { d--; if (d === 0) return j; }
  }
  return -1;
}
