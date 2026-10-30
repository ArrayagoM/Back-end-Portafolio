// Optimizaciones seguras e independientes de Lucho. Cada una: { id, name, run(files, ctx) -> {files, details}|{skip, reason} }.
// Son funciones puras sobre una copia del mapa: "revertir" = descartar el resultado (lo decide el engine tras verificar).
import { minifyCss, parseCss, pruneUnusedCss, addFontDisplaySwap, selectorRequirements, splitSelectors } from './css.js';
import { minifyJs, jsDynamicInfo } from './js.js';
import { scanHtml, joinTokens, minifyHtml, parseTagAttrs, addAttrs, removeAttr, matchingClose } from './html.js';
import { bytes, brotliBytes, gzipBytes, hash8, localPath, isExternalUrl, stripVersion, kb } from './util.js';

const cssKeys = (f) => Object.keys(f).filter((k) => k.endsWith('.css') && typeof f[k] === 'string');
const jsKeys = (f) => Object.keys(f).filter((k) => k.endsWith('.js') && typeof f[k] === 'string');
const withFile = (files, k, v) => ({ ...files, [k]: v });
const same = (a, b) => a === b;

function inlineScripts(html) {
  return scanHtml(html).flatMap((t, i, arr) => (t.t === 'raw' && t.name === 'script' && arr[i - 1] && !/\bsrc\s*=/i.test(arr[i - 1].v) && !/ld\+json/i.test(arr[i - 1].v) ? [t.v] : []));
}

/** Qué clases/ids/tags/textos usa el sitio (HTML + JS), para la poda de CSS. */
export function collectUsage(files) {
  const html = files['index.html'] || '';
  const classes = new Set(); const ids = new Set(); const tags = new Set();
  let text = '';
  const attrWords = [];
  for (const t of scanHtml(html)) {
    if (t.t !== 'open') continue;
    tags.add(t.name);
    const a = parseTagAttrs(t.v);
    for (const [k, v] of Object.entries(a)) {
      if (k === 'class') v.split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
      else {
        if (k === 'id') ids.add(v);
        attrWords.push(v);
      }
    }
  }
  const js = jsKeys(files).map((k) => files[k]).concat(inlineScripts(html)).join('\n');
  text = js + '\n' + attrWords.join(' ').replace(/[^\w-]+/g, ' ');
  const dyn = jsDynamicInfo(js);
  return { classes, ids, tags, text, prefixes: dyn.prefixes, suffixes: dyn.suffixes };
}

/** Tags con display inline / inline-block en el CSS (no se pueden quitar espacios entre ellos). */
function inlineDisplayTags(files, html) {
  const set = new Set();
  const opens = scanHtml(html).filter((t) => t.t === 'open').map((t) => ({ name: t.name, cls: (parseTagAttrs(t.v).class || '').split(/\s+/), id: parseTagAttrs(t.v).id }));
  for (const k of cssKeys(files)) {
    (function walk(items) {
      for (const it of items) {
        if (it.k === 'at') walk(it.items);
        else if (it.k === 'rule' && it.items.some((d) => d.k === 'decl' && /^display:inline(-block)?$/i.test(d.text))) {
          for (const sel of splitSelectors(it.prelude)) {
            const r = selectorRequirements(sel);
            if (r.complex) { opens.forEach((o) => set.add(o.name)); continue; }
            const last = sel.split(/[\s>+~]+/).pop();
            const lr = selectorRequirements(last);
            for (const o of opens) {
              if ((lr.classes.length && lr.classes.every((c) => o.cls.includes(c))) || (lr.ids.length && lr.ids.every((c) => o.id === c)) || (!lr.classes.length && !lr.ids.length && lr.tags.includes(o.name))) set.add(o.name);
            }
          }
        }
      }
    })(parseCss(files[k]));
  }
  return set;
}

const mapOpens = (html, fn) => {
  const toks = scanHtml(html);
  for (let i = 0; i < toks.length; i++) if (toks[i].t === 'open') { const nv = fn(toks[i], i, toks); if (nv != null) toks[i].v = nv; }
  return joinTokens(toks);
};

