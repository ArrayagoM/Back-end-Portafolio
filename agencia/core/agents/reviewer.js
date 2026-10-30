// Agente QA-2 (Reviewer): verifica el HTML final contra lo que pidió el cliente.
import { parseHtml, visibleText, decodeEntities, parseHex } from './tester.js';

// Pliega mayúsculas y tildes conservando el largo (para poder cortar fragmentos del original).
const fold = (s) => Array.from(String(s), (c) => (c.normalize('NFD')[0] || c).toLowerCase()).join('');
const collapse = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const digits = (s) => String(s ?? '').replace(/\D/g, '');

function findIn(text, needle) {
  const n = fold(collapse(needle));
  if (!n) return null;
  const i = fold(text).indexOf(n);
  if (i === -1) return null;
  const a = Math.max(0, i - 40), b = Math.min(text.length, i + n.length + 40);
  return (a > 0 ? '…' : '') + text.slice(a, b) + (b < text.length ? '…' : '');
}

function tagSnippet(html, el) {
  const end = html.indexOf('>', el.index);
  const s = html.slice(el.index, end === -1 ? el.index + 120 : end + 1);
  return s.length > 200 ? s.slice(0, 200) + '…' : s;
}

function allCss(files) {
  return Object.entries(files).filter(([k]) => k.endsWith('.css') && !k.startsWith('partials/')).map(([, v]) => v).join('\n');
}

function hexVariants(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return [];
  const long = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  const out = [long];
  if (/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i.test(long)) out.push('#' + long[1] + long[3] + long[5]);
  out.push(`rgb(${rgb.join(',')})`, `rgb(${rgb.join(', ')})`);
  return out;
}

