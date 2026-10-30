// validateSeo: controles reales sobre el sitio final (sin red, sin navegador).
import { parseHtml, stripNonVisible, visibleText, decodeEntities } from '../agents/tester.js';
import { DISCLAIMER, normBrief, norm, normWords, socialUrls, urlKey, last8, digitsOf, parsePrice } from './util.js';
import { detectKind, BOTS } from './plan.js';

const W = { high: 3, medium: 2, low: 1 };
const chk = (id, name, passed, details, severity = 'medium') => ({ id, name, passed: !!passed, details: details || (passed ? 'OK' : ''), severity });
const list = (a, n = 5) => a.slice(0, n).join('; ') + (a.length > n ? `; … (+${a.length - n})` : '');
const score = (checks) => {
  const tot = checks.reduce((s, c) => s + W[c.severity], 0);
  return tot ? Math.round((checks.reduce((s, c) => s + (c.passed ? W[c.severity] : 0), 0) / tot) * 100) : 100;
};
const blocking = (checks) => checks.filter((c) => !c.passed && c.severity !== 'low');

export function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let lastWasUA = false;
  const sitemaps = [];
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) { lastWasUA = false; continue; }
    const key = m[1].toLowerCase();
    if (key === 'user-agent') { if (!lastWasUA || !cur) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(m[2].trim().toLowerCase()); lastWasUA = true; continue; }
    lastWasUA = false;
    if (key === 'sitemap') sitemaps.push(m[2].trim());
    else if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ type: key, path: m[2].trim() });
  }
  return { groups, sitemaps };
}
export function botAllowed(robots, bot) {
  const b = bot.toLowerCase();
  const g = robots.groups.find((x) => x.agents.includes(b)) || robots.groups.find((x) => x.agents.includes('*'));
  if (!g) return true;
  const dis = g.rules.some((r) => r.type === 'disallow' && r.path === '/');
  const allow = g.rules.some((r) => r.type === 'allow' && r.path === '/');
  return !dis || allow;
}

function ldNodes(els) {
  const nodes = [];
  const errors = [];
  for (const s of els.filter((e) => e.tag === 'script' && /ld\+json/i.test(e.attrs.type || ''))) {
    try {
      const o = JSON.parse(s.rawText || '');
      const flat = (x) => (Array.isArray(x) ? x.flatMap(flat) : x && typeof x === 'object' ? (x['@graph'] ? flat(x['@graph']).map((n) => ({ ...n, '@context': n['@context'] || x['@context'] })) : [x]) : []);
      nodes.push(...flat(o));
    } catch (e) { errors.push(`JSON inválido: ${e.message}`); }
  }
  return { nodes, errors };
}
const typesOf = (n) => [].concat(n['@type'] || []).map(String);
const BIZ = /LocalBusiness|Business|Restaurant|Bakery|Store|Service|Dentist|Clinic|Gym|Salon|Contractor|Organization|Electrician|Plumber|Shop|Establishment|Spa|Care|Repair|Location/;