// ---------------------------------------------------------------- CSS
const cssMinify = {
  id: 'css-minify', name: 'Minificar CSS',
  run(files) {
    const out = { ...files }; let n = 0;
    for (const k of cssKeys(files)) { const m = minifyCss(files[k]); if (m.length < files[k].length) { out[k] = m; n++; } }
    return n ? { files: out, details: `${n} hoja(s): comentarios, espacios, ceros y ';' finales fuera (strings, url(), calc() y var() intactos).` } : { skip: true, reason: 'el CSS ya está minificado' };
  },
};

const cssUnused = {
  id: 'css-unused', name: 'Quitar CSS no usado (seguro)',
  run(files) {
    const usage = collectUsage(files);
    const out = { ...files }; const removed = []; const kf = [];
    for (const k of cssKeys(files)) {
      const r = pruneUnusedCss(files[k], usage);
      if (r.css.length < files[k].length) { out[k] = r.css; removed.push(...r.removed); kf.push(...r.keyframesRemoved); }
    }
    if (!removed.length && !kf.length) return { skip: true, reason: 'no hay reglas claramente sin uso' };
    return { files: out, removed, details: `${removed.length} selector(es) sin uso quitados${kf.length ? ` y ${kf.length} @keyframes huérfano(s)` : ''}: ${removed.slice(0, 6).join(', ')}${removed.length > 6 ? '…' : ''}` };
  },
};

// ---------------------------------------------------------------- JS
const jsMinify = {
  id: 'js-minify', name: 'Minificar JS (conservador)',
  run(files) {
    const out = { ...files }; const notes = []; let n = 0;
    for (const k of jsKeys(files)) {
      const r = minifyJs(files[k]);
      if (!r.ok) { notes.push(`${k}: sin tocar (${r.reason})`); continue; }
      if (r.code.length < files[k].length) { out[k] = r.code; n++; notes.push(`${k}: modo ${r.mode}`); }
    }
    return n ? { files: out, details: notes.join('; ') } : { skip: true, reason: notes.join('; ') || 'sin JS para minificar' };
  },
};

// ---------------------------------------------------------------- HTML
const htmlMinify = {
  id: 'html-minify', name: 'Minificar HTML',
  run(files) {
    const html = files['index.html'];
    if (typeof html !== 'string') return { skip: true, reason: 'no hay index.html' };
    const css = cssKeys(files).map((k) => files[k]).join('\n');
    const m = minifyHtml(html, { inlineTags: inlineDisplayTags(files, html), preserveText: /white-space\s*:\s*(pre|break-spaces)/i.test(css) });
    return m.length < html.length ? { files: withFile(files, 'index.html', m), details: 'Comentarios y espacios entre etiquetas fuera; <pre>, <textarea>, <script>, <style> y atributos intactos.' } : { skip: true, reason: 'el HTML ya está minificado' };
  },
};

// ---------------------------------------------------------------- imágenes
function foldIndex(toks) {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t !== 'open' || t.selfClose) continue;
    const a = parseTagAttrs(t.v);
    if (t.name === 'section' || /hero/i.test(`${a.id || ''} ${a.class || ''}`) && ['div', 'section', 'header', 'article'].includes(t.name)) {
      const c = matchingClose(toks, i);
      if (c > 0) return c;
    }
  }
  let len = 0;
  for (let i = 0; i < toks.length; i++) { len += toks[i].v.length; if (len > 6000) return i; }
  return toks.length;
}

