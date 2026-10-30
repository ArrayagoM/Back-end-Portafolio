// CSS del sitio: variables desde theme, mobile-first, variantes por theme.style.
import { mix, ensure, onColor, lum } from './util.js';
import { motifCss, motifReducedCss } from './motifs.js';
import { boldCss, boldReducedCss } from './bold.js';
import { layoutCss, layoutReducedCss } from './layoutcss.js';

export function buildStyles(g) {
  const t = g.theme;
  const p = t.palette;
  const dark = lum(p.bg) < 0.25;
  const textC = ensure(p.text, p.bg, 7);
  const muted = ensure(p.muted, p.bg, 4.5);
  const primaryInk = ensure(p.primary, p.bg, 4.5);
  const accentInk = ensure(p.accent, p.bg, 4.5);
  const surfaceMuted = ensure(p.muted, p.surface, 4.5);
  const line = mix(textC, p.bg, 0.86);
  const tint = mix(p.primary, p.bg, dark ? 0.86 : 0.93);
  const deep = mix(p.secondary, dark ? '#000000' : '#000000', 0.25);
  const onDeep = onColor(deep);
  const onPrimary = onColor(p.primary);
  const onAccent = onColor(p.accent);
  const r = t.radius;
  const shadow = dark ? '0 10px 30px rgba(0,0,0,.45)' : `0 10px 30px ${mix(p.secondary, '#ffffff', 0.55)}55`;

  return `/* Generado por Agencia IA — estilo: ${t.style} */
:root{
  --primary:${p.primary};--primary-ink:${primaryInk};--accent-ink:${accentInk};--on-primary:${onPrimary};
  --secondary:${p.secondary};--accent:${p.accent};--on-accent:${onAccent};
  --bg:${p.bg};--surface:${p.surface};--text:${textC};--muted:${muted};--surface-muted:${surfaceMuted};
  --line:${line};--tint:${tint};--deep:${deep};--on-deep:${onDeep};
  --radius:${r}px;--radius-lg:${Math.round(r * 1.6)}px;--shadow:${shadow};
  --font-h:"${t.fontHeading}",ui-serif,Georgia,"Times New Roman",serif;
  --font-b:"${t.fontBody}",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --fs-0:clamp(.94rem,.9rem + .2vw,1.03rem);
  --fs-1:clamp(1.05rem,1rem + .4vw,1.25rem);
  --fs-2:clamp(1.25rem,1.1rem + .8vw,1.65rem);
  --fs-3:clamp(1.7rem,1.3rem + 1.8vw,2.6rem);
  --fs-4:clamp(2.2rem,1.4rem + 4vw,4.1rem);
  --space:clamp(3.5rem,2.5rem + 5vw,7rem);
  --wrap:1140px;
  color-scheme:${dark ? 'dark' : 'light'};
}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:5rem;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-b);font-size:var(--fs-0);line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img,svg{max-width:100%;display:block}
h1,h2,h3{font-family:var(--font-h);line-height:1.12;margin:0 0 .5em;color:var(--text);text-wrap:balance}
h1{font-size:var(--fs-4);letter-spacing:-.02em}
h2{font-size:var(--fs-3);letter-spacing:-.015em}
h3{font-size:var(--fs-1)}
p{margin:0 0 1em;text-wrap:pretty}
a{color:var(--primary-ink);text-underline-offset:.2em}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:4px}
.container{width:min(100% - 2rem,var(--wrap));margin-inline:auto}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:1rem;top:-4rem;background:var(--text);color:var(--bg);padding:.6rem 1rem;border-radius:var(--radius);z-index:100;transition:top .2s}
.skip:focus{top:1rem}
.ico{width:1.25em;height:1.25em;flex:none}

/* Header */
.site-header{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid transparent;transition:border-color .25s,box-shadow .25s}
.site-header.scrolled{border-color:var(--line);box-shadow:0 6px 24px rgba(0,0,0,.06)}
.nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:4rem}
.brand{display:flex;align-items:center;gap:.6rem;font-family:var(--font-h);font-weight:700;font-size:1.2rem;color:var(--text);text-decoration:none}
.brand-mark{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:calc(var(--radius) * .7);background:var(--primary);color:var(--on-primary);font-size:1.05rem}
.nav-links{display:none;list-style:none;margin:0;padding:0;gap:.25rem}
.nav-links a{display:block;padding:.5rem .8rem;border-radius:999px;color:var(--text);text-decoration:none;font-weight:500;font-size:.95rem}
.nav-links a:hover,.nav-links a.active{background:var(--tint);color:var(--primary-ink)}
.nav .nav-cta{display:none}
.burger{display:inline-grid;place-items:center;width:2.75rem;height:2.75rem;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:var(--radius);cursor:pointer}
.burger svg{width:1.4rem;height:1.4rem}
.burger .x{display:none}
.burger[aria-expanded="true"] .x{display:block}
.burger[aria-expanded="true"] .m{display:none}
.mobile-menu{display:none;padding:.5rem 0 1.25rem;border-top:1px solid var(--line)}
.mobile-menu.open{display:block}
.mobile-menu ul{list-style:none;margin:0 0 1rem;padding:0}
.mobile-menu a:not(.btn){display:block;padding:.85rem .25rem;color:var(--text);text-decoration:none;font-weight:600;border-bottom:1px solid var(--line)}
.mobile-menu .btn{width:100%}

/* Botones */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;padding:.85rem 1.4rem;border-radius:var(--radius);font:inherit;font-weight:700;font-size:.98rem;line-height:1.2;text-decoration:none;border:2px solid transparent;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background-color .18s ease;min-height:2.9rem}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(0)}
.btn-primary{background:var(--primary);color:var(--on-primary);box-shadow:0 8px 20px color-mix(in srgb,var(--primary) 35%,transparent)}
.btn-primary:hover{background:color-mix(in srgb,var(--primary) 88%,#000)}
.btn-ghost{background:transparent;color:var(--primary-ink);border-color:color-mix(in srgb,var(--primary-ink) 45%,transparent)}
.btn-ghost:hover{background:var(--tint)}
.btn-wa{background:#128c4a;color:#fff;box-shadow:0 8px 20px rgba(18,140,74,.3)}
.btn-wa:hover{background:#0e7a40}
.btn-sm{padding:.55rem 1rem;min-height:2.4rem;font-size:.9rem}

/* Secciones */
.section{padding-block:var(--space);position:relative}
main>.section:not(.hero):nth-of-type(even){background:var(--tint)}
.sec-head{max-width:46rem;margin-bottom:clamp(1.8rem,3vw,3rem)}
.eyebrow{display:inline-block;margin:0 0 .8rem;font-size:.82rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--primary-ink)}
.lead{font-size:var(--fs-1);color:var(--muted);max-width:40rem}
.sec-cta{margin-top:2.2rem}
.grid{list-style:none;margin:0;padding:0;display:grid;gap:1.25rem}

/* Hero */
.hero{padding-block:clamp(3rem,2rem + 6vw,7rem);overflow:hidden;isolation:isolate}
.hero-bg{position:absolute;inset:0;z-index:-1;pointer-events:none}
.hero-bg svg{width:100%;height:100%}
.hero-bg .b1{fill:var(--primary);opacity:.13}
.hero-bg .b2{fill:var(--accent);opacity:.16}
.hero-bg .b3{fill:var(--secondary);opacity:.08}
.hero-grid{display:grid;gap:2.5rem;align-items:center}
.hero-copy .lead{margin-bottom:1.6rem}
.hero-actions{display:flex;flex-wrap:wrap;gap:.8rem}
.hero-badges{list-style:none;margin:1.8rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.6rem 1.4rem;color:var(--muted);font-size:.95rem}
.hero-badges li{display:flex;align-items:center;gap:.4rem}
.hero-badges .ico{color:var(--primary-ink)}
.hero-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:1.6rem;box-shadow:var(--shadow);color:var(--surface-muted)}
.hero-card-title{font-family:var(--font-h);font-weight:700;font-size:1.25rem;color:var(--text);margin-bottom:1rem}
.hero-card ul{list-style:none;margin:0;padding:0;display:grid;gap:1rem}
.hero-card li{display:flex;gap:.8rem;align-items:flex-start}
.hero-card li .ico{color:var(--primary-ink);margin-top:.2rem}
.hero-card strong{display:block;color:var(--text);font-size:.85rem;text-transform:uppercase;letter-spacing:.06em}
.hero-mark{display:grid;place-items:center;min-height:14rem;background:linear-gradient(135deg,var(--primary),var(--secondary));border:0}
.hero-mark span{font-family:var(--font-h);font-size:7rem;color:var(--on-primary);opacity:.9}

/* About */
.about-grid{display:grid;gap:2rem;align-items:start}
.about-copy p{color:var(--muted);font-size:var(--fs-1)}
.check-list{list-style:none;margin:0;padding:1.5rem;display:grid;gap:.9rem;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg)}
.check-list li{display:flex;gap:.7rem;align-items:flex-start;color:var(--text)}
.check-list .ico{color:var(--on-primary);background:var(--primary);border-radius:50%;padding:.2rem;width:1.5rem;height:1.5rem;margin-top:.1rem}
.about-mark{display:grid;place-items:center;min-height:12rem;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--primary),var(--secondary));color:var(--on-primary)}
.about-mark .ico{width:4rem;height:4rem}

/* Tarjetas servicios */
.cards{grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:1.6rem;transition:transform .25s,box-shadow .25s,border-color .25s;display:flex;flex-direction:column;color:var(--surface-muted)}
.card:hover{transform:translateY(-5px);box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--primary) 40%,var(--line))}
.js .card.reveal.in:hover{transform:translateY(-5px)}
.card h3{color:var(--text)}
.card p{margin-bottom:.6em}
.card-ico,.benefit-ico{display:grid;place-items:center;width:3rem;height:3rem;border-radius:calc(var(--radius) * .9);background:var(--tint);color:var(--primary-ink);margin-bottom:1rem;flex:none}
.card-ico .ico,.benefit-ico .ico{width:1.5rem;height:1.5rem}
.price{margin-top:auto;padding-top:.5rem;font-weight:800;color:var(--primary-ink);font-size:1.1rem}

/* Beneficios */
.benefits{grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1.8rem}
.benefit{display:flex;gap:1rem;align-items:flex-start}
.benefit-ico{margin-bottom:0;background:var(--primary);color:var(--on-primary)}
.benefit h3{margin-bottom:.25em}
.benefit p{color:var(--muted);margin:0}

/* Testimonios */
.quotes{grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))}
.quote{margin:0;height:100%;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:1.6rem;display:flex;flex-direction:column;gap:1rem;color:var(--surface-muted)}
.quote-ico{width:2rem;height:2rem;color:var(--primary-ink);opacity:.5}
.quote blockquote{margin:0;font-size:var(--fs-1);color:var(--text)}
.quote blockquote p{margin:0}
.quote figcaption{display:flex;align-items:center;gap:.8rem;margin-top:auto}
.quote small{display:block;color:var(--surface-muted)}
.avatar{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:var(--primary);color:var(--on-primary);font-weight:800;flex:none}

/* Galería */
.gallery{grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))}
.tile figure{margin:0;border-radius:var(--radius-lg);overflow:hidden;background:var(--surface);border:1px solid var(--line)}
.tile img{width:100%;aspect-ratio:4/3;object-fit:cover}
.tile-art{display:grid;place-items:center;aspect-ratio:4/3;color:var(--on-primary);background:linear-gradient(135deg,var(--primary),var(--secondary))}
.tile-art.t1{background:linear-gradient(160deg,var(--secondary),var(--primary))}
.tile-art.t2{background:linear-gradient(135deg,var(--accent),var(--primary));color:var(--on-accent)}
.tile-art.t3{background:linear-gradient(200deg,var(--primary),var(--accent));color:var(--on-primary)}
.tile-art.t4{background:linear-gradient(120deg,var(--deep),var(--primary));color:var(--on-deep)}
.tile-art .ico{width:2.6rem;height:2.6rem;opacity:.9}
.tile figcaption{padding:.8rem 1rem;font-weight:600;color:var(--text)}

/* Horarios */
.hours-grid{display:grid;gap:1.5rem}
.hours-list{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:.5rem 1.5rem}
.hours-row{display:flex;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--line)}
.hours-row:last-child{border-bottom:0}
.hours-row dt{font-weight:700;color:var(--text)}
.hours-row dd{margin:0;color:var(--surface-muted);text-align:right}
.hours-side{display:flex;flex-direction:column;gap:1rem;align-items:flex-start;padding:1.5rem;border-radius:var(--radius-lg);background:var(--deep);color:var(--on-deep)}
.hours-side p{margin:0}
.big-ico{width:2.6rem;height:2.6rem}
.hours-side .btn-ghost{color:var(--on-deep);border-color:color-mix(in srgb,var(--on-deep) 55%,transparent)}
.hours-side .btn-ghost:hover{background:color-mix(in srgb,var(--on-deep) 14%,transparent)}

/* FAQ */
.faq-list{display:grid;gap:.8rem;max-width:50rem}
.faq-item{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);color:var(--surface-muted)}
.faq-item summary{display:flex;justify-content:space-between;align-items:center;gap:1rem;cursor:pointer;padding:1.1rem 1.3rem;font-weight:700;color:var(--text);list-style:none}
.faq-item summary::-webkit-details-marker{display:none}
.faq-chev{transition:transform .25s;color:var(--primary-ink)}
.faq-item[open] .faq-chev{transform:rotate(180deg)}
.faq-item[open]{border-color:color-mix(in srgb,var(--primary) 40%,var(--line))}
.faq-a{padding:0 1.3rem 1.1rem}
.faq-a p{margin:0}

/* Contacto */
.s-contact{background:var(--tint)}
.contact-grid{display:grid;gap:2rem;align-items:start}
.contact-actions{display:flex;flex-wrap:wrap;gap:.7rem;margin-bottom:1.8rem}
.info-list{list-style:none;margin:0;padding:0;display:grid;gap:1.1rem}
.info-list li{display:flex;gap:.9rem;align-items:flex-start}
.info-list .ico{color:var(--primary-ink);margin-top:.25rem}
.info-list strong{display:block;font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.form{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:1.6rem;box-shadow:var(--shadow);color:var(--surface-muted)}
.form h3{color:var(--text);margin-bottom:1rem}
.field{display:grid;gap:.35rem;margin-bottom:1rem}
.field label{font-weight:700;font-size:.9rem;color:var(--text)}
.field input,.field textarea{width:100%;font:inherit;color:var(--text);background:var(--bg);border:1.5px solid color-mix(in srgb,var(--text) 28%,var(--bg));border-radius:var(--radius);padding:.8rem .95rem;min-height:2.9rem}
.field input:focus,.field textarea:focus{outline:3px solid color-mix(in srgb,var(--accent) 70%,transparent);outline-offset:1px;border-color:var(--primary)}
.field textarea{resize:vertical}
.field .invalid{border-color:#c0262d}
.form-actions{display:flex;flex-wrap:wrap;gap:.7rem}
.form-note{margin:1rem 0 0;font-size:.85rem;color:var(--surface-muted)}

/* Footer */
.site-footer{background:var(--deep);color:var(--on-deep);padding-top:clamp(2.5rem,5vw,4rem)}
.site-footer a{color:var(--on-deep);opacity:.9}
.foot-grid{display:grid;gap:2rem;padding-bottom:2rem}
.foot-brand{font-family:var(--font-h);font-size:1.5rem;font-weight:700;margin-bottom:.5rem}
.foot-desc{opacity:.8;max-width:26rem}
.foot-title{font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:.8rem;opacity:.75;margin-bottom:.8rem}
.site-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.foot-social{display:flex;gap:.6rem}
.foot-social a{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;border:1px solid color-mix(in srgb,var(--on-deep) 35%,transparent)}
.foot-social a:hover{background:color-mix(in srgb,var(--on-deep) 15%,transparent)}
.foot-base{border-top:1px solid color-mix(in srgb,var(--on-deep) 18%,transparent);padding-block:1.2rem;font-size:.88rem;opacity:.8}
.foot-base p{margin:0}

/* WhatsApp flotante */
.wa-float{position:fixed;right:1rem;bottom:1rem;z-index:60;display:grid;place-items:center;width:3.6rem;height:3.6rem;border-radius:50%;background:#128c4a;color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.28);transition:transform .2s}
.wa-float:hover{transform:scale(1.08)}
.wa-float .ico{width:1.9rem;height:1.9rem}

/* Animaciones on-scroll */
.js .reveal{opacity:0;transform:translateY(22px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--d,0) * 70ms)}
.js .reveal.in{opacity:1;transform:none}
.js .section .sec-head,.js .section .about-copy,.js .section .about-side,.js .section .hours-grid,.js .section .contact-info,.js .section .form,.js .hero-copy,.js .hero-card{opacity:0;transform:translateY(22px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.js .section.in .sec-head,.js .section.in .about-copy,.js .section.in .about-side,.js .section.in .hours-grid,.js .section.in .contact-info,.js .section.in .form,.js .hero.in .hero-copy,.js .hero.in .hero-card{opacity:1;transform:none}
.js .hero.in .hero-card{transition-delay:.15s}

/* Breakpoints (mobile-first) */
@media (min-width:640px){
  .hours-grid{grid-template-columns:1.4fr 1fr}
  .foot-grid{grid-template-columns:1.6fr 1fr 1.2fr}
}
@media (min-width:900px){
  .nav-links{display:flex}
  .nav .nav-cta{display:inline-flex}
  .burger,.mobile-menu{display:none !important}
  .hero-grid{grid-template-columns:1.25fr .85fr}
  .about-grid{grid-template-columns:1.3fr 1fr}
  .contact-grid{grid-template-columns:1fr 1.1fr}
}

/* ===== Variantes de estilo ===== */
${styleCss(t.style)}
${g.vision ? motifCss() : ''}
${boldCss(g)}
${layoutCss(g)}
${logoCss(g)}

@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
${motifReducedCss()}
${boldReducedCss(g)}
${layoutReducedCss(g)}
  .js .reveal,.js .section .sec-head,.js .section .about-copy,.js .section .about-side,.js .section .hours-grid,.js .section .contact-info,.js .section .form,.js .hero-copy,.js .hero-card{opacity:1 !important;transform:none !important}
}
@media print{.site-header,.wa-float{display:none}.js .reveal{opacity:1;transform:none}}
`;
}