export function validateSeo(files, rawBrief, structure) {
  const f = files || {};
  const html = String(f['index.html'] ?? '');
  if (!html) {
    const c = [chk('seo-html', 'Existe index.html', false, 'No hay index.html para revisar.', 'high')];
    return { passed: false, score: 0, checks: c, aiReadiness: { score: 0, checks: [] }, disclaimer: DISCLAIMER };
  }
  const b = normBrief(rawBrief);
  const kind = detectKind(b);
  const base = b.website;
  const parsed = parseHtml(html);
  const els = parsed.elements;
  const vis = visibleText(html);
  const visN = normWords(vis);
  const checks = [];
  const ai = [];

  // título
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decodeEntities(m[1]).trim());
  const title = titles[0] || '';
  const tOk = titles.length === 1 && title.length >= 15 && title.length <= 65;
  checks.push(chk('seo-title', 'Título (<title>) único y de longitud útil (15-65)', tOk, !titles.length ? 'Falta <title>.' : titles.length > 1 ? `Hay ${titles.length} <title>.` : `"${title}" (${title.length} car.)`, 'high'));
  const otherTitles = Object.entries(f).filter(([k, v]) => /^[^/]+\.html$/.test(k) && k !== 'index.html' && typeof v === 'string').map(([, v]) => (v.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim());
  const generic = /^(document|home|inicio|untitled|sin titulo|index|pagina)$/i.test(title);
  checks.push(chk('seo-title-unique', 'Título distinto en cada página y no genérico', !!title && !generic && !otherTitles.includes(title), generic ? `Título genérico: "${title}"` : otherTitles.includes(title) ? 'Otra página repite el título.' : 'OK'));
  const kwTerms = [kind.search, kind.label, ...b.services.map((s) => s.name), ...(b.place?.areas || []), b.name].map(normWords).filter((t) => t.length > 3);
  const mainKw = kwTerms.slice(0, 1).concat(kwTerms.slice(1, 3 + b.services.length));
  checks.push(chk('seo-title-keyword', 'El título incluye la palabra clave principal (rubro, servicio o zona)', mainKw.some((t) => normWords(title).includes(t)) || kwTerms.some((t) => normWords(title).includes(t)), `Título: "${title}". Sumá el rubro o el servicio principal.`, 'low'));

  // description
  const md = els.find((e) => e.tag === 'meta' && (e.attrs.name || '').toLowerCase() === 'description');
  const mdt = decodeEntities(md?.attrs.content || '').trim();
  checks.push(chk('seo-description', 'Meta description presente (30-165 car.)', mdt.length >= 30 && mdt.length <= 165, !md ? 'Falta la meta description.' : `${mdt.length} caracteres.${mdt.length < 70 ? ' Podría ser más descriptiva (ideal 70-155).' : ''}`));

  // canonical
  const canon = els.find((e) => e.tag === 'link' && /canonical/i.test(e.attrs.rel || ''));
  checks.push(chk('seo-canonical', 'Canonical (si hay URL base)', !base || (!!canon && urlKey(canon.attrs.href) === urlKey(base)), !base ? 'Sin URL base: no aplica todavía.' : canon ? `canonical=${canon.attrs.href}` : `Falta <link rel="canonical" href="${base}">.`));

  // h1 y jerarquía
  const heads = [...stripNonVisible(html).matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((m) => ({ level: +m[1], text: decodeEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(), index: m.index, len: m[0].length }));
  const h1s = heads.filter((h) => h.level === 1);
  checks.push(chk('seo-h1', 'Un solo <h1> con texto', h1s.length === 1 && !!h1s[0].text, `Se encontraron ${h1s.length} <h1>.`, 'high'));
  if (h1s[0]) {
    const plainHtml = decodeEntities(stripNonVisible(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
    const at = normWords(plainHtml).indexOf(normWords(h1s[0].text));
    const win = at >= 0 ? normWords(plainHtml).slice(Math.max(0, at - 160), at + normWords(h1s[0].text).length + 360) : normWords(h1s[0].text);
    checks.push(chk('seo-h1-intent', 'El h1 (y su entorno) expresa qué es el negocio, qué ofrece o dónde está', kwTerms.some((t) => win.includes(t)), `h1: "${h1s[0].text}"`, 'low'));
  }
  const skips = [];
  let prev = 0;
  for (const h of heads) { if (prev && h.level > prev + 1) skips.push(`h${prev}→h${h.level} ("${h.text}")`); prev = h.level; }
  checks.push(chk('seo-heading-hierarchy', 'Jerarquía de títulos sin saltos y con subtítulos h2', heads.length > 0 && !skips.length && heads.some((h) => h.level === 2), skips.length ? list(skips) : heads.length ? 'Sin h2' : 'Sin títulos'));

  // texto indexable sin JS
  const words = vis.split(/\s+/).filter(Boolean).length;
  const rootOnly = /<div[^>]+id=["'](root|app|__next)["'][^>]*>\s*<\/div>/i.test(html);
  checks.push(chk('seo-indexable-text', 'Texto indexable sin JavaScript (≥ 80 palabras)', words >= 80 && !rootOnly, rootOnly ? 'El contenido parece renderizarse con JS (contenedor vacío).' : `${words} palabras visibles en el HTML.`, 'high'));

  // enlaces internos
  const ids = new Set(els.map((e) => e.attrs.id).filter(Boolean));
  const anchors = els.filter((e) => e.tag === 'a' && e.attrs.href !== undefined);
  const internal = anchors.filter((a) => a.attrs.href.startsWith('#') && a.attrs.href.length > 1);
  const broken = internal.filter((a) => !ids.has(a.attrs.href.slice(1)));
  checks.push(chk('seo-internal-links', 'Enlaces internos/anclas (≥ 3) que resuelven', internal.length >= 3 && !broken.length, broken.length ? `Rotos: ${list(broken.map((a) => a.attrs.href))}` : `${internal.length} anclas internas.`));
  const vague = anchors.filter((a) => false);
  void vague;
  const weakText = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim()).filter((t) => /^(click aqu[ií]|clic aqu[ií]|aqu[ií]|ac[aá]|ver m[aá]s|m[aá]s info)$/i.test(t));
  checks.push(chk('seo-anchor-text', 'Textos de enlace descriptivos', !weakText.length, `Enlaces vagos: ${list(weakText)}`, 'low'));

  // alt
  const imgs = els.filter((e) => e.tag === 'img');
  const badAlt = imgs.filter((i) => i.attrs['aria-hidden'] !== 'true' && i.attrs.role !== 'presentation' && (i.attrs.alt === undefined || (i.attrs.alt.trim() !== '' && (i.attrs.alt.trim().length < 4 || /^(img|image|imagen|foto|photo|dsc|pic)[-_ ]?\d*(\.\w+)?$/i.test(i.attrs.alt.trim())))));
  checks.push(chk('seo-img-alt', 'Imágenes con alt descriptivo', !badAlt.length, badAlt.length ? `${badAlt.length} imagen(es) sin alt o con alt pobre: ${list(badAlt.map((i) => i.attrs.src || '?'))}` : `${imgs.length} imagen(es) revisadas.`));

  // JSON-LD
  const { nodes, errors } = ldNodes(els);
  const missingCtx = nodes.filter((n) => !n['@context'] || !n['@type']);
  const ldBlocks = els.filter((e) => e.tag === 'script' && /ld\+json/i.test(e.attrs.type || '')).length;
  checks.push(chk('seo-jsonld-valid', 'Datos estructurados (JSON-LD) presentes y parseables', ldBlocks > 0 && !errors.length && !missingCtx.length && nodes.length > 0, !ldBlocks ? 'No hay JSON-LD.' : [...errors, ...(missingCtx.length ? ['faltan @context/@type'] : [])].join('; ') || `${nodes.length} nodo(s).`, 'high'));
  const biz = nodes.filter((n) => typesOf(n).some((t) => BIZ.test(t) && t !== 'WebSite' && t !== 'FAQPage'));
  checks.push(chk('seo-jsonld-business', 'JSON-LD describe al negocio (LocalBusiness o similar) una sola vez', biz.length === 1, biz.length === 0 ? 'Falta el nodo del negocio.' : `Hay ${biz.length} nodos de negocio (duplicados).`));

  // coherencia con el HTML visible
  const bad = [];
  for (const n of biz) {
    if (n.name && !visN.includes(normWords(n.name)) && !normWords(title).includes(normWords(n.name))) bad.push(`name "${n.name}" no está en la página`);
    if (n.name && norm(b.name) !== norm(n.name)) bad.push(`name "${n.name}" ≠ brief "${b.name}"`);
    if (n.telephone) {
      const nums = [b.contact.phone, b.contact.whatsapp].filter(Boolean).map(last8);
      const hrefs = anchors.map((a) => a.attrs.href).filter((h) => /^tel:|wa\.me|whatsapp/i.test(h)).map(last8);
      const text = digitsOf(vis.replace(/(?<=\d)[ .\-()](?=\d)/g, ''));
      const t8 = last8(n.telephone);
      if (!nums.includes(t8)) bad.push(`telephone ${n.telephone} no coincide con el brief`);
      else if (!hrefs.includes(t8) && !text.includes(t8)) bad.push(`telephone ${n.telephone} no aparece en la página`);
    }
    if (n.email && !html.toLowerCase().includes(String(n.email).toLowerCase())) bad.push(`email ${n.email} no aparece en la página`);
    const st = n.address?.streetAddress;
    if (st && !visN.includes(normWords(st))) bad.push(`streetAddress "${st}" no coincide con el HTML visible`);
  }
  checks.push(chk('seo-jsonld-coherent', 'Datos estructurados coherentes con el contenido visible (nombre, teléfono, dirección)', !bad.length, bad.join('; '), 'high'));

  // sin invenciones
  const inv = [];
  const allowedSame = new Set(socialUrls(b.contact).map((s) => urlKey(s.url)));
  const allowedPrices = new Set(b.services.map((s) => parsePrice(s.price)?.amount).filter(Boolean));
  const svcNames = new Set(b.services.map((s) => norm(s.name)));
  const walk = (o, path = '') => {
    if (Array.isArray(o)) return o.forEach((x) => walk(x, path));
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (/^(aggregateRating|review|reviews|award|awards|ratingValue|reviewCount|rating|interactionStatistic)$/i.test(k)) inv.push(`campo ${k}`);
      if (k === 'price' && !allowedPrices.has(String(o[k]))) inv.push(`price ${o[k]} no está en el brief`);
      if (k === 'minPrice' && !allowedPrices.has(String(o[k]))) inv.push(`minPrice ${o[k]} no está en el brief`);
      if (k === 'itemOffered' && o[k]?.name && !svcNames.has(norm(o[k].name))) inv.push(`servicio "${o[k].name}" no está en el brief`);
      if (k === 'sameAs') for (const u of [].concat(o[k])) if (!allowedSame.has(urlKey(u))) inv.push(`sameAs ${u} no está en el brief`);
      if (k === 'telephone' && !b.contact.phone && !b.contact.whatsapp) inv.push('telephone sin teléfono en el brief');
      if (k === 'email' && !b.contact.email) inv.push('email sin email en el brief');
      if (k === 'address' && !b.contact.address) inv.push('address sin dirección en el brief');
      walk(o[k]);
    }
  };
  nodes.forEach((n) => walk(n));
  checks.push(chk('seo-jsonld-no-invented', 'Datos estructurados sin reseñas, puntajes, premios ni datos que no estén en el brief', !inv.length, list([...new Set(inv)]), 'high'));

  // FAQ
  const faqNodes = nodes.filter((n) => typesOf(n).includes('FAQPage'));
  const faqBad = [];
  for (const n of faqNodes) for (const q of [].concat(n.mainEntity || [])) {
    const qq = normWords(q.name || '');
    const aa = normWords(q.acceptedAnswer?.text || '');
    if (!qq || !visN.includes(qq)) faqBad.push(`pregunta no visible: "${q.name}"`);
    else if (!aa || !visN.includes(aa)) faqBad.push(`respuesta distinta a la visible: "${q.name}"`);
  }
  if (faqNodes.length && !faqNodes.some((n) => [].concat(n.mainEntity || []).length)) faqBad.push('FAQPage vacío');
  checks.push(chk('seo-faq-match', 'FAQPage coincide con las preguntas y respuestas visibles', !faqBad.length, faqBad.length ? list(faqBad) : faqNodes.length ? 'OK' : 'Sin FAQPage: no aplica.'));
  const hasVisFaq = ids.has('faq') || /<details\b/i.test(html) || heads.some((h) => /preguntas frecuentes/i.test(h.text));
  checks.push(chk('seo-faq-schema', 'FAQ visible con datos estructurados FAQPage', !hasVisFaq || faqNodes.length > 0, 'Hay FAQ visible sin FAQPage: se puede sumar.', 'low'));

  // OG / Twitter / lang
  const meta = (n, a = 'property') => els.find((e) => e.tag === 'meta' && (e.attrs[a] || '').toLowerCase() === n)?.attrs.content;
  const ogMissing = ['og:title', 'og:description', 'og:type'].filter((p) => !meta(p)).concat(base && !meta('og:url') ? ['og:url'] : []);
  checks.push(chk('seo-og', 'Open Graph completo (title, description, type)', !ogMissing.length, `Faltan: ${ogMissing.join(', ')}`));
  checks.push(chk('seo-twitter', 'Twitter Card', !!meta('twitter:card', 'name'), 'Falta twitter:card.', 'low'));
  const lang = (html.match(/<html[^>]*\blang=["']([^"']+)["']/i) || [])[1];
  checks.push(chk('seo-lang', 'Atributo lang en español', /^es\b/i.test(lang || ''), lang ? `lang="${lang}"` : 'Falta <html lang="es">.'));

  // noindex
  const robotsMeta = els.filter((e) => e.tag === 'meta' && /^(robots|googlebot|bingbot)$/i.test(e.attrs.name || '')).map((e) => e.attrs.content || '');
  const hdr = String(f['_headers'] ?? '');
  const rtxt = f['robots.txt'];
  const rb = rtxt !== undefined ? parseRobots(rtxt) : null;
  const noidx = [];
  if (robotsMeta.some((c) => /noindex|none/i.test(c))) noidx.push('meta robots noindex');
  if (/x-robots-tag\s*:.*noindex/i.test(hdr)) noidx.push('X-Robots-Tag noindex');
  if (rb && !botAllowed(rb, 'Googlebot')) noidx.push('robots.txt bloquea a Googlebot');
  checks.push(chk('seo-noindex', 'Sin noindex ni bloqueos accidentales', !noidx.length, noidx.join('; '), 'high'));

  // robots / sitemap
  const rOk = rb && rb.groups.length > 0 && rb.sitemaps.length > 0;
  checks.push(chk('seo-robots-txt', 'robots.txt presente, válido y con línea Sitemap', !!rOk, rtxt === undefined ? 'Falta robots.txt.' : !rb.groups.length ? 'Sin grupos User-agent.' : !rb.sitemaps.length ? 'Falta la línea Sitemap:.' : 'OK'));
  const sm = f['sitemap.xml'];
  const smErr = [];
  let locs = [];
  if (sm === undefined) smErr.push('Falta sitemap.xml.');
  else {
    if (!/<urlset[^>]+sitemaps\.org\/schemas\/sitemap\/0\.9/.test(sm) || !/<\/urlset>\s*$/.test(sm)) smErr.push('urlset inválido');
    if ((sm.match(/<url>/g) || []).length !== (sm.match(/<\/url>/g) || []).length) smErr.push('<url> sin balancear');
    locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());
    if (!locs.length) smErr.push('sin <loc>');
    if (locs.some((l) => !/^https?:\/\/[^\s]+$/.test(l))) smErr.push('hay <loc> no absolutos');
    for (const m of sm.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) if (!/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/.test(m[1]) || Number.isNaN(Date.parse(m[1]))) smErr.push(`lastmod inválido ${m[1]}`);
  }
  checks.push(chk('seo-sitemap', 'sitemap.xml presente y válido', !smErr.length, smErr.join('; ')));
  const exampleDom = locs.some((l) => /\/\/(www\.)?example\.com/.test(l));
  const wrongHost = base && locs.some((l) => !l.startsWith(base.replace(/\/$/, '')));
  checks.push(chk('seo-sitemap-domain', 'El sitemap apunta al dominio real', !wrongHost && !exampleDom, wrongHost ? 'El sitemap tiene URLs de otro dominio.' : 'Dominio de ejemplo: reemplazalo al publicar.', wrongHost ? 'medium' : 'low'));

  // NAP
  const nap = [];
  if (!visN.includes(normWords(b.name))) nap.push('el nombre del negocio no aparece');
  if (b.contact.address && !visN.includes(normWords(b.contact.address)) && !visN.includes(normWords(b.contact.address.split(',')[0]))) nap.push('la dirección del brief no aparece');
  const mine = [b.contact.phone, b.contact.whatsapp].filter(Boolean).map(last8);
  const linked = anchors.map((a) => a.attrs.href).filter((h) => /^tel:|wa\.me\/|api\.whatsapp\.com/i.test(h)).map((h) => (h.match(/phone=(\d+)/) ? last8(h.match(/phone=(\d+)/)[1]) : last8(h.split('?')[0])));
  const foreign = linked.filter((n) => mine.length && !mine.includes(n));
  if (foreign.length) nap.push(`hay teléfonos que no son los del brief: ${list(foreign)}`);
  if (mine.length && !linked.length && !digitsOf(vis).includes(mine[0])) nap.push('el teléfono del brief no aparece');
  checks.push(chk('seo-nap', 'Nombre, dirección y teléfono consistentes con el brief', !nap.length, nap.join('; ')));

  // peso y velocidad
  const total = Object.values(f).reduce((n, v) => n + (typeof v === 'string' ? Buffer.byteLength(v) : 0), 0);
  const hb = Buffer.byteLength(html);
  const blockingJs = els.filter((e) => e.tag === 'script' && e.attrs.src && !('defer' in e.attrs) && !('async' in e.attrs) && !/module/i.test(e.attrs.type || '') && !e.inHead === false && false);
  const headJs = els.filter((e) => e.tag === 'script' && e.attrs.src && e.inHead && !('defer' in e.attrs) && !('async' in e.attrs) && !/module/i.test(e.attrs.type || ''));
  const bigData = (html.match(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]{100000,}/g) || []).length;
  void blockingJs;
  checks.push(chk('seo-weight', 'Peso razonable como señal de velocidad (HTML ≤ 200 KB, total ≤ 1,5 MB, scripts con defer)', hb <= 200 * 1024 && total <= 1.5 * 1024 * 1024 && !headJs.length && !bigData, `HTML ${Math.round(hb / 1024)} KB, total ${Math.round(total / 1024)} KB${headJs.length ? `; scripts sin defer en <head>: ${list(headJs.map((e) => e.attrs.src))}` : ''}${bigData ? '; imágenes base64 enormes' : ''}.`, 'low'));

  /* ---------- IA ---------- */
  const mainHtml = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || html;
  const mainTxt = normWords(visibleText(mainHtml)).slice(0, 900);
  const facts = [kind.search, kind.label, ...b.services.map((s) => s.name), ...(b.place?.areas || []), b.contact.address || ''].map(normWords).filter((t) => t.length > 3);
  const hit = new Set(facts.filter((t) => mainTxt.includes(t)));
  ai.push(chk('ai-answer-first', 'Contenido "respuesta primero": quién es, qué hace y dónde, al comienzo', mainTxt.includes(normWords(b.name)) && hit.size >= 2, `Nombre ${mainTxt.includes(normWords(b.name)) ? 'sí' : 'no'} en el comienzo; hechos encontrados: ${hit.size}. Sumá un párrafo de 2-3 frases al inicio.`));
  ai.push(chk('ai-text-without-js', 'Los hechos están en el HTML (sin depender de JS)', words >= 80 && !rootOnly, `${words} palabras.`, 'high'));
  const sem = ['main', 'header', 'nav', 'footer', 'section'].filter((t) => !els.some((e) => e.tag === t));
  ai.push(chk('ai-semantic-html', 'HTML semántico (main, header, nav, section, footer, títulos)', !sem.length && heads.length >= 3, sem.length ? `Faltan: ${sem.join(', ')}` : `${heads.length} títulos.`));
  const factList = [b.name, b.contact.address, b.contact.hours, b.contact.email, ...b.services.map((s) => s.name), ...(b.place?.areas || [])].filter(Boolean);
  const present = factList.filter((x) => visN.includes(normWords(x)) || html.toLowerCase().includes(x.toLowerCase()));
  ai.push(chk('ai-citable-facts', 'Hechos citables visibles (nombre, servicios, dirección, horarios, contacto)', present.length >= Math.min(4, factList.length) && present.length / factList.length >= 0.6, `${present.length} de ${factList.length} datos del brief están en la página.`));
  const llms = f['llms.txt'];
  const llmsOk = typeof llms === 'string' && /^#\s+\S/.test(llms.trim()) && /^>\s+\S/m.test(llms) && /^##\s+\S/m.test(llms) && /\[[^\]]+\]\([^)]+\)/.test(llms);
  ai.push(chk('ai-llms-txt', 'llms.txt presente y con el formato de llmstxt.org', llmsOk, llms === undefined ? 'Falta llms.txt.' : 'Debe tener # título, > resumen, secciones ## y enlaces.', 'low'));
  const aiBlocked = [];
  if (rb) {
    const policyBlock = b.blockAI;
    for (const bot of BOTS) {
      const ok = botAllowed(rb, bot.name);
      const shouldAllow = !policyBlock && !(bot.purpose === 'entrenamiento' && b.excludeAITraining);
      if (policyBlock || (bot.purpose === 'entrenamiento' && b.excludeAITraining)) { if (bot.purpose === 'entrenamiento' && ok && (policyBlock || b.excludeAITraining)) aiBlocked.push(`${bot.name} debería estar bloqueado`); }
      else if (shouldAllow && !ok) aiBlocked.push(`${bot.name} está bloqueado`);
    }
  }
  ai.push(chk('ai-robots-bots', 'robots.txt respeta la política de bots de IA', !!rb && !aiBlocked.length, !rb ? 'Sin robots.txt.' : aiBlocked.join('; ')));
  const ent = biz[0];
  ai.push(chk('ai-structured-entity', 'Entidad clara en datos estructurados (nombre + contacto o sameAs)', !!ent && !!ent.name && !!(ent.telephone || ent.email || ent.sameAs || ent.address), ent ? '' : 'Sin nodo del negocio.'));
  const qHeads = heads.filter((h) => /\?|^(qu[eé]|c[oó]mo|d[oó]nde|cu[aá]nt|por qu[eé]|cu[aá]ndo)/i.test(h.text));
  ai.push(chk('ai-qa-format', 'Formato pregunta/respuesta (FAQ o títulos en forma de pregunta)', hasVisFaq || qHeads.length > 0, 'Sumá una sección de preguntas frecuentes.', 'low'));
  const names = new Set([title.split(/[|:–-]/).map((s) => normWords(s))].flat().filter(Boolean));
  ai.push(chk('ai-name-consistency', 'Nombre del negocio consistente (título, h1, pie, datos estructurados)', normWords(title).includes(normWords(b.name)) || visN.includes(normWords(b.name)), `Nombre del brief: ${b.name}`, 'low'));
  void names;

  const aiScore = score(ai);
  const all = [...checks, ...ai];
  return { passed: blocking(all).length === 0, score: score(all), checks, aiReadiness: { score: aiScore, checks: ai }, disclaimer: DISCLAIMER };
}