const lazyMedia = {
  id: 'lazy-media', name: 'Lazy-loading y prioridad de imágenes',
  run(files) {
    const html = files['index.html'];
    if (typeof html !== 'string') return { skip: true, reason: 'no hay index.html' };
    const toks = scanHtml(html);
    const fold = foldIndex(toks);
    let first = true; let lazy = 0; let high = 0; let asyncOnly = 0;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.t !== 'open' || (t.name !== 'img' && t.name !== 'iframe')) continue;
      const a = parseTagAttrs(t.v);
      const above = i <= fold;
      if (t.name === 'iframe') { if (!above) { const nv = addAttrs(t.v, { loading: 'lazy' }); if (nv !== t.v) { t.v = nv; lazy++; } } continue; }
      if (above) {
        let v = t.v;
        if (/^lazy$/i.test(a.loading || '')) v = removeAttr(v, 'loading');
        if (first && !/^data:/i.test(a.src || '')) { v = addAttrs(v, { fetchpriority: 'high', decoding: 'async' }); high++; first = false; } else { v = addAttrs(v, { decoding: 'async' }); asyncOnly++; }
        t.v = v;
      } else {
        const nv = addAttrs(t.v, { loading: 'lazy', decoding: 'async' });
        if (nv !== t.v) { t.v = nv; lazy++; }
      }
    }
    const out = joinTokens(toks);
    return out === html ? { skip: true, reason: 'no hay <img>/<iframe> para optimizar' } : { files: withFile(files, 'index.html', out), details: `${lazy} medio(s) bajo el pliegue con loading="lazy"; ${high} candidata(s) LCP con fetchpriority="high"; ${asyncOnly} sobre el pliegue con decoding="async".` };
  },
};

function svgSize(svg) {
  const vb = /viewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([\d.eE]+)[\s,]+([\d.eE]+)\s*["']/i.exec(svg);
  if (vb && +vb[3] > 0 && +vb[4] > 0) return [+vb[3], +vb[4]];
  const w = /<svg[^>]*\swidth\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(svg); const h = /<svg[^>]*\sheight\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(svg);
  return w && h && +w[1] > 0 && +h[1] > 0 ? [+w[1], +h[1]] : null;
}
function srcSvgSize(src, files) {
  if (/^data:image\/svg\+xml/i.test(src)) {
    try {
      const body = src.slice(src.indexOf(',') + 1);
      return svgSize(/;base64,/i.test(src) ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body));
    } catch { return null; }
  }
  const p = localPath(src);
  if (p && /\.svg$/i.test(p) && typeof files[p] === 'string') return svgSize(files[p]);
  return null;
}

const imgDimensions = {
  id: 'img-dimensions', name: 'width/height en imágenes (evita CLS)',
  run(files) {
    const html = files['index.html'];
    if (typeof html !== 'string') return { skip: true, reason: 'no hay index.html' };
    let n = 0;
    const out = mapOpens(html, (t) => {
      if (t.name !== 'img') return null;
      const a = parseTagAttrs(t.v);
      if (a.width !== undefined && a.height !== undefined) return null;
      if (/aspect-ratio/i.test(a.style || '')) return null;
      const sz = a.src ? srcSvgSize(a.src, files) : null;
      if (!sz) return null;
      let v = t.v;
      if (a.width !== undefined) v = removeAttr(v, 'width');
      if (a.height !== undefined) v = removeAttr(v, 'height');
      n++;
      const r = (x) => String(Math.round(x * 100) / 100);
      return addAttrs(v, { width: r(sz[0]), height: r(sz[1]) });
    });
    if (!n) return { skip: true, reason: 'no hay <img> sin dimensiones con tamaño inferible (SVG con viewBox)' };
    const out2 = { ...files, 'index.html': out };
    const ck = cssKeys(files).find((k) => k === 'styles.css') || cssKeys(files)[0];
    if (ck && !/img\[width\]\[height\]/.test(files[ck])) out2[ck] = files[ck] + (files[ck].endsWith('}') || !files[ck] ? '' : ';') + 'img[width][height]{height:auto}';
    return { files: out2, details: `${n} <img> con width/height inferidos del viewBox + regla img[width][height]{height:auto} para no deformarlas.` };
  },
};

