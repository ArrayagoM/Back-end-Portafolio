// SEO: <head> metadatos, OG, favicon SVG inline, JSON-LD, robots y sitemap.
import { esc, str, arr, jsonSafe, enc } from './util.js';

const siteUrl = (g) => {
  const u = str(g.brief?.website || g.brief?.url);
  return /^https?:\/\//i.test(u) ? u.replace(/\/?$/, '/') : '';
};

// Pesos que Google Fonts realmente ofrece (pedir uno inexistente hace fallar TODA la hoja de la fuente).
const FONT_WEIGHTS = {
  'Space Grotesk': '300..700', Sora: '300..800', Outfit: '300..800', Syne: '400..800', 'Bricolage Grotesque': '300..800',
  Manrope: '300..800', Inter: '300..800', 'DM Sans': '300..800', 'Plus Jakarta Sans': '300..800', Montserrat: '300..800',
  'Open Sans': '300..800', Nunito: '300..900', Fraunces: '300..800', Jost: '300..800', 'Source Sans 3': '300..800',
  'Playfair Display': '400..800', 'Roboto Slab': '300..800', Oswald: '300..700', Fredoka: '300..700',
  'Cormorant Garamond': '300;400;500;600;700', Lato: '300;400;700;900', Merriweather: '300;400;700;900',
  Roboto: '300;400;500;700;900', Poppins: '300;400;500;600;700;800',
};
const weightsOf = (f) => FONT_WEIGHTS[f] || '400;500;600;700';

/** URL del archivo del sitio: absoluta si el cliente dio su web (og:image y JSON-LD lo piden asi), si no relativa. */
const assetUrl = (g, rel) => (siteUrl(g) ? siteUrl(g) + rel : rel);

/** <link rel="icon"> y og:image segun el logo: favicon desde el icono SVG o el logo raster; si no hay logo, el monograma de siempre. */
function iconLink(g) {
  const l = g.logo;
  if (l && l.iconFile) return `<link rel="icon" type="${esc(l.iconMime)}" href="${esc(l.iconFile)}">${l.raster ? `
<link rel="apple-touch-icon" href="${esc(l.iconFile)}">` : ''}`;
  return `<link rel="icon" type="image/svg+xml" href="${esc(faviconHref(g))}">`;
}
function ogImageTags(g) {
  const l = g.logo;
  const file = l ? l.file : (g.images[0] ? g.images[0].file : '');
  if (!file) return '';
  const alt = l ? l.alt : g.images[0].alt;
  return `<meta property="og:image" content="${esc(assetUrl(g, file))}">
<meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:image" content="${esc(assetUrl(g, file))}">
`;
}

function faviconHref(g) {
  const letter = g.name.trim().charAt(0).toUpperCase() || 'A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${g.theme.palette.primary}"/><text x="32" y="45" font-family="Georgia,serif" font-size="38" font-weight="700" text-anchor="middle" fill="#ffffff">${esc(letter)}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function buildSeoHead(g) {
  const seo = g.seo || {};
  const title = str(seo.title) || `${g.name}${g.sector ? ' | ' + g.sector : ''}`;
  const desc = (str(seo.description) || g.description || `${g.name}: contactanos.`).slice(0, 300);
  const kw = arr(seo.keywords).map(str).filter(Boolean).join(', ');
  const url = siteUrl(g);
  const p = g.theme.palette;
  const gf = [g.theme.fontHeading, g.theme.fontBody].filter((v, i, a) => a.indexOf(v) === i)
    .map((f) => `family=${enc(f).replace(/%20/g, '+')}:wght@${weightsOf(f)}`).join('&');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: g.name,
    description: desc,
    ...(url ? { url } : {}),
    ...(g.logo ? { logo: assetUrl(g, g.logo.file), image: assetUrl(g, g.logo.file) } : (g.images[0] ? { image: assetUrl(g, g.images[0].file) } : {})),
    ...(g.contact.phone ? { telephone: g.contact.phone } : {}),
    ...(g.contact.email ? { email: g.contact.email } : {}),
    ...(g.contact.address ? { address: { '@type': 'PostalAddress', streetAddress: g.contact.address } } : {}),
    ...(g.contact.hours ? { openingHours: g.contact.hours } : {}),
    ...(g.links.ig ? { sameAs: [g.links.ig] } : {}),
    ...(g.services.length ? {
      makesOffer: g.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: str(s.name), ...(str(s.description) ? { description: str(s.description) } : {}) }
      }))
    } : {})
  };

  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${kw ? `<meta name="keywords" content="${esc(kw)}">\n` : ''}<meta name="theme-color" content="${esc(p.primary)}">
<meta name="robots" content="index,follow">
${g.vision && g.vision.name ? `<meta name="design-concept" content="${esc(g.vision.name)} (${esc(g.vision.motif)} / ${esc(g.vision.motion)})">
` : ''}
${url ? `<link rel="canonical" href="${esc(url)}">\n` : ''}<meta property="og:type" content="website">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:site_name" content="${esc(g.name)}">
${url ? `<meta property="og:url" content="${esc(url)}">\n` : ''}${ogImageTags(g)}<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
${iconLink(g)}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${gf}&display=swap">
<script type="application/ld+json">
${jsonSafe(ld)}
</script>`;
}

export const buildRobots = (g) => `User-agent: *\nAllow: /\n${siteUrl(g) ? `Sitemap: ${siteUrl(g)}sitemap.xml\n` : 'Sitemap: /sitemap.xml\n'}`;

export function buildSitemap(g) {
  const loc = siteUrl(g) || 'https://example.com/';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${esc(loc)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;
}