function checkRequirement(req, ctx) {
  const { html, text, els, structure } = ctx;
  const kind = req?.check?.kind;
  const value = req?.check?.value;
  const val = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
  if (kind === 'contains' && /^#[0-9a-f]{3,8}$/i.test(val.trim())) {
    // un color de marca vive en el CSS (o en estilos inline), no en el texto visible
    const needle = val.trim().toLowerCase();
    const hay = `${ctx.css || ''}\n${html}`.toLowerCase();
    return hay.includes(needle)
      ? { met: true, evidence: `El color ${val} está aplicado en el CSS.` }
      : { met: false, evidence: `No se encontró el color ${val} en el CSS.` };
  }
  if (kind === 'contains') {
    const hit = findIn(text, val) || findIn(decodeEntities(html), val);
    return hit ? { met: true, evidence: `Encontrado: "${hit}"` } : { met: false, evidence: `No se encontró el texto "${val}" en el HTML visible.` };
  }
  if (kind === 'section') {
    const ids = new Set(els.map((e) => e.attrs.id).filter(Boolean));
    const cand = [val.replace(/^#/, '')];
    for (const s of structure?.sections || []) if (s.type === val || s.id === val) cand.push(s.id);
    const found = cand.find((c) => ids.has(c));
    if (found) {
      const el = els.find((e) => e.attrs.id === found);
      return { met: true, evidence: `Sección presente: ${tagSnippet(html, el)}` };
    }
    const byTag = els.find((e) => e.tag === val);
    if (byTag) return { met: true, evidence: `Elemento presente: ${tagSnippet(html, byTag)}` };
    return { met: false, evidence: `No existe ningún elemento con id "${cand.join('" ni "')}". Ids presentes: ${[...ids].slice(0, 15).join(', ') || 'ninguno'}.` };
  }
  if (kind === 'link') {
    const needle = fold(decodeEntities(val));
    const a = els.find((e) => e.tag === 'a' && e.attrs.href && fold(decodeEntities(e.attrs.href)).includes(needle));
    if (a) return { met: true, evidence: `Enlace: ${tagSnippet(html, a)}` };
    const d = digits(val);
    if (d.length >= 7) {
      const b = els.find((e) => e.tag === 'a' && e.attrs.href && digits(e.attrs.href).includes(d.slice(-8)));
      if (b) return { met: true, evidence: `Enlace: ${tagSnippet(html, b)}` };
    }
    return { met: false, evidence: `Ningún <a href> contiene "${val}".` };
  }
  if (kind === 'meta') {
    const metas = els.filter((e) => e.tag === 'meta');
    const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
    const metaBy = (n) => metas.find((m) => (m.attrs.name || m.attrs.property || '').toLowerCase() === n);
    const lower = val.toLowerCase();
    if (lower === 'title') return title ? { met: true, evidence: `<title>${title}</title>` } : { met: false, evidence: 'Falta <title>.' };
    if (['description', 'keywords', 'viewport', 'robots', 'og:title', 'og:description'].includes(lower)) {
      const m = metaBy(lower);
      return m && (m.attrs.content || '').trim() ? { met: true, evidence: tagSnippet(html, m) } : { met: false, evidence: `Falta <meta name="${lower}"> con contenido.` };
    }
    if (findIn(title, val)) return { met: true, evidence: `<title>${title}</title>` };
    const m = metas.find((x) => x.attrs.content && findIn(decodeEntities(x.attrs.content), val));
    if (m) return { met: true, evidence: tagSnippet(html, m) };
    return { met: false, evidence: `El título ("${title}") y las metas no contienen "${val}".` };
  }
  return { met: false, evidence: `Tipo de verificación desconocido: "${kind}".` };
}

const ES_WORDS = new Set(['de', 'la', 'el', 'en', 'y', 'que', 'para', 'con', 'los', 'las', 'un', 'una', 'por', 'del', 'te', 'tu', 'es', 'al', 'se', 'su', 'más', 'mas', 'nuestro', 'nuestra', 'hacemos', 'contacto', 'servicios', 'sobre']);
const EN_WORDS = new Set(['the', 'and', 'for', 'with', 'your', 'our', 'we', 'you', 'are', 'is', 'of', 'to', 'in', 'on', 'about', 'services', 'contact', 'us']);

/** ReviewResult: { passed, results:[{id,text,met,evidence}] } */
export function reviewRequirements(brief, structure, files) {
  const f = {};
  for (const [k, v] of Object.entries(files || {})) if (!k.startsWith('partials/') && typeof v === 'string') f[k] = v;
  const html = f['index.html'] || '';
  const text = visibleText(html);
  const els = parseHtml(html).elements;
  const css = allCss(f);
  const ctx = { html, text, els, structure, css };
  const results = [];
  const push = (id, t, met, evidence) => results.push({ id, text: t, met: !!met, evidence: evidence || '' });

  if (!html) {
    push('B0', 'Existe index.html', false, 'No hay index.html en los archivos generados.');
    return { passed: false, results };
  }

  // 1) Requisitos de la estructura
  for (const req of structure?.requirements || []) {
    let r;
    try { r = checkRequirement(req, ctx); } catch (e) { r = { met: false, evidence: `Error evaluando: ${e.message}` }; }
    push(req.id, req.text, r.met, r.evidence);
  }

  const b = brief || {};
  const anchor = (pred) => els.find((e) => e.tag === 'a' && e.attrs.href && pred(e.attrs.href));

  // 2) Verificaciones propias contra el brief
  if (b.businessName) {
    const hit = findIn(text, b.businessName);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const inTitle = !!findIn(decodeEntities(title), b.businessName);
    push('B-NAME', `El nombre del negocio "${b.businessName}" es visible y está en el título`, !!hit && inTitle,
      hit ? (inTitle ? `Visible: "${hit}"; en <title>.` : `Visible ("${hit}") pero falta en <title>.`) : `No aparece "${b.businessName}" en el texto visible.`);
  }
  (b.services || []).forEach((s, i) => {
    if (!s?.name) return;
    const hit = findIn(text, s.name);
    push(`B-SRV${i + 1}`, `El servicio "${s.name}" está en el sitio`, !!hit, hit ? `Encontrado: "${hit}"` : `No aparece el servicio "${s.name}".`);
  });

  const cta = b.cta || {};
  if (cta.type) {
    let a, why;
    if (cta.type === 'whatsapp') { a = anchor((h) => /wa\.me\/\d|api\.whatsapp\.com\/send/i.test(h)); why = 'ningún enlace wa.me/<número>'; }
    else if (cta.type === 'call') { a = anchor((h) => /^tel:/i.test(h)); why = 'ningún enlace tel:'; }
    else if (cta.type === 'form') { const fm = els.find((e) => e.tag === 'form'); a = fm; why = 'ningún <form>'; }
    else if (cta.type === 'reserve') { a = anchor((h) => /wa\.me|^mailto:|^#(reserv|contact|turno)/i.test(h) || /reserv|turno/i.test(h)) || els.find((e) => e.tag === 'form'); why = 'ningún enlace/formulario de reserva (wa.me, mailto, #reservas o <form>)'; }
    const labelHit = cta.label ? findIn(text, cta.label) : null;
    push('B-CTA', `El CTA principal (${cta.type}${cta.label ? `: "${cta.label}"` : ''}) existe y funciona`, !!a && (!cta.label || !!labelHit),
      !a ? `Falta: ${why}.` : cta.label && !labelHit ? `Hay ${tagSnippet(html, a)} pero no aparece el texto "${cta.label}".` : `${tagSnippet(html, a)}${labelHit ? ` — texto: "${labelHit}"` : ''}`);
  }

  const c = b.contact || {};
  if (c.phone) {
    const d = digits(c.phone).slice(-8);
    const a = anchor((h) => /^tel:/i.test(h) && digits(h).includes(d));
    push('B-PHONE', `El teléfono ${c.phone} está enlazado (tel:)`, !!a, a ? tagSnippet(html, a) : `No hay <a href="tel:..."> con el número ${c.phone}.`);
  }
  if (c.whatsapp) {
    const d = digits(c.whatsapp).slice(-8);
    const a = anchor((h) => /wa\.me|whatsapp\.com/i.test(h) && digits(h).includes(d));
    push('B-WA', `El WhatsApp ${c.whatsapp} está enlazado (wa.me)`, !!a, a ? tagSnippet(html, a) : `No hay enlace wa.me con el número ${c.whatsapp}.`);
  }
  if (c.email) {
    const a = anchor((h) => /^mailto:/i.test(h) && fold(h).includes(fold(c.email)));
    push('B-MAIL', `El email ${c.email} está enlazado (mailto:)`, !!a, a ? tagSnippet(html, a) : `No hay <a href="mailto:${c.email}">.`);
  }
  if (c.address) {
    const hit = findIn(text, c.address);
    push('B-ADDR', 'La dirección es visible', !!hit, hit ? `Encontrado: "${hit}"` : `No aparece la dirección "${c.address}".`);
  }
  if (c.hours) {
    const hit = findIn(text, c.hours);
    push('B-HOURS', 'Los horarios son visibles', !!hit, hit ? `Encontrado: "${hit}"` : `No aparecen los horarios "${c.hours}".`);
  }
  if (c.instagram) {
    const handle = String(c.instagram).replace(/^.*instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
    const a = anchor((h) => /instagram\.com/i.test(h) && fold(h).includes(fold(handle)));
    push('B-IG', `Instagram @${handle} está enlazado`, !!a, a ? tagSnippet(html, a) : `No hay enlace a instagram.com/${handle}.`);
  }

  // Colores aplicados en CSS
  const colorsWanted = [['primary', b.colors?.primary], ['secondary', b.colors?.secondary]].filter(([, v]) => v);
  const cssFold = fold(css + '\n' + els.map((e) => e.attrs.style || '').join('\n') + '\n' + els.filter((e) => e.tag === 'style').map((e) => e.rawText || '').join('\n'));
  const themeP = structure?.theme?.palette || {};
  for (const [name, hex] of colorsWanted) {
    const variants = hexVariants(hex);
    const found = variants.find((v) => cssFold.includes(fold(v)));
    const viaTheme = themeP[name] && fold(themeP[name]) === fold(hex);
    push(`B-COLOR-${name.toUpperCase()}`, `El color ${name} del cliente (${hex}) se aplica en el CSS`, !!found,
      found ? `El CSS contiene ${found}.` : viaTheme ? `El tema define ${hex} pero no aparece en styles.css.` : `No se encontró ${hex} en el CSS.`);
  }

  // Idioma y tono
  const lang = (els.find((e) => e.tag === 'html')?.attrs.lang || '').toLowerCase();
  const words = fold(text).match(/[a-zñ]+/g) || [];
  const es = words.filter((w) => ES_WORDS.has(w) || ES_WORDS.has(fold(w))).length;
  const en = words.filter((w) => EN_WORDS.has(w)).length;
  const wantEs = (b.language || 'es') === 'es';
  push('B-LANG', `Idioma del sitio: ${wantEs ? 'español' : b.language}`, wantEs ? lang.startsWith('es') && es > en : lang.startsWith(b.language),
    `<html lang="${lang}">, palabras ES=${es} / EN=${en}.`);
  if (b.tone) {
    const excl = (text.match(/!/g) || []).length;
    const emoji = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
    const informal = fold(text).match(/\b(vos|tu|tus|te|escribinos|contactanos|consultanos|llamanos|veni|pedi|reserva|animate|sumate|queres|podes)\b/g) || [];
    let met = true, ev = '';
    if (b.tone === 'profesional' || b.tone === 'premium') { met = excl <= 3 && emoji <= 2; ev = `${excl} signo(s) "!" y ${emoji} emoji(s) (máx. 3 y 2 para tono ${b.tone}).`; }
    else if (b.tone === 'cercano' || b.tone === 'divertido') { met = informal.length >= 1; ev = informal.length ? `Trato cercano: "${informal.slice(0, 4).join('", "')}".` : 'No se detecta trato cercano (vos/tu/te/consultanos…).'; }
    push('B-TONE', `El tono es ${b.tone}`, met, ev);
  }

  return { passed: results.length > 0 && results.every((r) => r.met), results };
}

export default { reviewRequirements };