// ---------------------------------------------------------------- fuentes y orígenes
const fontDisplay = {
  id: 'font-display', name: 'font-display:swap en fuentes',
  run(files) {
    let out = { ...files }; const notes = [];
    const html = files['index.html'];
    if (typeof html === 'string') {
      let n = 0;
      const h2 = mapOpens(html, (t) => {
        if (t.name !== 'link' || !/stylesheet/i.test(t.v)) return null;
        const a = parseTagAttrs(t.v);
        if (!/^https:\/\/fonts\.googleapis\.com\/css/i.test(a.href || '') || /[?&]display=/i.test(a.href)) return null;
        n++;
        return t.v.replace(a.href, a.href + '&display=swap');
      });
      if (n) { out['index.html'] = h2; notes.push(`${n} URL(s) de Google Fonts con &display=swap`); }
    }
    for (const k of cssKeys(files)) {
      const r = addFontDisplaySwap(files[k]);
      if (r.count) { out[k] = r.css; notes.push(`${r.count} @font-face con font-display:swap en ${k}`); }
    }
    return notes.length ? { files: out, details: notes.join('; ') } : { skip: true, reason: 'las fuentes ya usan swap (o no hay fuentes)' };
  },
};

function originOf(u) { try { return new URL(u.startsWith('//') ? `https:${u}` : u).origin; } catch { return null; } }