function styleCss(style) {
  switch (style) {
    case 'calido':
      return `/* cálido: formas blandas, serif cálida, pills, fondos tintados */
h1,h2,h3{font-weight:700;letter-spacing:-.01em}
.btn{border-radius:999px}
.card,.quote,.form,.hero-card,.check-list,.hours-list{box-shadow:0 12px 30px color-mix(in srgb,var(--primary) 10%,transparent)}
.hero{background:linear-gradient(180deg,var(--tint),var(--bg))}
.hero-grid{grid-template-columns:1fr}
.hero-card{transform:rotate(-1.2deg)}
.hero-card-title::after{content:"";display:block;width:3rem;height:.25rem;border-radius:9px;background:var(--accent);margin-top:.6rem}
.eyebrow{background:var(--tint);padding:.3rem .8rem;border-radius:999px;letter-spacing:.06em;text-transform:none;font-size:.9rem}
.card-ico,.benefit-ico,.brand-mark{border-radius:50%}
@media (min-width:900px){.hero-grid{grid-template-columns:1.25fr .85fr}}`;
    case 'elegante':
      return `/* elegante: serif display, líneas finas, mayúsculas espaciadas, ángulos casi rectos */
h1,h2{font-weight:500;letter-spacing:.005em}
h1{font-size:clamp(2.4rem,1.4rem + 4.6vw,4.6rem);line-height:1.05}
.eyebrow{letter-spacing:.28em;font-size:.74rem;font-weight:600;position:relative;padding-left:3rem}
.eyebrow::before{content:"";position:absolute;left:0;top:50%;width:2.2rem;height:1px;background:currentColor}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.14em;font-size:.8rem;font-weight:600;padding:1rem 1.8rem}
.btn-primary{box-shadow:none}
.card,.quote,.form,.hero-card,.check-list,.hours-list,.faq-item,.tile figure{box-shadow:none;border-radius:2px}
.card:hover{box-shadow:none;transform:none;border-color:var(--primary)}
.card-ico,.benefit-ico,.brand-mark,.avatar{border-radius:50%}
.card-ico{background:transparent;border:1px solid var(--primary);color:var(--primary-ink)}
.hero{text-align:center}
.hero-grid{grid-template-columns:1fr;justify-items:center}
.hero-copy{max-width:50rem}
.hero-copy .lead{margin-inline:auto}
.hero-actions,.hero-badges{justify-content:center}
.hero-card{width:min(100%,32rem);text-align:left}
.sec-head{margin-inline:auto;text-align:center}
.sec-head .lead{margin-inline:auto}
.sec-head .eyebrow{padding-left:0}
.sec-head .eyebrow::before{display:none}
.brand{letter-spacing:.14em;text-transform:uppercase;font-size:1rem;font-weight:600}
.brand-mark{background:transparent;border:1px solid var(--primary);color:var(--primary-ink)}
.nav-links a{border-radius:0;text-transform:uppercase;letter-spacing:.12em;font-size:.76rem}
.hero-bg .b1,.hero-bg .b2,.hero-bg .b3{opacity:.07}
.sec-cta{text-align:center}
@media (min-width:900px){.hero-grid{grid-template-columns:1fr}}`;
    case 'vibrante':
      return `/* vibrante: color pleno, sombras duras, formas redondeadas grandes */
h1,h2,h3{font-weight:800}
h1{letter-spacing:-.03em}
.btn{border-width:2px;border-color:var(--text);box-shadow:4px 4px 0 var(--text);border-radius:var(--radius)}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--text)}
.btn-ghost{background:var(--bg);color:var(--text);border-color:var(--text)}
.btn-wa{border-color:var(--text)}
.hero{background:linear-gradient(135deg,var(--primary) 0%,var(--secondary) 100%);color:var(--on-primary)}
.hero h1,.hero .lead,.hero .eyebrow,.hero .hero-badges{color:var(--on-primary)}
.hero .hero-badges .ico{color:var(--accent)}
.hero .eyebrow{background:var(--accent);color:var(--on-accent);padding:.3rem .8rem;border-radius:999px}
.hero .btn-primary{background:var(--accent);color:var(--on-accent)}
.hero .btn-primary:hover{background:var(--accent)}
.hero-bg .b1{fill:#fff;opacity:.1}.hero-bg .b2{fill:var(--accent);opacity:.35}.hero-bg .b3{fill:#fff;opacity:.12}
.hero-card{border:2px solid var(--text);box-shadow:8px 8px 0 var(--text);transform:rotate(1.5deg)}
.card,.quote,.form,.faq-item,.check-list,.hours-list,.tile figure{border:2px solid var(--text);box-shadow:5px 5px 0 var(--text)}
.card:hover{transform:translate(-3px,-3px);box-shadow:8px 8px 0 var(--text);border-color:var(--text)}
.card-ico{background:var(--accent);color:var(--on-accent);border:2px solid var(--text)}
.benefit-ico{border:2px solid var(--text);background:var(--accent);color:var(--on-accent)}
.eyebrow{background:var(--accent);color:var(--on-accent);padding:.25rem .8rem;border-radius:999px;letter-spacing:.08em}
main>.section:not(.hero):nth-of-type(even){background:color-mix(in srgb,var(--accent) 16%,var(--bg))}
.s-contact{background:color-mix(in srgb,var(--primary) 12%,var(--bg))}
.site-header{border-bottom:2px solid var(--text)}
.price{background:var(--accent);color:var(--on-accent);padding:.2rem .7rem;border-radius:999px;align-self:flex-start;font-size:1rem}`;
    case 'futurista':
      return `/* futurista: vidrio, neón, tipografía gigante, grano y malla de aurora */
:root{--glass:color-mix(in srgb,var(--surface) 60%,transparent);--card-bg:var(--glass);--glow:color-mix(in srgb,var(--accent) 58%,transparent);--glow-p:color-mix(in srgb,var(--primary) 55%,transparent);--edge:linear-gradient(135deg,color-mix(in srgb,var(--primary) 75%,transparent),color-mix(in srgb,var(--text) 9%,transparent) 42%,color-mix(in srgb,var(--accent) 75%,transparent))}
body{background:var(--bg)}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(52vmax 42vmax at 6% 2%,color-mix(in srgb,var(--primary) 22%,transparent),transparent 70%),radial-gradient(46vmax 40vmax at 98% 38%,color-mix(in srgb,var(--secondary) 38%,transparent),transparent 70%),radial-gradient(56vmax 42vmax at 28% 106%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 70%)}
body::after{content:"";position:fixed;inset:0;z-index:80;pointer-events:none;opacity:.06;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
h1,h2,h3{font-weight:700}
h1{font-size:clamp(2.05rem,.7rem + 8.2vw,5.6rem);line-height:.98;letter-spacing:-.045em;font-weight:800;overflow-wrap:anywhere;hyphens:auto}
h2{font-size:clamp(1.85rem,1rem + 3.8vw,3.5rem);letter-spacing:-.035em;line-height:1.02}
h1 .w{display:inline-block;margin-right:.18em}
h1 .w:nth-child(3n+2){font-weight:300;letter-spacing:-.03em}
.hero h1{background:linear-gradient(100deg,var(--text) 0%,var(--accent-ink) 40%,var(--primary-ink) 72%,var(--text) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.08em}
.lead{color:color-mix(in srgb,var(--text) 78%,var(--bg))}
.eyebrow{color:var(--accent-ink);letter-spacing:.22em;font-size:.74rem}
.eyebrow::before{content:"";display:inline-block;width:.5rem;height:.5rem;margin-right:.65rem;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent);vertical-align:middle}
.site-header{background:color-mix(in srgb,var(--bg) 55%,transparent);backdrop-filter:blur(18px) saturate(1.6);-webkit-backdrop-filter:blur(18px) saturate(1.6)}
.site-header.scrolled{border-color:color-mix(in srgb,var(--primary) 35%,transparent);box-shadow:0 10px 40px -18px var(--glow-p)}
.brand-mark{background:linear-gradient(135deg,var(--primary),var(--accent));color:#0b0d12;box-shadow:0 0 18px -2px var(--glow)}
.nav-links a:hover,.nav-links a.active{background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary-ink)}
.btn{border-radius:999px;letter-spacing:.01em}
.btn-primary{background:linear-gradient(120deg,var(--primary),var(--accent));color:#0b0d12;box-shadow:0 0 0 1px color-mix(in srgb,var(--primary) 55%,transparent),0 10px 34px -8px var(--glow)}
.btn-primary:hover{background:linear-gradient(120deg,var(--primary),var(--accent));filter:brightness(1.1);box-shadow:0 0 0 1px var(--primary),0 14px 44px -6px var(--glow)}
.btn-ghost{background:var(--glass);color:var(--text);border-color:color-mix(in srgb,var(--text) 26%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.btn-ghost:hover{background:color-mix(in srgb,var(--primary) 16%,var(--glass));border-color:var(--primary)}
.hero{background:none;padding-block:clamp(3.5rem,2rem + 8vw,8rem) clamp(2.5rem,2rem + 4vw,5rem)}
.hero-grid{grid-template-columns:1fr}
.hero-copy{position:relative}
.hero-copy::before{content:"";position:absolute;left:-6%;right:-6%;top:-14%;height:78%;background:radial-gradient(closest-side,color-mix(in srgb,var(--primary) 26%,transparent),transparent);z-index:-1;pointer-events:none;animation:breathe 7s ease-in-out infinite alternate}
@keyframes breathe{from{opacity:.5;transform:scale(.93)}to{opacity:1;transform:scale(1.08)}}
.hero-actions{margin-top:.4rem}
.hero-badges .ico{color:var(--accent-ink);filter:drop-shadow(0 0 6px var(--glow))}
.hero-card,.card,.quote,.form,.check-list,.hours-list,.faq-item,.tile figure{background:linear-gradient(var(--card-bg),var(--card-bg)) padding-box,var(--edge) border-box;border:1px solid transparent;backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);box-shadow:none}
.hero-card-title{color:var(--text)}
.hero-mark span{background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-mark{background:var(--card-bg)}
main>.section:not(.hero):nth-of-type(even){background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--primary) 6%,transparent),transparent)}
.s-contact{background:none}
.sec-head h2::after{content:"";display:block;width:4.5rem;height:3px;margin-top:.9rem;border-radius:9px;background:linear-gradient(90deg,var(--primary),var(--accent));box-shadow:0 0 16px var(--glow)}
.card-ico,.benefit-ico{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 28%,transparent),color-mix(in srgb,var(--accent) 22%,transparent));color:var(--accent-ink);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 45%,transparent),0 0 24px -6px var(--glow)}
.benefit-ico{background:linear-gradient(135deg,var(--primary),var(--accent));color:#0b0d12}
.price{color:var(--accent-ink);text-shadow:0 0 18px var(--glow)}
.check-list .ico{background:linear-gradient(135deg,var(--primary),var(--accent));color:#0b0d12}
.about-mark{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 70%,#000),color-mix(in srgb,var(--secondary) 70%,#000))}
.avatar{background:linear-gradient(135deg,var(--primary),var(--accent));color:#0b0d12}
.quote-ico{color:var(--accent-ink);opacity:.8}
.faq-item[open]{box-shadow:0 0 30px -14px var(--glow)}
.hours-side{background:var(--deep);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 35%,transparent),0 0 40px -18px var(--glow-p)}
.field input,.field textarea{background:color-mix(in srgb,var(--bg) 70%,transparent)}
.field input:focus,.field textarea:focus{box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 24%,transparent)}
.site-footer{background:linear-gradient(180deg,color-mix(in srgb,var(--deep) 70%,#000),color-mix(in srgb,var(--deep) 95%,#000));box-shadow:inset 0 1px 0 color-mix(in srgb,var(--primary) 40%,transparent)}
.wa-float{box-shadow:0 0 0 1px rgba(255,255,255,.2),0 10px 34px -6px rgba(18,140,74,.7)}
.cards{perspective:1100px}
.marquee{position:relative;overflow:hidden;border-block:1px solid color-mix(in srgb,var(--primary) 30%,transparent);background:color-mix(in srgb,var(--bg) 62%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding-block:1.05rem;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.marquee-track{display:flex;width:max-content;animation:marq 36s linear infinite}
.marquee ul{display:flex;flex:none;margin:0;padding:0;list-style:none}
.marquee li{display:flex;align-items:center;white-space:nowrap;font-family:var(--font-h);font-size:clamp(1.1rem,.9rem + 1.2vw,1.8rem);font-weight:600;letter-spacing:-.01em;color:var(--text)}
.marquee li::after{content:"\\2726";margin:0 1.6rem;color:var(--accent);text-shadow:0 0 12px var(--glow)}
.marquee:hover .marquee-track{animation-play-state:paused}
@keyframes marq{to{transform:translate3d(-50%,0,0)}}
@media (hover:hover){
  .js .card.reveal.in{transition:transform .4s cubic-bezier(.2,.7,.2,1),box-shadow .4s}
  .js .card.reveal.in:hover{transform:rotateX(5deg) rotateY(-7deg) translateY(-6px);box-shadow:0 26px 50px -22px var(--glow)}
  .js .card.reveal.in:nth-child(even):hover{transform:rotateX(5deg) rotateY(7deg) translateY(-6px)}
}
@media (min-width:900px){.hero-grid{grid-template-columns:minmax(0,1.55fr) minmax(0,.75fr)}}`;
    default:
      return `/* moderno: limpio, sans geométrica, retícula y degradados sutiles */
h1,h2{font-weight:800;letter-spacing:-.035em}
.hero{background:radial-gradient(60% 80% at 85% 0%,color-mix(in srgb,var(--primary) 16%,transparent),transparent),radial-gradient(40% 60% at 0% 100%,color-mix(in srgb,var(--accent) 14%,transparent),transparent),var(--bg)}
.hero::after{content:"";position:absolute;inset:0;z-index:-1;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(70% 70% at 50% 40%,#000,transparent);-webkit-mask-image:radial-gradient(70% 70% at 50% 40%,#000,transparent);opacity:.55}
.hero h1{background:linear-gradient(120deg,var(--text) 30%,var(--primary-ink));-webkit-background-clip:text;background-clip:text;color:transparent}
.card{background:linear-gradient(180deg,var(--surface),color-mix(in srgb,var(--surface) 92%,var(--primary)))}
.eyebrow{padding:.25rem .7rem;border:1px solid color-mix(in srgb,var(--primary-ink) 35%,transparent);border-radius:999px;font-size:.75rem}
.card-ico{background:linear-gradient(135deg,var(--primary),var(--secondary));color:var(--on-primary)}`;
  }
}

/** Logo del cliente (header) y fotos propias (hero). Solo se emite si hay logo/imagenes: el sitio sin assets queda igual que antes. */
function logoCss(g) {
  const out = [];
  if (g.logo) {
    out.push('/* ===== Logo del cliente ===== */');
    out.push('.brand-logo{display:block;flex:none;height:2.5rem;width:auto;max-width:min(11rem,48vw);object-fit:contain}');
    out.push('@media (max-width:520px){.brand-logo{height:2.1rem}}');
  }
  if (g.images && g.images.length) {
    out.push('/* ===== Fotos del cliente ===== */');
    out.push('.hero-photo{margin:0 0 1.1rem;border-radius:calc(var(--radius-lg) - 4px);overflow:hidden;background:var(--tint)}');
    out.push('.hero-photo img{display:block;width:100%;height:auto;max-height:18rem;object-fit:cover}');
    out.push('.hero-card.has-photo{padding:1rem}');
  }
  return out.join('\n');
}
