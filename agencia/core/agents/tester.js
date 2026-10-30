// Agente QA-1 (Tester): checks estáticos reales sobre el sitio generado.
// Sin red, sin navegador, sin ejecutar el JS generado (solo se compila).
import vm from 'node:vm';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const OPTIONAL_CLOSE = new Set(['p', 'li', 'dt', 'dd', 'tr', 'td', 'th', 'option', 'thead', 'tbody', 'tfoot', 'colgroup']);
const RAW_TEXT = new Set(['script', 'style']);

export function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCP(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCP(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function safeCP(n) { try { return String.fromCodePoint(n); } catch { return ''; } }

function lineAt(src, idx) {
  let n = 1;
  for (let i = 0; i < idx && i < src.length; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/** Parser mínimo propio. Devuelve { errors:[string], elements:[{tag,attrs,line,inLabel,inHead,index}], hasDoctype } */
export function parseHtml(html) {
  const src = String(html ?? '');
  const errors = [];
  const elements = [];
  const stack = [];
  let hasDoctype = false;
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/gi;
  let m;
  while ((m = re.exec(src))) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue;
    if (/^<!doctype/i.test(tok)) { hasDoctype = true; continue; }
    if (m[1]) {
      const tag = m[1].toLowerCase();
      if (VOID.has(tag)) { errors.push(`línea ${lineAt(src, m.index)}: </${tag}> es una etiqueta void y no se cierra`); continue; }
      let idx = -1;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { idx = i; break; }
      if (idx === -1) { errors.push(`línea ${lineAt(src, m.index)}: </${tag}> sin etiqueta de apertura`); continue; }
      while (stack.length - 1 > idx) {
        const top = stack.pop();
        if (!OPTIONAL_CLOSE.has(top.tag)) errors.push(`línea ${top.line}: <${top.tag}> sin cerrar (se cerró <${tag}> antes)`);
      }
      stack.pop();
      continue;
    }
    const tag = m[2].toLowerCase();
    const attrs = parseAttrs(m[3]);
    const el = {
      tag, attrs, line: lineAt(src, m.index), index: m.index,
      inLabel: stack.some((s) => s.tag === 'label'),
      inHead: stack.some((s) => s.tag === 'head'),
    };
    elements.push(el);
    const selfClosed = m[4] === '/';
    if (VOID.has(tag) || selfClosed) continue;
    if (RAW_TEXT.has(tag)) {
      const close = src.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      if (close === -1) { errors.push(`línea ${el.line}: <${tag}> sin cerrar`); break; }
      el.rawText = src.slice(re.lastIndex, close);
      const end = src.indexOf('>', close);
      re.lastIndex = end === -1 ? src.length : end + 1;
      continue;
    }
    if (OPTIONAL_CLOSE.has(tag) && stack.length && stack[stack.length - 1].tag === tag && (tag === 'p' || tag === 'li' || tag === 'option')) {
      stack.pop();
    }
    stack.push({ tag, line: el.line });
  }
  for (const s of stack) if (!OPTIONAL_CLOSE.has(s.tag)) errors.push(`línea ${s.line}: <${s.tag}> sin cerrar`);
  return { errors, elements, hasDoctype };
}

export function stripNonVisible(html) {
  return String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' ');
}

/** Texto visible (sin tags, con entidades decodificadas, espacios colapsados). */
export function visibleText(html) {
  return decodeEntities(stripNonVisible(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// ---------- color ----------
export function parseHex(c) {
  if (typeof c !== 'string') return null;
  let h = c.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(a, b) {
  const A = parseHex(a), B = parseHex(b);
  if (!A || !B) return null;
  const [hi, lo] = [lum(A), lum(B)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const r2 = (n) => Math.round(n * 100) / 100;

// ---------- helpers ----------
const isExternal = (u) => /^(https?:)?\/\//i.test(u) || /^(data|mailto|tel|javascript):/i.test(u);
const normPath = (p) => String(p).split(/[?#]/)[0].replace(/^\.\//, '').replace(/^\//, '');

function deliverable(files) {
  const out = {};
  for (const [k, v] of Object.entries(files || {})) if (!k.startsWith('partials/') && typeof v === 'string') out[k] = v;
  return out;
}

function chk(id, name, passed, details) {
  return { id, name, passed: !!passed, details: details || (passed ? 'OK' : '') };
}
const list = (arr, n = 6) => arr.slice(0, n).join('; ') + (arr.length > n ? `; … (+${arr.length - n} más)` : '');

/** QAResult: { passed, checks:[{id,name,passed,details}] } */
export function runTests(files, structure) {
  const f = deliverable(files);
  const checks = [];
  const html = f['index.html'];
  const css = Object.entries(f).filter(([k]) => k.endsWith('.css')).map(([, v]) => v).join('\n');
  const theme = structure?.theme?.palette || {};

  checks.push(chk('html-exists', 'Existe index.html con contenido', typeof html === 'string' && html.length > 200,
    typeof html === 'string' ? (html.length > 200 ? `index.html (${html.length} bytes)` : `index.html casi vacío (${html.length} bytes)`) : 'Falta index.html en los archivos generados.'));

  if (typeof html !== 'string') {
    return { passed: false, checks };
  }

  const parsed = parseHtml(html);
  const els = parsed.elements;
  const byTag = (t) => els.filter((e) => e.tag === t);

  // Estructura
  checks.push(chk('html-wellformed', 'HTML bien formado (tags balanceados)', parsed.errors.length === 0,
    parsed.errors.length ? list(parsed.errors) : 'Todas las etiquetas abren y cierran correctamente.'));
  checks.push(chk('html-doctype', 'Declara <!DOCTYPE html>', parsed.hasDoctype && /^\s*<!doctype html>/i.test(html),
    parsed.hasDoctype ? 'OK' : 'Agregá <!DOCTYPE html> como primera línea de index.html.'));
  const htmlEl = byTag('html')[0];
  checks.push(chk('html-lang', 'Atributo lang en <html>', !!(htmlEl && htmlEl.attrs.lang),
    htmlEl?.attrs.lang ? `lang="${htmlEl.attrs.lang}"` : 'Falta <html lang="es">.'));
  const charset = els.find((e) => e.tag === 'meta' && (e.attrs.charset || /charset/i.test(e.attrs['http-equiv'] ? e.attrs.content || '' : '')));
  checks.push(chk('html-charset', 'Declara charset UTF-8', !!charset && /utf-?8/i.test(charset.attrs.charset || charset.attrs.content || ''),
    charset ? `charset=${charset.attrs.charset || charset.attrs.content}` : 'Falta <meta charset="utf-8"> en el <head>.'));
  const vp = els.find((e) => e.tag === 'meta' && (e.attrs.name || '').toLowerCase() === 'viewport');
  checks.push(chk('html-viewport', 'Meta viewport para mobile', !!vp && /width\s*=\s*device-width/i.test(vp.attrs.content || ''),
    vp ? `content="${vp.attrs.content || ''}"` : 'Falta <meta name="viewport" content="width=device-width, initial-scale=1">.'));

  // Headings
  const headings = [...stripNonVisible(html).matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)]
    .map((m) => ({ level: +m[1], text: decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim() }));
  const h1s = headings.filter((h) => h.level === 1);
  checks.push(chk('html-single-h1', 'Un solo <h1> con texto', h1s.length === 1 && h1s[0].text.length > 0,
    h1s.length === 1 ? (h1s[0].text ? `h1: "${h1s[0].text}"` : 'El <h1> está vacío.') : `Se encontraron ${h1s.length} <h1>; debe haber exactamente uno (el del hero).`));
  const skips = [];
  let prev = 0;
  for (const h of headings) {
    if (prev === 0 && h.level !== 1) skips.push(`el primer heading es h${h.level} ("${h.text}")`);
    else if (prev && h.level > prev + 1) skips.push(`salto de h${prev} a h${h.level} ("${h.text}")`);
    prev = h.level;
  }
  checks.push(chk('html-heading-order', 'Jerarquía de headings sin saltos', headings.length > 0 && skips.length === 0,
    headings.length === 0 ? 'No hay headings.' : skips.length ? list(skips) : `Orden: ${headings.map((h) => 'h' + h.level).join(' ')}`));

  // Head SEO
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const titleTxt = decodeEntities(title || '').trim();
  checks.push(chk('seo-title', 'Título (<title>) presente y de largo razonable', titleTxt.length >= 5 && titleTxt.length <= 70,
    !titleTxt ? 'Falta <title> o está vacío.' : titleTxt.length > 70 ? `El título tiene ${titleTxt.length} caracteres (máx. 70): "${titleTxt}"` : titleTxt.length < 5 ? `Título demasiado corto: "${titleTxt}"` : `"${titleTxt}" (${titleTxt.length} car.)`));
  const md = els.find((e) => e.tag === 'meta' && (e.attrs.name || '').toLowerCase() === 'description');
  const mdTxt = decodeEntities(md?.attrs.content || '').trim();
  checks.push(chk('seo-description', 'Meta description presente (30-200 car.)', mdTxt.length >= 30 && mdTxt.length <= 200,
    !md ? 'Falta <meta name="description" content="...">.' : mdTxt.length < 30 ? `Description muy corta (${mdTxt.length} car.).` : mdTxt.length > 200 ? `Description muy larga (${mdTxt.length} car., máx. 200).` : `${mdTxt.length} caracteres.`));

  // Imágenes
  const imgs = byTag('img');
  const badImgs = imgs.filter((i) => i.attrs.alt === undefined || (i.attrs.alt.trim() === '' && i.attrs.role !== 'presentation' && i.attrs['aria-hidden'] !== 'true' && i.attrs.alt !== ''));
  const noAlt = imgs.filter((i) => i.attrs.alt === undefined);
  checks.push(chk('img-alt', 'Todas las imágenes tienen alt', noAlt.length === 0,
    noAlt.length ? `${noAlt.length} <img> sin alt: ${list(noAlt.map((i) => `línea ${i.line} (${i.attrs.src || 'sin src'})`))}` : `${imgs.length} imagen(es) revisadas.`));
  void badImgs;

  // Inputs con label
  const labelFor = new Set(byTag('label').map((l) => l.attrs.for).filter(Boolean));
  const unlabeled = els.filter((e) => ['input', 'textarea', 'select'].includes(e.tag)
    && !['hidden', 'submit', 'button', 'reset', 'image'].includes((e.attrs.type || '').toLowerCase())
    && !(e.attrs.id && labelFor.has(e.attrs.id)) && !e.inLabel && !e.attrs['aria-label'] && !e.attrs['aria-labelledby']);
  checks.push(chk('form-labels', 'Campos de formulario con <label>', unlabeled.length === 0,
    unlabeled.length ? `Sin label: ${list(unlabeled.map((e) => `<${e.tag} name="${e.attrs.name || ''}" id="${e.attrs.id || ''}"> línea ${e.line}`))}. Agregá <label for="id"> o aria-label.` : 'Todos los campos tienen etiqueta asociada.'));

  // Anchors internos
  const ids = new Set(els.map((e) => e.attrs.id).filter(Boolean));
  const anchors = byTag('a').filter((a) => a.attrs.href !== undefined);
  const badAnchors = anchors.map((a) => a.attrs.href.trim()).filter((h) => h.startsWith('#') && h.length > 1 && !ids.has(decodeURIComponent(h.slice(1)).replace(/\s/g, '')) && !ids.has(h.slice(1)));
  checks.push(chk('anchors-internal', 'Anchors internos apuntan a ids existentes', badAnchors.length === 0,
    badAnchors.length ? `Enlaces rotos: ${list([...new Set(badAnchors)])}. Ids disponibles: ${list([...ids], 12)}` : 'Todos los #anchors resuelven.'));
  const dupIds = els.map((e) => e.attrs.id).filter(Boolean).filter((v, i, a) => a.indexOf(v) !== i);
  checks.push(chk('ids-unique', 'Ids únicos', dupIds.length === 0, dupIds.length ? `Ids duplicados: ${list([...new Set(dupIds)])}` : 'Sin ids duplicados.'));

  // Links de contacto
  const linkErrs = [];
  for (const a of anchors) {
    const h = a.attrs.href.trim();
    if (h === '') linkErrs.push(`href vacío (línea ${a.line})`);
    else if (/^tel:/i.test(h)) { if (!/^tel:\+?[\d][\d\-.()%20]{5,}$/i.test(h.replace(/\s/g, ''))) linkErrs.push(`tel mal formado: "${h}"`); }
    else if (/^mailto:/i.test(h)) { if (!/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(\?.*)?$/i.test(h)) linkErrs.push(`mailto mal formado: "${h}"`); }
    else if (/wa\.me|whatsapp\.com/i.test(h)) {
      if (/wa\.me/i.test(h) && !/^https:\/\/wa\.me\/\d{8,15}(\?.*)?$/i.test(h)) linkErrs.push(`wa.me debe ser https://wa.me/<solo dígitos con código de país>: "${h}"`);
      if (/api\.whatsapp\.com/i.test(h) && !/phone=\d{8,15}/i.test(h)) linkErrs.push(`api.whatsapp.com sin phone=dígitos: "${h}"`);
    } else if (/^javascript:/i.test(h)) linkErrs.push(`href javascript: no permitido (línea ${a.line})`);
  }
  checks.push(chk('links-format', 'Links tel:/wa.me/mailto bien formados', linkErrs.length === 0,
    linkErrs.length ? list(linkErrs) : `${anchors.length} enlace(s) revisados.`));

  // CSS
  const cssLinks = els.filter((e) => e.tag === 'link' && /stylesheet/i.test(e.attrs.rel || '') && e.attrs.href);
  const localCss = cssLinks.filter((l) => !isExternal(l.attrs.href));
  const missingCss = localCss.filter((l) => f[normPath(l.attrs.href)] === undefined);
  checks.push(chk('css-linked', 'index.html referencia una hoja de estilos local', localCss.length > 0,
    localCss.length ? `href="${localCss.map((l) => l.attrs.href).join(', ')}"` : 'Falta <link rel="stylesheet" href="styles.css">.'));
  checks.push(chk('css-exists', 'La hoja de estilos referenciada existe y tiene reglas', localCss.length > 0 && missingCss.length === 0 && css.replace(/\/\*[\s\S]*?\*\//g, '').includes('{'),
    missingCss.length ? `No existe en los archivos: ${missingCss.map((l) => l.attrs.href).join(', ')}` : !css.includes('{') ? 'El CSS está vacío o sin reglas.' : `${Math.round(css.length / 1024 * 10) / 10} KB de CSS.`));

  // JS
  const scripts = byTag('script');
  const localScripts = scripts.filter((s) => s.attrs.src && !isExternal(s.attrs.src));
  const missingJs = localScripts.filter((s) => f[normPath(s.attrs.src)] === undefined);
  const hasScriptJs = f['script.js'] !== undefined;
  const refsScriptJs = localScripts.some((s) => normPath(s.attrs.src) === 'script.js');
  checks.push(chk('script-linked', 'script.js referenciado y existente', refsScriptJs && hasScriptJs && missingJs.length === 0,
    !hasScriptJs ? 'No existe script.js en los archivos.' : !refsScriptJs ? 'index.html no incluye <script src="script.js" defer></script>.' : missingJs.length ? `Scripts inexistentes: ${missingJs.map((s) => s.attrs.src).join(', ')}` : 'OK'));
  let syntaxDetail = 'Compila sin errores.';
  let syntaxOk = true;
  const jsFiles = Object.entries(f).filter(([k]) => k.endsWith('.js'));
  if (!jsFiles.length) { syntaxOk = false; syntaxDetail = 'No hay archivos .js.'; }
  for (const [k, code] of jsFiles) {
    try { new vm.Script(code, { filename: k }); } catch (e) { syntaxOk = false; syntaxDetail = `${k}: ${e.name}: ${e.message}${(e.stack || '').match(/:(\d+)\n/) ? ` (línea ${(e.stack.match(/:(\d+)\n/) || [])[1]})` : ''}`; break; }
  }
  checks.push(chk('script-syntax', 'Sintaxis válida de script.js', syntaxOk, syntaxDetail));

  // Responsive
  const mq = css.match(/@media[^{]*\(\s*(?:min|max)-width\s*:[^)]+\)/gi) || [];
  checks.push(chk('css-responsive', 'CSS responsive (media queries)', mq.length > 0,
    mq.length ? `${mq.length} media query(s): ${list(mq.map((m) => m.replace(/\s+/g, ' ')), 3)}` : 'No hay @media (min/max-width). Agregá breakpoints para mobile.'));

  // Contraste
  const pairs = [];
  const need = (label, a, b, min) => {
    const ratio = contrastRatio(a, b);
    pairs.push({ label, a, b, min, ratio });
  };
  need('texto sobre fondo (text/bg)', theme.text, theme.bg, 4.5);
  if (theme.surface) need('texto sobre superficie (text/surface)', theme.text, theme.surface, 4.5);
  const textFail = pairs.filter((p) => p.ratio === null || p.ratio < p.min);
  checks.push(chk('contrast-text', 'Contraste AA del texto (>= 4.5:1)', pairs.length > 0 && textFail.length === 0,
    pairs.map((p) => `${p.label} ${p.a}/${p.b} = ${p.ratio === null ? 'color inválido' : r2(p.ratio) + ':1'}${p.ratio !== null && p.ratio < p.min ? ` (mínimo ${p.min})` : ''}`).join('; ')));
  const prim = theme.primary;
  const onPrim = ['#ffffff', theme.text, theme.bg].filter(Boolean).map((c) => ({ c, r: contrastRatio(c, prim) })).filter((x) => x.r !== null);
  const bestOn = onPrim.sort((x, y) => y.r - x.r)[0];
  const primVsBg = contrastRatio(prim, theme.bg);
  const btnOk = !!bestOn && bestOn.r >= 4.5;
  checks.push(chk('contrast-button', 'Contraste AA del botón / color primario', btnOk,
    bestOn ? `Mejor texto sobre primary ${prim}: ${bestOn.c} = ${r2(bestOn.r)}:1${btnOk ? '' : ' (mínimo 4.5). Oscurecé el color primario.'}${primVsBg ? `; primary vs bg = ${r2(primVsBg)}:1` : ''}` : `theme.palette.primary inválido: "${prim}"`));

  // Placeholders
  const vis = stripNonVisible(html);
  const attrText = els.map((e) => [e.attrs.alt, e.attrs.title, e.attrs.placeholder, e.attrs['aria-label'], e.attrs.content, e.attrs.href].filter(Boolean).join(' ')).join(' ');
  const textAll = decodeEntities(vis.replace(/<[^>]+>/g, ' ')) + ' ' + attrText;
  const ph = [];
  // Los marcadores en MAYÚSCULAS (TODO, FIXME, TBD, NaN) distinguen un olvido de la palabra común "todo" en español.
  const phRe = /lorem ipsum|dolor sit amet|\bundefined\b|\bnull\b|\[object Object\]|\{\{[^}]*\}\}|<%|%>|\$\{|\bplaceholder text\b|\bxxx+\b/gi;
  const phCaseRe = /\bTODO\b|\bFIXME\b|\bTBD\b|\bNaN\b/g;
  for (const re of [phRe, phCaseRe]) {
    for (const m of textAll.matchAll(re)) ph.push(`"${m[0]}" en "…${textAll.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25).replace(/\s+/g, ' ')}…"`);
  }
  checks.push(chk('no-placeholders', 'Sin placeholders (lorem/TODO/undefined/null/[object Object])', ph.length === 0,
    ph.length ? list(ph, 4) : 'No se encontraron textos de relleno ni valores sin interpolar.'));

  // Tags peligrosos
  const danger = [];
  for (const e of els) {
    if (['iframe', 'object', 'embed', 'applet', 'base'].includes(e.tag)) danger.push(`<${e.tag}> (línea ${e.line})`);
    if (e.tag === 'script') {
      if (e.attrs.src && /^(https?:)?\/\//i.test(e.attrs.src)) danger.push(`script externo ${e.attrs.src} (línea ${e.line})`);
      const t = (e.attrs.type || '').toLowerCase();
      if (!e.attrs.src && t !== 'application/ld+json' && /alert\s*\(|document\.cookie|eval\s*\(/.test(e.rawText || '')) danger.push(`script inline sospechoso (línea ${e.line})`);
    }
    for (const [k, v] of Object.entries(e.attrs)) {
      if (/^on[a-z]+$/.test(k) && /alert|eval|cookie|document\.write/i.test(v)) danger.push(`handler ${k}="${v}" (línea ${e.line})`);
      if (['href', 'src', 'action'].includes(k) && /^\s*(javascript|vbscript):/i.test(v)) danger.push(`${k}="${v}" (línea ${e.line})`);
    }
  }
  const escapedLeak = /<script\b[^>]*>\s*alert|<img\b[^>]*onerror/i.test(vis);
  if (escapedLeak) danger.push('texto del cliente sin escapar con <script>/<img onerror>');
  checks.push(chk('no-dangerous-tags', 'Sin tags/atributos peligrosos sin escapar', danger.length === 0,
    danger.length ? `${list([...new Set(danger)])}. Escapá el texto del cliente con esc().` : 'No hay iframes, scripts externos ni handlers sospechosos.'));

  // Tamaño
  const total = Object.values(f).reduce((n, v) => n + Buffer.byteLength(v), 0);
  const htmlSize = Buffer.byteLength(html);
  checks.push(chk('size-reasonable', 'Tamaño razonable del sitio', htmlSize <= 500 * 1024 && total <= 2 * 1024 * 1024 && htmlSize >= 500,
    `index.html ${Math.round(htmlSize / 1024 * 10) / 10} KB, total ${Math.round(total / 1024 * 10) / 10} KB (límites: html 500 KB, total 2 MB, html mínimo 500 B).`));

  // JSON-LD
  const ld = scripts.filter((s) => (s.attrs.type || '').toLowerCase() === 'application/ld+json');
  const ldErr = [];
  for (const s of ld) { try { const o = JSON.parse(s.rawText || ''); if (!o || typeof o !== 'object') ldErr.push('no es un objeto'); else if (!o['@context'] && !Array.isArray(o) && !o['@graph']) ldErr.push('falta @context'); } catch (e) { ldErr.push(`JSON inválido: ${e.message}`); } }
  checks.push(chk('jsonld-valid', 'JSON-LD parseable', ldErr.length === 0,
    ldErr.length ? `${list(ldErr)} (en <script type="application/ld+json">)` : ld.length ? `${ld.length} bloque(s) JSON-LD válidos.` : 'Sin JSON-LD (opcional).'));

  return { passed: checks.every((c) => c.passed), checks };
}

export default { runTests };