const preconnect = {
  id: 'preconnect', name: 'Preconnect solo a orígenes realmente usados',
  run(files) {
    const html = files['index.html'];
    if (typeof html !== 'string') return { skip: true, reason: 'no hay index.html' };
    const toks = scanHtml(html);
    const used = new Set();
    for (const t of toks) {
      if (t.t !== 'open') continue;
      const a = parseTagAttrs(t.v);
      if (t.name === 'link' && /preconnect|dns-prefetch/i.test(a.rel || '')) continue;
      for (const k of ['href', 'src', 'poster', 'data']) if (a[k] && isExternalUrl(a[k])) { const o = originOf(a[k]); if (o) used.add(o); }
    }
    for (const k of cssKeys(files)) for (const m of files[k].matchAll(/url\(\s*["']?(https?:\/\/[^"')\s]+)/gi)) { const o = originOf(m[1]); if (o) used.add(o); }
    const usesFonts = used.has('https://fonts.googleapis.com');
    if (usesFonts) used.add('https://fonts.gstatic.com');
    const have = new Set(); let removed = 0; let added = 0;
    const kept = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.t === 'open' && t.name === 'link' && /preconnect|dns-prefetch/i.test(t.v)) {
        const a = parseTagAttrs(t.v); const o = originOf(a.href || '');
        if (!o || !used.has(o)) { removed++; if (toks[i + 1] && toks[i + 1].t === 'text' && !toks[i + 1].v.trim()) toks[i + 1].v = ''; toks[i].v = ''; continue; }
        have.add(o);
      }
      kept.push(t);
    }
    let out = joinTokens(kept);
    if (usesFonts) {
      const need = [];
      if (!have.has('https://fonts.googleapis.com')) need.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
      if (!have.has('https://fonts.gstatic.com')) need.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      if (need.length) {
        const idx = out.search(/<link[^>]*rel=["']stylesheet["'][^>]*fonts\.googleapis\.com/i);
        const at = idx >= 0 ? idx : out.indexOf('</head>');
        if (at >= 0) { out = out.slice(0, at) + need.join('\n') + '\n' + out.slice(at); added = need.length; }
      }
    }
    return out === html ? { skip: true, reason: 'los preconnect ya son los correctos' } : { files: withFile(files, 'index.html', out), details: `${added} preconnect agregado(s) (Google Fonts), ${removed} a orígenes sin uso quitado(s).` };
  },
};

const scriptDefer = {
  id: 'script-defer', name: 'defer en scripts propios',
  run(files) {
    const html = files['index.html'];
    if (typeof html !== 'string') return { skip: true, reason: 'no hay index.html' };
    const toks = scanHtml(html);
    let n = 0;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.t !== 'open' || t.name !== 'script') continue;
      const a = parseTagAttrs(t.v);
      if (!a.src || 'defer' in a || 'async' in a || /module/i.test(a.type || '')) continue;
      const laterInline = toks.slice(i + 1).some((x, j, arr) => x.t === 'open' && x.name === 'script' && !/\bsrc\s*=/i.test(x.v) && !/ld\+json/i.test(x.v) && arr[j + 1] && arr[j + 1].t === 'raw' && arr[j + 1].v.replace(/<\/script\s*>$/i, '').trim());
      if (laterInline) continue;
      t.v = addAttrs(t.v, { defer: true }); n++;
    }
    return n ? { files: withFile(files, 'index.html', joinTokens(toks)), details: `${n} script(s) con defer.` } : { skip: true, reason: 'los scripts ya usan defer (o hay inline que depende de ellos)' };
  },
};

// ---------------------------------------------------------------- caché
export const HEADERS_BEGIN = '# --- Rendimiento (Lucho): caché y compresión ---';
export const HEADERS_END = '# --- fin Rendimiento ---';

export function buildPerfHeaders(versioned) {
  const lines = [HEADERS_BEGIN, '# El hosting debe servir Brotli/gzip (Netlify y Cloudflare Pages lo hacen solos; en Nginx/Apache activalo).',
    '/', '  Cache-Control: public, max-age=0, must-revalidate', '/index.html', '  Cache-Control: public, max-age=0, must-revalidate'];
  for (const p of versioned) lines.push(`/${p}`, '  Cache-Control: public, max-age=31536000, immutable');
  lines.push('/robots.txt', '  Cache-Control: public, max-age=3600', '/sitemap.xml', '  Cache-Control: public, max-age=3600', HEADERS_END);
  return lines.join('\n');
}

export function withVary(headers) {
  if (/^\s+Vary:\s*Accept-Encoding/mi.test(headers)) return headers;
  if (/^\/\*\s*$/m.test(headers)) return headers.replace(/^(\/\*\s*)$/m, '$1\n  Vary: Accept-Encoding');
  return headers.replace(/\s*$/, '\n') + '/*\n  Vary: Accept-Encoding\n';
}

const VERSIONABLE = /\.(css|js|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf)$/i;

const cacheHeaders = {
  id: 'cache-headers', name: 'Caché inmutable con ?v=hash + Vary',
  run(files, ctx) {
    const html = files['index.html'];
    if (typeof html !== 'string') return { skip: true, reason: 'no hay index.html' };
    const versioned = new Set();
    const out = mapOpens(html, (t) => {
      const a = parseTagAttrs(t.v);
      let attr = null;
      if (t.name === 'link' && /stylesheet|icon|preload/i.test(a.rel || '')) attr = 'href';
      else if ((t.name === 'script' || t.name === 'img') && a.src) attr = 'src';
      if (!attr || !a[attr]) return null;
      const p = localPath(a[attr]);
      if (!p || !VERSIONABLE.test(p) || typeof files[p] !== 'string' || /[?&]v=/.test(a[attr])) {
        if (p && /[?&]v=/.test(a[attr]) && typeof files[p] === 'string') versioned.add(p);
        return null;
      }
      versioned.add(p);
      const base = a[attr].split('#')[0];
      const nv = `${stripVersion(base)}${base.includes('?') ? '&' : '?'}v=${hash8(files[p])}`;
      return t.v.replace(a[attr], nv);
    });
    let headers = typeof files['_headers'] === 'string' ? files['_headers'] : '';
    headers = headers.replace(new RegExp(`\\n?${HEADERS_BEGIN.replace(/[()]/g, '\\$&')}[\\s\\S]*?${HEADERS_END}\\n?`), '\n');
    headers = withVary(headers).replace(/\s*$/, '\n') + '\n' + buildPerfHeaders([...versioned]) + '\n';
    ctx.notes.push('Compresión: el hosting debe servir Brotli/gzip (Netlify y Cloudflare Pages lo hacen solos; en Nginx/Apache activalo). Se agregó Vary: Accept-Encoding.');
    const res = { ...files, 'index.html': out, '_headers': headers };
    return { files: res, details: `${versioned.size} archivo(s) versionados con ?v=hash (${[...versioned].join(', ') || 'ninguno'}), nombres estables; HTML con must-revalidate, assets versionados immutable; Vary: Accept-Encoding.` };
  },
};

export const OPTIMIZATIONS = [cssMinify, cssUnused, jsMinify, htmlMinify, lazyMedia, imgDimensions, fontDisplay, preconnect, scriptDefer, cacheHeaders];
export { same, brotliBytes, gzipBytes, kb, bytes };
