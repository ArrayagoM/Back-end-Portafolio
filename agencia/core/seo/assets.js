// Generador de archivos y datos estructurados SEO: robots.txt, sitemap.xml, llms.txt, JSON-LD, docs y etiquetas <head>.
import { visibleText } from '../agents/tester.js';
import { DISCLAIMER, normBrief, norm, normWords, esc, jsonLdString, socialUrls, telOf, parseHours, parsePrice, listJoin, cap } from './util.js';
import { detectKind, SECTOR_DATA, BOTS } from './plan.js';

const ADDR_SPLIT = (addr) => addr.split(',').map((p) => p.trim()).filter(Boolean);

export function robotsTxt(policy, base) {
  const L = ['# robots.txt generado por Rocío (SEO y visibilidad)', `# ${policy.note}`, '', 'User-agent: *', 'Allow: /', ''];
  for (const bot of policy.botInfo || BOTS) {
    const training = bot.purpose === 'entrenamiento';
    const allow = policy.allowAI !== false && !(training && policy.allowTraining === false);
    L.push(`User-agent: ${bot.name}`, allow ? 'Allow: /' : 'Disallow: /', '');
  }
  L.push(`Sitemap: ${base ? `${base}sitemap.xml` : '/sitemap.xml'}`);
  return `${L.join('\n')}\n`;
}

export function sitemapXml(files, base, date) {
  const root = base || 'https://example.com/';
  const pages = Object.keys(files || {}).filter((p) => /^[^/]+\.html$/.test(p) && p !== 'index.html' && !/^(404|500)\.html$/.test(p));
  const urls = [root, ...pages.map((p) => new URL(p, root).href)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url>\n    <loc>${esc(u)}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`;
}

function visibleFaq(files, structure, plan) {
  const html = String(files?.['index.html'] ?? '');
  const struct = (structure?.sections || []).filter((s) => s.type === 'faq').flatMap((s) => s.content?.items || []).filter((i) => i?.q && i?.a);
  const cands = [...struct, ...(plan.faq || [])];
  if (!html) return { included: struct, extra: plan.faq || [] };
  const vis = normWords(visibleText(html));
  const included = [];
  const extra = [];
  for (const c of cands) {
    const ok = vis.includes(normWords(c.q)) && vis.includes(normWords(c.a));
    if (ok && !included.some((x) => x.q === c.q)) included.push(c);
    else if (!ok && !extra.some((x) => x.q === c.q) && !struct.includes(c)) extra.push(c);
  }
  return { included, extra };
}

export function buildJsonLd(b, kind, plan, faqItems) {
  const url = b.website;
  const same = socialUrls(b.contact).map((s) => s.url);
  const tel = telOf(b.contact);
  const hours = parseHours(b.contact.hours);
  const local = {
    '@context': 'https://schema.org', '@type': kind.schema, name: b.name,
    ...(b.description ? { description: b.description.replace(/\s+/g, ' ').slice(0, 300) } : {}),
    ...(url ? { url, '@id': `${url}#negocio` } : {}),
    ...(tel ? { telephone: tel } : {}),
    ...(b.contact.email ? { email: b.contact.email } : {}),
  };
  if (b.contact.address) {
    const parts = ADDR_SPLIT(b.contact.address);
    local.address = { '@type': 'PostalAddress', streetAddress: parts[0] || b.contact.address, ...(b.place?.city && parts.length > 1 && parts.slice(1).some((p) => norm(p) === norm(b.place.city)) ? { addressLocality: b.place.city } : {}) };
  }
  if (hours) local.openingHoursSpecification = hours;
  if (b.place) local.areaServed = b.place.areas.map((a) => ({ '@type': a === b.place.city ? 'City' : 'Place', name: a }));
  if (same.length) local.sameAs = same;
  if (b.services.length) {
    local.makesOffer = b.services.map((s) => {
      const p = parsePrice(s.price);
      return {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, ...(s.description ? { description: s.description } : {}) },
        ...(p && !p.from ? { price: p.amount, priceCurrency: 'ARS' } : {}),
        ...(p && p.from ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: p.amount, priceCurrency: 'ARS' } } : {}),
      };
    });
  }
  const out = [local];
  if (faqItems.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  out.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: b.name, inLanguage: 'es', ...(url ? { url } : {}) });
  out.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', ...(url ? { item: url } : {}) }] });
  return out;
}

