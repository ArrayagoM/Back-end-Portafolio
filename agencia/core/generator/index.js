// Generador de sitios estáticos. API: makeCtx, renderHeader, renderFloat, renderSection,
// buildStyles, buildScript, buildSeoHead, buildRobots, buildSitemap, assemblePage.
import { esc, str, slug } from './util.js';
import { icon } from './icons.js';
import { makeCtx, navItems } from './context.js';
import { renderSection } from './sections.js';
import { buildStyles } from './styles.js';
import { buildScript } from './script.js';
import { buildSeoHead, buildRobots, buildSitemap } from './seo.js';
import { securityMeta, inlineScriptSource, buildHeadersFile } from './security.js';
import { marquee, stats } from './motifs.js';

export { esc, makeCtx, renderSection, buildStyles, buildScript, buildSeoHead, buildRobots, buildSitemap, buildHeadersFile };

/** Marca del header: logo (<img>) si hay; si no, el monograma de siempre. */
function brandMark(g) {
  if (!g.logo) return `<span class="brand-mark" aria-hidden="true">${esc(g.name.trim().charAt(0).toUpperCase())}</span><span>${esc(g.name)}</span>`;
  const l = g.logo;
  return `<img class="brand-logo" src="${esc(l.file)}" alt="${esc(l.alt)}" width="${l.width}" height="${l.height}" decoding="async">${l.hasText ? `<span class="sr-only">${esc(g.name)}</span>` : `<span>${esc(g.name)}</span>`}`;
}

export function renderHeader(g) {
  const nav = navItems(g).slice(0, 6);
  const links = nav.map((n) => `<li><a href="#${esc(n.id)}">${esc(n.label)}</a></li>`).join('');
  const cta = `<a class="btn btn-primary btn-sm nav-cta" href="${esc(g.cta.href)}"${g.cta.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(g.cta.label)}</a>`;
  return `<a class="skip" href="#main">Saltar al contenido</a>
<header class="site-header" data-nav="${esc(g.plan.nav)}">
<div class="container">
<div class="nav">
<a class="brand" href="#top" aria-label="${esc(g.name)} - inicio">${brandMark(g)}</a>
<nav aria-label="Principal"><ul class="nav-links">${links}</ul></nav>
${cta}
<button class="burger" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Abrir menú"><svg class="m" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
</div>
<div class="mobile-menu" id="mobile-menu"><ul>${nav.map((n) => `<li><a href="#${esc(n.id)}">${esc(n.label)}</a></li>`).join('')}</ul><a class="btn btn-primary" href="${esc(g.cta.href)}"${g.cta.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(g.cta.label)}</a></div>
</div>
</header>`;
}

export function renderFloat(g) {
  if (!g.links.wa) return '';
  return `<a class="wa-float" href="${esc(g.links.wa)}" target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp a ${esc(g.name)}">${icon('whatsapp')}</a>`;
}

/**
 * Ensambla index.html. `partials` = { [sectionId]: html, header, float, seo } (opcionales; si faltan se generan).
 * `extras` = [{kind:'contains'|'link'|'meta', value}] correcciones aplicadas por tareas fix.
 */
export function assemblePage(g, partials = {}, extras = []) {
  const header = partials.header || renderHeader(g);
  const float = partials.float ?? renderFloat(g);
  const seoHead = partials.seo || buildSeoHead(g);
  const parts = g.sections.map((s) => ({ s, html: partials[slug(s.id || s.type)] ?? renderSection(g, s) }));
  const main = parts.filter((p) => p.s.type !== 'footer').map((p) => (p.s.type === 'hero' ? `${p.html}\n${marquee(g)}\n${stats(g)}` : p.html)).join('\n');
  const footerHtml = parts.filter((p) => p.s.type === 'footer').map((p) => p.html).join('\n')
    || renderSection(g, { id: 'footer', type: 'footer', content: {} });
  const ex = arr2(extras).map((e) => {
    const v = str(e.value);
    if (!v) return '';
    if (e.kind === 'link') return `<a href="${esc(v)}">${esc(v)}</a>`;
    if (e.kind === 'meta') return '';
    return `<span>${esc(v)}</span>`;
  }).filter(Boolean).join(' ');
  const metaExtra = arr2(extras).filter((e) => e.kind === 'meta' && str(e.value)).map((e) => `<meta name="${esc(str(e.name || 'x-extra'))}" content="${esc(str(e.value))}">`).join('\n');
  return `<!DOCTYPE html>
<html lang="es" id="top">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${securityMeta()}
${seoHead}
${metaExtra}
<script>${inlineScriptSource}</script>
<link rel="stylesheet" href="styles.css">
</head>
<body data-style="${esc(g.theme.style)}"${g.vision ? ` data-motif="${esc(g.vision.motif)}" data-motion="${esc(g.vision.motion)}"` : ''} data-boldness="${esc(g.boldness)}" data-hero="${esc(g.plan.hero)}" data-nav="${esc(g.plan.nav)}" data-shapes="${esc(g.plan.shapes)}" data-dividers="${esc(g.plan.dividers)}">
${header}
<main id="main">
${main}
${ex ? `<div class="sr-only" data-extras>${ex}</div>` : ''}
</main>
${footerHtml}
${float}
<script src="script.js" defer></script>
</body>
</html>
`;
}

const arr2 = (v) => (Array.isArray(v) ? v : []);