function headTagsFor(html, b, plan, base) {
  const has = (re) => re.test(html);
  const T = [];
  const meta = (attr, name, content) => `<meta ${attr}="${name}" content="${esc(content)}">`;
  if (!html || !has(/<title[\s>]/i)) T.push(`<title>${esc(plan.titleTag)}</title>`);
  if (!html || !has(/<meta[^>]+name=["']description["']/i)) T.push(meta('name', 'description', plan.metaDescription));
  if (base && (!html || !has(/<link[^>]+rel=["']canonical["']/i))) T.push(`<link rel="canonical" href="${esc(base)}">`);
  if (!html || !has(/<meta[^>]+name=["']robots["']/i)) T.push(meta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'));
  const og = [['og:type', 'website'], ['og:title', plan.titleTag], ['og:description', plan.metaDescription], ['og:site_name', b.name], ['og:locale', 'es_AR'], ...(base ? [['og:url', base]] : [])];
  for (const [p, v] of og) if (!html || !has(new RegExp(`property=["']${p}["']`, 'i'))) T.push(meta('property', p, v));
  const tw = [['twitter:card', 'summary'], ['twitter:title', plan.titleTag], ['twitter:description', plan.metaDescription]];
  for (const [n, v] of tw) if (!html || !has(new RegExp(`name=["']${n}["']`, 'i'))) T.push(meta('name', n, v));
  if (!html || !has(/rel=["']sitemap["']/i)) T.push('<link rel="sitemap" type="application/xml" title="Sitemap" href="sitemap.xml">');
  return T;
}

const li = (items) => items.map((x) => `- ${x}`).join('\n');
function docs(b, plan, kind, notes, extraFaq) {
  const pol = plan.aiVisibility.robotsPolicy;
  const D = SECTOR_DATA[b.sector];
  const plan1 = `# Plan SEO de ${b.name}

> Preparado por Rocío, del equipo de SEO y visibilidad. ${plan.disclaimer}

## 1. Resumen
${b.name} es ${kind.art} ${kind.label}${b.place ? ` en ${b.place.label}` : ''}. Este documento reúne las palabras clave, los textos sugeridos, las acciones fuera del sitio y la forma de medir. ${b.place ? '' : 'El brief no trae ubicación, así que no armé SEO local: si tenés un local o una zona de trabajo, contámela y lo sumo.'}

## 2. Palabras clave
**Principales:**
${li(plan.primaryKeywords)}

**Secundarias:**
${li(plan.secondaryKeywords)}

**Cola larga (más específicas, suelen tener menos competencia):**
${li(plan.longTail)}

## 3. Intención de búsqueda
| Búsqueda | Intención | Sección de la página |
|---|---|---|
${plan.intents.map((i) => `| ${i.query} | ${i.intent} | ${i.section} |`).join('\n')}

## 4. SEO local
${plan.localTargets.length ? plan.localTargets.map((t) => `- ${t.queryPattern.replace('{service}', t.service).replace('{place}', t.place)}`).join('\n') : 'Sin ubicación en el brief: esta parte queda pendiente.'}

## 5. Título y descripción sugeridos
- **Título (${plan.titleTag.length} caracteres):** ${plan.titleTag}
- **Descripción (${plan.metaDescription.length} caracteres):** ${plan.metaDescription}

## 6. Estructura de títulos sugerida
${plan.headingPlan.map((h) => `${'  '.repeat(h.level - 1)}- h${h.level}: ${h.text} (${h.purpose})`).join('\n')}

## 7. Preguntas frecuentes propuestas
Las respuestas usan solo datos que nos pasaste. Si alguna cambia, actualizala en el sitio.
${plan.faq.map((f) => `- **${f.q}** ${f.a}`).join('\n')}
${extraFaq.length ? `\nPreguntas que todavía no están visibles en la página y conviene sumar antes de publicar sus datos estructurados:\n${li(extraFaq.map((f) => f.q))}\n` : ''}
## 8. Acciones fuera del sitio, paso a paso
${plan.offSite.map((o, i) => `### ${i + 1}. ${o.title}
**Para qué:** ${o.why}
**Esfuerzo:** ${o.effort} · **Impacto esperado:** ${o.impact} · **Tiempo:** ${o.timeline}

${o.steps.map((s, j) => `${j + 1}. ${s}`).join('\n')}
`).join('\n')}
## 9. Objetivos realistas
Son rangos orientativos y condicionales, no promesas.
| Qué medimos | Rango realista | Plazo |
|---|---|---|
${plan.targets.map((t) => `| ${t.metric} | ${t.realisticRange} | ${t.horizon} |`).join('\n')}

## 10. Cómo medir
1. **Mes 0:** anotá la línea de base en Search Console (impresiones, clics, CTR y posición promedio).
2. **Cada mes:** mirá qué búsquedas te muestran, qué páginas reciben clics y qué consultas nuevas aparecen.
3. **Acciones:** contá clics a WhatsApp, llamadas y formularios; son las que importan para el negocio.
4. **Ficha de Google:** revisá vistas, llamadas, pedidos de ruta y reseñas nuevas.
5. **Ajustá:** mejorá los textos de las páginas con impresiones pero pocos clics y publicá contenido sobre las preguntas nuevas.
${notes.length ? `\n## Notas técnicas\n${li(notes)}\n` : ''}
## Aviso importante
${DISCLAIMER}
`;
  const ai = `# Visibilidad en IAs: ${b.name}

> Preparado por Rocío. Objetivo: aumentar las chances de que ChatGPT, Gemini, Perplexity, Claude, Copilot y los resúmenes de Google puedan entender y citar a ${b.name}. ${plan.disclaimer}

## 1. Cómo funciona (en criollo)
Los asistentes de IA arman respuestas a partir de páginas que pueden leer, de buscadores como Google y Bing y de fichas como Google Maps. No hay un botón para "entrar": lo que sí se puede hacer es ser fácil de leer, tener datos claros y consistentes y estar bien indexado.

## 2. Bloque de respuesta directa
Pegalo cerca del principio de la página (por ejemplo, en el hero o en "Quiénes somos"):

> ${plan.aiVisibility.answerBlock}

## 3. Datos de la entidad (deben ser idénticos en todos lados)
${plan.aiVisibility.entityFacts.map((f) => `- **${f.label}:** ${f.value}`).join('\n')}

## 4. Bots y robots.txt
${pol.note}

| Bot | Para qué lo usa | Estado en robots.txt |
|---|---|---|
${BOTS.map((x) => `| ${x.name} | ${x.owner} | ${pol.allowAI === false || (x.purpose === 'entrenamiento' && pol.allowTraining === false) ? 'bloqueado' : 'permitido'} |`).join('\n')}

Bloquear Google-Extended no te saca de la búsqueda de Google ni de sus resúmenes con IA. Un robots.txt es una convención: los bots respetuosos lo siguen, pero no todos.

## 5. llms.txt
Incluimos un archivo llms.txt con un resumen de tu negocio y enlaces a lo importante. Es una propuesta de convención (llmstxt.org): no todos los sistemas la leen y no hay evidencia firme de cuánto influye. Es barato de mantener y no hace daño.

## 6. Datos estructurados
El sitio incluye JSON-LD (schema.org) con tu negocio, tus servicios, tus preguntas frecuentes y tus perfiles reales. Se genera solo con datos reales del brief: sin reseñas ni premios inventados.

## 7. Consejos para ser más citable
${li(plan.aiVisibility.citabilityTips)}

## 8. Cómo probar cada mes
${li([`Preguntale a cada asistente cosas como "¿qué ${kind.label} recomendás${b.place ? ` en ${b.place.label}` : ''}?" y "¿qué es ${b.name}?".`, 'Probá en una ventana privada y anotá: si te mencionan, si citan tu sitio y si los datos son correctos.', 'Repetí cada mes con las mismas preguntas y compará.', 'Si dicen algo incorrecto, corregí la fuente: tu sitio, tu ficha y tus directorios.'])}

## Aviso importante
${DISCLAIMER}
`;
  void D;
  return { 'SEO-PLAN.md': plan1, 'VISIBILIDAD-IA.md': ai };
}

/** buildSeoAssets(files, brief, structure, plan) -> { files, jsonld, docs, headTags, notes } */
export function buildSeoAssets(files, rawBrief, structure, plan, opts = {}) {
  const b = normBrief(rawBrief);
  const kind = detectKind(b);
  const base = b.website;
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const html = String(files?.['index.html'] ?? '');
  const notes = [];
  const pol = plan.aiVisibility.robotsPolicy;
  const { included, extra } = visibleFaq(files, structure, plan);
  const jsonld = buildJsonLd(b, kind, plan, included);
  if (!base) notes.push('Sin URL del sitio: el sitemap usa el dominio de ejemplo https://example.com/ y robots.txt apunta a /sitemap.xml. Reemplazalo por el dominio real al publicar.');
  if (b.contact.hours && !parseHours(b.contact.hours)) notes.push('El texto de horarios no es 100% inequívoco: se omitió openingHoursSpecification para no publicar datos dudosos.');
  if (b.services.some((s) => parsePrice(s.price))) notes.push('Los precios con "$" se informaron en pesos argentinos (ARS): verificá que sea la moneda correcta.');
  if (!included.length) notes.push('No hay preguntas frecuentes visibles en la página: no se generó FAQPage (Google exige que coincidan con lo visible).');
  if (extra.length) notes.push(`${extra.length} pregunta(s) frecuente(s) del plan no están visibles en la página; sumalas al sitio antes de incluirlas en FAQPage.`);
  if (/application\/ld\+json/i.test(html)) notes.push('El index.html ya trae JSON-LD propio: reemplazalo por el generado acá para evitar duplicados.');
  if (html && plan.titleTag && !new RegExp(`<title[^>]*>\\s*${esc(plan.titleTag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</title>`).test(html)) notes.push(`Título sugerido: "${plan.titleTag}" (el sitio usa otro; elegí el que prefieras).`);
  const files2 = { 'robots.txt': robotsTxt(pol, base), 'sitemap.xml': sitemapXml(files, base, date), 'llms.txt': plan.aiVisibility.llmsTxt };
  return { files: files2, jsonld, docs: docs(b, plan, kind, notes, extra), headTags: headTagsFor(html, b, plan, base), notes };
}

/** Helper para el integrador: agrega los archivos, las etiquetas y el JSON-LD al sitio (no muta `files`). */
export function applySeoAssets(files, assets) {
  const out = { ...files, ...assets.files };
  if (typeof out['index.html'] === 'string') {
    const block = [...assets.headTags, ...assets.jsonld.map((o) => `<script type="application/ld+json">\n${jsonLdString(o)}\n</script>`)].join('\n');
    out['index.html'] = out['index.html'].replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '').replace(/<\/head>/i, `${block}\n</head>`);
  }
  return out;
}
void listJoin; void cap;
