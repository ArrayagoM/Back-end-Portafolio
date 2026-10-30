// CSS y JS de los arquetipos de layout. Solo se emite lo que el sitio USA (hero, nav, variantes, formas, divisores),
// así cada sitio carga únicamente su propio CSS. Colores y medidas salen de las variables del tema (AA garantizado
// por los pares texto/fondo ya calculados: --on-primary, --on-accent, --on-deep, --text, --muted…).

const NAV = {
  bar: '',
  pill: `
/* nav: píldora flotante */
.site-header{position:fixed;top:.7rem;left:50%;translate:-50% 0;width:min(calc(100% - 1.2rem),66rem);border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--bg) 80%,transparent);box-shadow:0 14px 40px -18px rgba(0,0,0,.4)}
.site-header .container{width:100%;padding-inline:.9rem 1rem}
.site-header .nav{min-height:3.5rem}
.site-header .mobile-menu{position:absolute;left:0;right:0;top:calc(100% + .5rem);padding:1rem 1.2rem;background:var(--bg);border:1px solid var(--line);border-radius:1.6rem;box-shadow:0 20px 50px -20px rgba(0,0,0,.5)}
.hero{padding-top:calc(clamp(3rem,2rem + 6vw,7rem) + 3.2rem)}
`,
  rail: `
/* nav: riel lateral fijo (escritorio); en celular, barra compacta */
@media (min-width:1000px){
  body{padding-left:5.4rem}
  .site-header{position:fixed;left:0;top:0;bottom:0;right:auto;width:5.4rem;border:0;border-right:1px solid var(--line);background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}
  .site-header .container{width:100%;height:100%;margin:0;padding:0}
  .site-header .nav{height:100%;flex-direction:column;justify-content:space-between;align-items:center;padding:1.2rem 0;gap:1rem}
  .site-header .brand{flex-direction:column;gap:0}
  .site-header .brand>span:not(.brand-mark){display:none}
  .site-header .brand-logo{height:2.6rem;max-width:3.8rem}
  .site-header .nav-links{flex-direction:column;gap:.2rem}
  .site-header .nav-links a{writing-mode:vertical-rl;rotate:180deg;padding:.8rem .45rem;border-radius:999px;font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
  .site-header .nav .nav-cta{writing-mode:vertical-rl;rotate:180deg;padding:1rem .55rem;border-radius:999px;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase}
  .site-header .burger,.site-header .mobile-menu{display:none !important}
  .wa-float{right:1rem}
}
@media (min-width:1000px) and (max-height:860px){.site-header .nav .nav-cta{display:none}.site-header .nav-links a{padding:.55rem .4rem;font-size:.68rem}}
`,
  overlay: `
/* nav: overlay a pantalla completa con menú gigante */
.site-header{position:fixed;left:0;right:0;top:0;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;border-bottom:0}
.site-header.scrolled{background:color-mix(in srgb,var(--bg) 90%,transparent);box-shadow:0 6px 24px rgba(0,0,0,.08)}
.site-header .nav-links,.site-header .nav .nav-cta{display:none !important}
.site-header .burger{display:inline-grid !important;position:relative;z-index:130;border-radius:999px}
.site-header .mobile-menu{display:none !important;position:fixed;inset:0;z-index:120;background:var(--deep);color:var(--on-deep);padding:6rem clamp(1.2rem,6vw,5rem) 2.5rem;overflow:auto;border:0}
.site-header .mobile-menu.open{display:flex !important;flex-direction:column;justify-content:center}
.site-header .mobile-menu ul{margin:0 0 2rem}
.site-header .mobile-menu a:not(.btn){font-family:var(--font-h);font-size:clamp(2.4rem,9vw,6.4rem);font-weight:800;letter-spacing:-.045em;line-height:1.02;color:var(--on-deep);border:0;padding:.12em 0;transition:translate .3s}
.site-header .mobile-menu a:not(.btn):hover,.site-header .mobile-menu a:not(.btn):focus-visible{translate:1rem 0}
.hero{padding-top:calc(clamp(3rem,2rem + 6vw,7rem) + 3rem)}
`,
};

const GRID = { even: '1fr 1fr', left: '7fr 5fr', right: '5fr 7fr', golden: '8fr 5fr' };

const SHAPES = {
  round: '',
  notch: `
/* formas: cortes en las esquinas */
.card,.quote,.form,.hero-card,.check-list,.faq-item,.hours-list,.tile figure,.hb-t,.svc-card,.hs-card,.c-card,.stage-sats li,.story-step,.pz-b{border-radius:0 !important;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))}
.btn{border-radius:0 !important;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
.btn:focus-visible,.card:focus-within{clip-path:none}
.field input,.field textarea{border-radius:0}
`,
  blob: `
/* formas: orgánicas */
.card,.quote,.form,.hero-card,.check-list,.hours-list,.tile figure,.hb-t,.svc-card,.hs-card,.c-card,.story-step{border-radius:2.2rem 3rem 1.8rem 2.7rem}
.card:nth-child(even),.hb-t:nth-child(even),.svc-card:nth-child(even),.hs-card:nth-child(even){border-radius:3rem 1.8rem 2.7rem 2.2rem}
.faq-item,.svc-item{border-radius:1.6rem}
.btn{border-radius:999px}
`,
  brutal: `
/* formas: brutalistas, rectas con sombra dura */
.card,.quote,.form,.hero-card,.check-list,.faq-item,.hours-list,.tile figure,.hb-t,.svc-card,.hs-card,.c-card,.stage-sats li,.story-step,.h-ticket{border-radius:0 !important;border:3px solid var(--text) !important;box-shadow:6px 6px 0 var(--text) !important}
.btn{border-radius:0 !important;border:3px solid var(--text);box-shadow:4px 4px 0 var(--text);text-transform:uppercase;letter-spacing:.06em}
.btn:hover{translate:-2px -2px;box-shadow:6px 6px 0 var(--text)}
.field input,.field textarea{border-radius:0;border-width:3px}
.eyebrow{border-radius:0 !important}
`,
};

function wavePoints(n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) pts.push(`${(i * 100) / n}% calc(var(--sl) * ${(0.5 + 0.5 * Math.sin(i * 0.9)).toFixed(2)})`);
  return pts.join(',');
}
const DIVIDERS = {
  none: '',
  diagonal: `
/* divisores: diagonales */
:root{--sl:2.8vw}
main>.section:not(.hero){clip-path:polygon(0 var(--sl),100% 0,100% calc(100% - var(--sl)),0 100%);margin-top:calc(var(--sl) * -.5);padding-block:calc(var(--space) + var(--sl))}
main>.section:not(.hero):nth-of-type(even){clip-path:polygon(0 0,100% var(--sl),100% 100%,0 calc(100% - var(--sl)))}
.site-footer{margin-top:calc(var(--sl) * -.5)}
`,
  waves: `
/* divisores: ondas */
:root{--sl:2.6vw}
main>.section:not(.hero){clip-path:polygon(${wavePoints()},100% 100%,0 100%);margin-top:calc(var(--sl) * -1);padding-top:calc(var(--space) + var(--sl))}
.site-footer{clip-path:polygon(${wavePoints()},100% 100%,0 100%);margin-top:calc(var(--sl) * -1);padding-top:calc(clamp(2.5rem,5vw,4rem) + var(--sl))}
`,
  teeth: `
/* divisores: dientes de papel recortado */
:root{--cut:clamp(12px,2.2vw,26px)}
main>.section:not(.hero),.site-footer{clip-path:polygon(0 var(--cut),6% 0,13% var(--cut),21% 3px,30% var(--cut),39% 0,48% var(--cut),57% 3px,66% var(--cut),75% 0,84% var(--cut),92% 3px,100% var(--cut),100% 100%,0 100%);margin-top:calc(var(--cut) * -1)}
main>.section:not(.hero){padding-top:calc(var(--space) + var(--cut));background:var(--bg)}
main>.section:not(.hero):nth-of-type(even){background:var(--tint)}
.site-footer{padding-top:calc(clamp(2.5rem,5vw,4rem) + var(--cut))}
`,
};

const INVERT = `
.inv{background:var(--deep) !important;color:var(--on-deep);--text:var(--on-deep);--muted:color-mix(in srgb,var(--on-deep) 88%,transparent);--surface-muted:color-mix(in srgb,var(--on-deep) 88%,transparent);--surface:color-mix(in srgb,var(--on-deep) 9%,transparent);--line:color-mix(in srgb,var(--on-deep) 26%,transparent);--primary-ink:var(--on-deep);--accent-ink:var(--on-deep);--tint:color-mix(in srgb,var(--on-deep) 8%,transparent)}
.inv .benefit-ico,.inv .avatar,.inv .b-core{background:var(--on-deep);color:var(--deep)}
.inv .btn-ghost{color:var(--on-deep);border-color:color-mix(in srgb,var(--on-deep) 55%,transparent)}
.inv .eyebrow{color:var(--on-deep)}
`;

const HERO_COMMON = `.hero-info li,.poster-info li,.story-info li,.hb-info li,.ed-facts li,.stage-sats li{display:flex;gap:.7rem;align-items:flex-start}
.poster-info strong,.story-info strong,.hb-info strong,.ed-facts strong,.hero-info strong{display:block;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase}
`;

const HERO = {
  typo: `
/* hero: tipográfico gigante a ancho completo */
.hero-typo{padding-block:clamp(4.5rem,3rem + 6vw,9rem) clamp(2rem,3vw,4rem)}
.hero-typo h1{font-size:clamp(2.3rem,.6rem + 8.4vw,10.5rem);line-height:.88;letter-spacing:-.065em;text-transform:uppercase;margin:0 0 .18em -.04em;hyphens:auto;overflow-wrap:anywhere}
.typo-row{display:grid;gap:1.4rem;align-items:end;border-top:2px solid currentColor;padding-top:1.4rem}
.hero-typo .lead{margin:0;max-width:34rem}
@media (min-width:900px){.typo-row{grid-template-columns:minmax(0,1.2fr) auto}}
`,
  stage: `
/* hero: escenario centrado con elementos orbitando */
.hero-stage{text-align:center;padding-block:clamp(4.5rem,3rem + 6vw,8rem)}
.stage{position:relative;display:grid;place-items:center;min-height:clamp(24rem,56vw,38rem)}
.stage-core{position:relative;z-index:2;max-width:46rem;margin-inline:auto}
.stage .lead{margin-inline:auto}
.stage .ring{position:absolute;left:50%;top:50%;translate:-50% -50%;aspect-ratio:1;border-radius:50%;border:1px solid color-mix(in srgb,var(--primary) 42%,transparent);pointer-events:none;animation:ringspin 70s linear infinite}
.stage .ring.r1{width:min(34rem,92vw)}
.stage .ring.r2{width:min(56rem,150vw);border-style:dashed;animation-direction:reverse;animation-duration:110s}
.stage .ring::after{content:"";position:absolute;top:-6px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}
@keyframes ringspin{to{rotate:360deg}}
.stage-sats,.stage-badges,.hero-stage .hero-actions{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:.7rem}
.stage-sats{margin:2rem 0 0;padding:0;position:relative;z-index:2}
.stage-sats li{display:flex;gap:.6rem;align-items:center;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:.55rem 1.1rem;box-shadow:var(--shadow);font-size:.9rem;color:var(--surface-muted)}
.stage-sats strong{display:block;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text)}
@keyframes sat{from{translate:0 0}to{translate:0 -.9rem}}
@media (min-width:1000px){
  .stage-sats{position:absolute;inset:0;margin:0;display:block;pointer-events:none}
  .stage-sats li{position:absolute;pointer-events:auto;animation:sat 6s ease-in-out infinite alternate}
  .stage-sats li:nth-child(1){left:0;top:12%}
  .stage-sats li:nth-child(2){right:0;top:26%;animation-delay:-2s}
  .stage-sats li:nth-child(3){left:7%;bottom:4%;animation-delay:-4s}
}
`,
  editorial: `
/* hero: editorial asimétrico con letra enorme y texto vertical */
.hero-editorial{padding-block:clamp(3.5rem,2rem + 5vw,6.5rem)}
.ed{display:grid;gap:1.2rem;position:relative}
.ed-letter{position:absolute;right:-2%;top:-8%;z-index:-1;font-family:var(--font-h);font-weight:800;font-size:clamp(11rem,36vw,32rem);line-height:.8;color:transparent;-webkit-text-stroke:2px color-mix(in srgb,var(--text) 15%,transparent);pointer-events:none;user-select:none}
.ed-vert{margin:0}
.ed h1{font-size:clamp(2.5rem,1rem + 7.4vw,7.6rem);line-height:.92;letter-spacing:-.05em;font-weight:500}
.ed-facts{list-style:none;margin:0;padding:1.2rem 0 0;border-top:1px solid var(--line);display:grid;gap:.9rem}
.ed-facts li,.poster-info li,.story-info li,.hb-info li{display:flex;gap:.7rem;align-items:flex-start}
.ed-facts strong,.poster-info strong,.story-info strong,.hb-info strong{display:block;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase}
@media (min-width:900px){
  .ed{grid-template-columns:3rem repeat(11,minmax(0,1fr));gap:0 1.3rem}
  .ed-vert{grid-column:1;grid-row:1 / span 3;writing-mode:vertical-rl;rotate:180deg;letter-spacing:.3em;justify-self:start;align-self:start}
  .ed-main{grid-column:2 / span 9;grid-row:1}
  .ed-side{grid-column:7 / span 6;grid-row:2;margin-top:-1.2rem;padding:1.6rem;background:var(--surface);border:1px solid var(--line);border-left:6px solid var(--primary);position:relative}
  .ed-side .lead{margin-bottom:1.2rem}
  .ed-facts{grid-column:2 / span 5;grid-row:2;align-self:end;border-top:0;padding-top:0}
  .hero-editorial .hero-badges,.hero-editorial .hero-photo{grid-column:2 / span 10;margin-top:2rem}
}
`,
  bento: `
/* hero: bento (grilla de teselas) */
.hero-bento{padding-block:clamp(4.5rem,3rem + 4vw,7rem) 2rem}
.hb{display:grid;gap:.9rem;grid-template-columns:repeat(2,minmax(0,1fr))}
.hb-t{min-width:0;padding:1.3rem;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--line);color:var(--surface-muted)}
.hb-title{grid-column:1 / -1;background:var(--tint);color:var(--text)}
.hb-title h1{font-size:clamp(2.1rem,1rem + 5vw,4.6rem);line-height:.98;letter-spacing:-.04em;margin-bottom:.4em}
.hb-cta{grid-column:1 / -1;background:var(--primary);color:var(--on-primary);display:grid;align-content:center}
.hb-cta .btn-primary{background:var(--on-primary);color:var(--primary)}
.hb-cta .btn-ghost{color:var(--on-primary);border-color:color-mix(in srgb,var(--on-primary) 55%,transparent)}
.hb-cta .btn-ghost:hover{background:color-mix(in srgb,var(--on-primary) 14%,transparent)}
.hb-metric{background:var(--accent);color:var(--on-accent);display:grid;align-content:space-between}
.hb-metric strong{font-family:var(--font-h);font-size:clamp(3rem,9vw,6.4rem);line-height:.9;letter-spacing:-.05em}
.hb-metric span{font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:.78rem}
.hb-info ul,.hb-list{list-style:none;margin:0;padding:0;display:grid;gap:.8rem}
.hb-info strong{display:block;color:var(--text)}
.hb-badges .hb-list li{display:flex;gap:.5rem}
.hb-mark{display:grid;place-items:center;background:var(--deep);color:var(--on-deep)}
.hb-mark .ico{width:4.2rem;height:4.2rem}
.hb-photo{padding:0;overflow:hidden}
.hb-photo .hero-photo{margin:0;border-radius:0;height:100%}
@media (min-width:900px){
  .hb{grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:minmax(9rem,auto)}
  .hb-title{grid-column:1 / 5;grid-row:1 / 3;padding:2rem}
  .hb-metric{grid-column:5 / 7;grid-row:1}
  .hb-cta{grid-column:5 / 7;grid-row:2}
  .hb-info{grid-column:1 / 3;grid-row:3}
  .hb-badges{grid-column:3 / 5;grid-row:3}
  .hb-mark{grid-column:5 / 7;grid-row:3}
  .hb-photo{grid-column:1 / 7;grid-row:4;max-height:16rem}
}
`,
  poster: `
/* hero: póster apilado con bloques rotados y solapados */
.hero-poster{padding-block:clamp(4.5rem,3rem + 4vw,7rem);overflow:hidden}
.poster{display:grid;position:relative}
.pz{padding:1.2rem 1.6rem;position:relative}
.pz-a{background:var(--primary);color:var(--on-primary);rotate:-2.4deg;box-shadow:9px 9px 0 var(--text)}
.pz-a h1,.pz-a .eyebrow{color:var(--on-primary)}
.pz-a h1{font-size:clamp(2.3rem,1rem + 6.6vw,6.4rem);line-height:.95;text-transform:uppercase;margin:0;hyphens:auto;overflow-wrap:anywhere}
.pz-a .w,.pz-a .ch{background:none !important;-webkit-text-fill-color:currentColor !important;color:inherit !important}
.pz-b{background:var(--surface);border:2px solid var(--text);rotate:1.4deg;margin:-.5rem 0 0 6%;max-width:32rem;z-index:1;color:var(--text)}
.pz-b .lead{margin:0;color:var(--text)}
.pz-c{background:var(--accent);color:var(--on-accent);border:2px solid var(--text);rotate:-1deg;margin:-.3rem 0 0 -1%;width:max-content;max-width:100%;z-index:2}
.pz-c .btn-primary{background:var(--text);color:var(--bg)}
.pz-c .btn-ghost{color:var(--on-accent);border-color:currentColor;background:transparent}
.sticker{position:absolute;right:3%;top:-1.2rem;z-index:3;width:6.8rem;height:6.8rem;border-radius:50%;background:var(--deep);color:var(--on-deep);display:grid;place-items:center;text-align:center;padding:.4rem;font-weight:800;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;rotate:12deg;box-shadow:4px 4px 0 var(--text)}
.poster-info{list-style:none;display:flex;flex-wrap:wrap;gap:.8rem 1.8rem;margin:2rem 0 0;padding:0}
@media (max-width:520px){.sticker{width:5rem;height:5rem;font-size:.55rem}}
`,
  terminal: `
/* hero: terminal / línea de comandos */
.hero-terminal{padding-block:clamp(4.5rem,3rem + 4vw,7rem)}
.term{max-width:62rem;margin-inline:auto;border-radius:var(--radius);overflow:hidden;background:var(--deep);color:var(--on-deep);border:1px solid color-mix(in srgb,var(--on-deep) 28%,transparent);box-shadow:0 30px 80px -34px rgba(0,0,0,.65);font-family:ui-monospace,"Cascadia Mono","SF Mono",Consolas,"Liberation Mono",monospace}
.term-bar{display:flex;align-items:center;gap:.45rem;padding:.7rem 1rem;background:color-mix(in srgb,var(--on-deep) 12%,transparent);font-size:.8rem}
.term-bar i{width:.7rem;height:.7rem;border-radius:50%;background:#ff5f57}
.term-bar i:nth-child(2){background:#febc2e}
.term-bar i:nth-child(3){background:#28c840}
.term-bar span{margin-left:.7rem}
.term-body{display:grid;gap:1rem;padding:clamp(1.2rem,3vw,2.6rem)}
.term .prompt{color:var(--accent);font-weight:700}
.term-line{margin:0;font-size:.9rem}
.term h1,.term .eyebrow,.term .lead{color:var(--on-deep)}
.term h1{font-family:inherit;font-size:clamp(1.7rem,.8rem + 4.4vw,3.9rem);line-height:1.05;letter-spacing:-.03em;margin:0;background:none !important;-webkit-text-fill-color:currentColor !important}
.term h1 .w,.term h1 .ch{background:none !important;-webkit-text-fill-color:currentColor !important;color:inherit !important}
.term .eyebrow{margin:0;font-size:.74rem}
.term .eyebrow::before{content:"# "}
.term-out .lead{margin:0;max-width:44rem}
.term-kv{list-style:none;margin:0;padding:0;display:grid;gap:.3rem;font-size:.92rem}
.term-kv li{display:flex;flex-wrap:wrap;gap:.2rem 1.2rem}
.term-kv .k{min-width:9rem;font-weight:700}
.term-kv .k::after{content:":"}
.term .caret{display:inline-block;width:.6em;height:1.1em;background:var(--on-deep);vertical-align:text-bottom;animation:blink 1s steps(2,start) infinite}
@keyframes blink{to{visibility:hidden}}
.term .btn-ghost{color:var(--on-deep);border-color:color-mix(in srgb,var(--on-deep) 55%,transparent)}
.term .btn-ghost:hover{background:color-mix(in srgb,var(--on-deep) 14%,transparent)}
.term .hero-badges{color:var(--on-deep)}
.term .hero-badges .ico{color:var(--accent)}
`,
  story: `
/* hero: historia con scroll pinneado (sticky) */
.hero-story{padding:0;overflow:visible;overflow-x:clip}
.story-pin{position:sticky;top:0;min-height:100svh;display:grid;align-content:center;padding-top:4rem}
.story h1{font-size:clamp(2.5rem,1rem + 9vw,8.6rem);line-height:.92;letter-spacing:-.05em}
.story-hint{display:block;margin-top:2.2rem;width:2rem;animation:hint 1.6s ease-in-out infinite}
.story-hint .ico{width:2rem;height:2rem}
@keyframes hint{50%{translate:0 .6rem}}
.story-steps{position:relative;z-index:2;margin-top:-30vh;padding-bottom:12vh}
.story-step{max-width:34rem;margin:0 0 42vh;padding:1.6rem;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow);color:var(--surface-muted)}
.story-step:nth-child(even){margin-left:auto}
.story-step:last-child{margin-bottom:0}
.story-step .lead{color:var(--surface-muted)}
.story-info{list-style:none;margin:0;padding:0;display:grid;gap:1rem}
.story-info strong{color:var(--text)}
.story .hero-badges.big{display:grid;gap:.8rem;font-size:1.1rem}
`,
};

const SECTION = {
  'services.list': `
.svc-list{list-style:none;margin:0;padding:0;border-top:2px solid var(--text)}
.svc-row{display:grid;grid-template-columns:2.4rem 1fr;gap:.3rem 1rem;align-items:center;padding:1.3rem .4rem;border-bottom:1px solid var(--line);transition:background-color .3s,padding .3s}
.svc-row:hover,.svc-row:focus-within{background:var(--tint);padding-left:1.2rem}
.svc-n{font-family:var(--font-h);font-weight:800;color:var(--primary-ink)}
.svc-t h3{margin:0;font-size:clamp(1.3rem,1rem + 1.8vw,2.5rem)}
.svc-t p{margin:.3rem 0 0;color:var(--muted)}
.svc-row .price{grid-column:2;margin:0;padding:0}
.svc-row .svc-ico{display:none}
@media (min-width:700px){
  .svc-row{grid-template-columns:3.4rem 1fr auto 3.6rem}
  .svc-row .price{grid-column:auto}
  .svc-row .svc-ico{display:grid;place-items:center;width:3.4rem;height:3.4rem;border-radius:50%;background:var(--primary);color:var(--on-primary);opacity:0;scale:.6;transition:opacity .3s,scale .3s}
  .svc-row:hover .svc-ico,.svc-row:focus-within .svc-ico{opacity:1;scale:1}
}
@media (hover:none) and (min-width:700px){.svc-row .svc-ico{opacity:1;scale:1}}
.svc-ico .ico{width:1.6rem;height:1.6rem}
`,
  'services.stack': `
.svc-stack{list-style:none;margin:0;padding:0;display:grid;gap:1.2rem}
.svc-card{position:sticky;top:calc(5.2rem + var(--i) * .9rem);min-height:12rem;padding:1.8rem;border-radius:var(--radius-lg);display:grid;gap:.5rem;align-content:start;border:1px solid var(--line);box-shadow:0 -12px 30px -14px rgba(0,0,0,.3);background:var(--surface);color:var(--text)}
.svc-card:nth-child(4n+1){background:var(--primary);color:var(--on-primary)}
.svc-card:nth-child(4n+2){background:var(--accent);color:var(--on-accent)}
.svc-card:nth-child(4n+3){background:var(--deep);color:var(--on-deep)}
.svc-card h3,.svc-card p,.svc-card .price{color:inherit;margin:0;background:none;padding:0}
.svc-card h3{font-size:clamp(1.6rem,1rem + 2.6vw,3.1rem)}
.svc-card p{max-width:36rem}
.svc-card .svc-n{position:absolute;right:1.4rem;top:.6rem;font-family:var(--font-h);font-weight:800;font-size:clamp(3rem,9vw,6.4rem);line-height:1;opacity:.28;color:inherit}
.svc-card .svc-ico .ico{width:2.2rem;height:2.2rem}
`,
  'services.hscroll': `
.hs-pin{overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:1rem}
.hs-track{list-style:none;margin:0;padding:0;display:flex;gap:1rem;width:max-content}
.hs-card{position:relative;flex:none;width:min(78vw,22rem);min-height:17rem;scroll-snap-align:start;padding:1.5rem;border-radius:var(--radius-lg);background:var(--surface);color:var(--text);border:1px solid var(--line);display:grid;gap:.5rem;align-content:start}
.hs-card:nth-child(3n+1){background:var(--primary);color:var(--on-primary)}
.hs-card:nth-child(3n+2){background:var(--accent);color:var(--on-accent)}
.hs-card:nth-child(3n){background:var(--deep);color:var(--on-deep)}
.hs-card h3,.hs-card p,.hs-card .price{color:inherit;margin:0;background:none;padding:0}
.hs-card h3{font-size:clamp(1.5rem,1rem + 1.8vw,2.4rem)}
.hs-card .svc-n{font-family:var(--font-h);font-weight:800;font-size:3rem;line-height:1;opacity:.3;color:inherit}
.hs-card .svc-ico .ico{width:2rem;height:2rem}
.hs-on .hs-wrap{height:var(--hs-h)}
.hs-on .hs-pin{position:sticky;top:4.6rem;height:calc(100svh - 4.6rem);overflow:hidden;display:flex;align-items:center}
.hs-on .hs-track{translate:var(--hx,0) 0;will-change:transform}
`,
  'services.accordion': `
.svc-acc{border-top:2px solid var(--text)}
.svc-item{border-bottom:1px solid var(--line)}
.svc-item summary{display:grid;grid-template-columns:2.4rem 1fr auto 1.4rem;gap:.8rem;align-items:center;padding:1.2rem .2rem;cursor:pointer;list-style:none;font-family:var(--font-h);font-weight:700;font-size:clamp(1.2rem,1rem + 1.8vw,2.3rem)}
.svc-item summary::-webkit-details-marker{display:none}
.svc-item .svc-n{font-size:.95rem}
.svc-item .price{margin:0;padding:0;font-size:1rem}
.svc-item[open] summary{color:var(--primary-ink)}
.svc-item[open] .faq-chev{rotate:180deg}
.svc-body{padding:0 0 1.4rem 3.2rem;color:var(--muted);max-width:44rem}
.svc-body p{margin:0}
`,
  'benefits.radial': `
.b-radial{display:grid;gap:1rem}
.b-radial ul{list-style:none;margin:0;padding:0;display:grid;gap:1.4rem}
.b-core{display:none}
.b-pos{display:block}
.b-pos h3{margin:.6rem 0 .2rem}
.b-pos p{margin:0;color:var(--muted)}
@media (min-width:900px){
  .b-radial{--r:16rem;display:block;position:relative;height:calc(var(--r) * 2 + 10rem)}
  .b-core{display:grid;place-items:center;position:absolute;left:50%;top:50%;width:9rem;height:9rem;translate:-50% -50%;border-radius:50%;background:var(--primary);color:var(--on-primary);font-family:var(--font-h);font-weight:800;font-size:4rem;box-shadow:0 0 0 14px color-mix(in srgb,var(--primary) 18%,transparent)}
  .b-radial ul{display:block;position:absolute;inset:0}
  .b-radial li{position:absolute;left:50%;top:50%;width:13rem;margin:-3.4rem 0 0 -6.5rem;--ang:calc(var(--i) * 360deg / var(--n) - 90deg);transform:rotate(var(--ang)) translateX(var(--r)) rotate(calc(var(--ang) * -1));text-align:center}
  .b-pos .benefit-ico{margin-inline:auto}
}
`,
  'benefits.columns': `
.b-cols{list-style:none;margin:0;padding:0;display:grid}
.b-cols li{display:grid;grid-template-columns:4rem 1fr;gap:1rem;padding:1.4rem 0;border-top:1px solid var(--line)}
.b-num{font-family:var(--font-h);font-weight:800;font-size:clamp(2.4rem,5vw,4rem);line-height:1;color:transparent;-webkit-text-stroke:1.5px var(--primary-ink)}
.b-cols h3{font-size:clamp(1.2rem,1rem + 1vw,1.8rem);margin:0 0 .3rem}
.b-cols p{margin:0;color:var(--muted)}
@media (min-width:760px){
  .b-cols{grid-template-columns:1fr 1fr}
  .b-cols li:nth-child(odd){padding-right:2rem;border-right:1px solid var(--line)}
  .b-cols li:nth-child(even){padding-left:2rem}
}
`,
  'benefits.strip': `
.b-strip{list-style:none;margin:0;padding:0 0 .8rem;display:flex;gap:2rem;overflow-x:auto;scroll-snap-type:x proximity}
.b-strip li{flex:none;width:min(14rem,62vw);scroll-snap-align:start;text-align:center}
.b-big{display:grid;place-items:center;width:7rem;height:7rem;margin:0 auto 1rem;border-radius:50%;background:var(--tint);color:var(--primary-ink);border:2px solid var(--primary)}
.b-big .ico{width:3.2rem;height:3.2rem}
.b-strip h3{margin:0 0 .3rem}
.b-strip p{margin:0;color:var(--muted)}
@media (min-width:900px){.b-strip{overflow:visible;justify-content:space-between}.b-strip li{flex:1 1 0;width:auto}}
`,
  'testimonials.quote': `
.t-slides{list-style:none;margin:0;padding:0 0 .6rem;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:2rem}
.t-slide{flex:none;width:100%;scroll-snap-align:center}
.t-slide figure{position:relative;display:grid;gap:1.4rem;max-width:56rem;margin:0 auto}
.t-slide .quote-ico{width:4rem;height:4rem;color:var(--primary-ink)}
.t-slide blockquote{margin:0;font-family:var(--font-h);font-size:clamp(1.6rem,1rem + 3.2vw,3.6rem);line-height:1.15;letter-spacing:-.02em;color:var(--text)}
.t-slide blockquote p{margin:0}
.t-slide figcaption{display:flex;align-items:center;gap:.8rem}
.t-count{position:absolute;right:0;top:0;font-size:.8rem;color:var(--muted)}
`,
  'testimonials.masonry': `
.t-masonry{list-style:none;margin:0;padding:0;columns:1;column-gap:1.2rem}
.t-masonry li{break-inside:avoid;margin-bottom:1.2rem}
.t-masonry .quote{height:auto}
.t-masonry li:nth-child(3n+1) blockquote{font-size:clamp(1.3rem,1rem + 1.4vw,2rem);font-family:var(--font-h)}
@media (min-width:700px){.t-masonry{columns:2}}
@media (min-width:1000px){.t-masonry{columns:3}}
`,
  'testimonials.ribbon': `
.t-ribbon{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.t-track{display:flex;width:max-content;animation:tmarq 55s linear infinite}
.t-ribbon:hover .t-track{animation-play-state:paused}
.t-ribbon ul{display:flex;gap:1.2rem;list-style:none;margin:0;padding:0 1.2rem 0 0}
.t-ribbon li{flex:none;width:min(80vw,24rem)}
.t-ribbon .quote{height:100%}
@keyframes tmarq{to{transform:translate3d(-50%,0,0)}}
`,
  'hours.ticket': `
.h-ticket{display:grid;max-width:56rem;margin-inline:auto;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--line);background:var(--surface);color:var(--text)}
.h-stub{display:flex;align-items:center;gap:1rem;padding:1.4rem;background:var(--primary);color:var(--on-primary);font-family:var(--font-h);font-weight:800;font-size:1.3rem}
.h-main{position:relative;padding:1.6rem;border-top:3px dashed var(--line)}
.h-main::before,.h-main::after{content:"";position:absolute;top:-.85rem;width:1.7rem;height:1.7rem;border-radius:50%;background:var(--bg)}
.h-main::before{left:-.85rem}
.h-main::after{right:-.85rem}
.h-kicker{margin:0 0 .6rem;font-size:.74rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
@media (min-width:700px){
  .h-ticket{grid-template-columns:11rem 1fr}
  .h-stub{flex-direction:column;justify-content:center;text-align:center}
  .h-main{border-top:0;border-left:3px dashed var(--line)}
  .h-main::before{left:-.85rem;top:-.85rem}
  .h-main::after{left:-.85rem;right:auto;top:auto;bottom:-.85rem}
}
`,
  'hours.clock': `
.h-clock-wrap{display:grid;gap:2rem;align-items:center}
.h-clock{width:100%;max-width:17rem;margin-inline:auto}
.h-clock .face{fill:var(--surface);stroke:var(--text);stroke-width:5}
.h-clock .tick{stroke:var(--text);stroke-width:3}
.h-clock .hand{stroke:var(--primary);stroke-width:6;stroke-linecap:round}
.h-clock .hand.m{stroke:var(--text);stroke-width:4;transform-origin:100px 100px;animation:clockspin 30s linear infinite}
.h-clock .pivot{fill:var(--accent)}
@keyframes clockspin{to{transform:rotate(360deg)}}
@media (min-width:800px){.h-clock-wrap{grid-template-columns:minmax(0,18rem) 1fr;gap:3.5rem}}
`,
  'hours.table': `
.h-table{display:grid;gap:1.6rem}
.h-table .h-row{padding:1.2rem 0;border-bottom:2px solid var(--text)}
.h-table .h-row dt{font-family:var(--font-h);font-size:clamp(1.5rem,1rem + 2.4vw,3rem);font-weight:800;text-transform:uppercase;letter-spacing:-.02em}
.h-table .h-row dd{font-size:clamp(1.1rem,1rem + .8vw,1.6rem)}
@media (min-width:900px){.h-table{grid-template-columns:var(--cols);align-items:start}}
`,
  'faq.columns': `
.faq-cols{display:grid;gap:2rem 3.5rem}
.faq-cols article{border-top:2px solid var(--text);padding-top:1rem}
.faq-cols h3{display:flex;gap:.8rem;font-size:clamp(1.15rem,1rem + 1vw,1.7rem);margin:0 0 .6rem}
.faq-cols h3 span{color:var(--primary-ink);font-weight:800}
.faq-cols p{margin:0;color:var(--muted)}
@media (min-width:800px){.faq-cols{grid-template-columns:1fr 1fr}}
`,
  'faq.chat': `
.faq-chat{display:grid;gap:1.6rem;max-width:46rem;margin-inline:auto}
.turn{display:grid;gap:.6rem}
.bubble{margin:0;padding:.9rem 1.2rem;border-radius:1.4rem;max-width:34rem}
.bubble.q{justify-self:end;background:var(--primary);color:var(--on-primary);border-bottom-right-radius:.3rem;font-weight:600}
.bubble.a{justify-self:start;display:flex;gap:.7rem;align-items:flex-start;background:var(--surface);color:var(--text);border:1px solid var(--line);border-bottom-left-radius:.3rem}
.bot{flex:none;display:grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:50%;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:.8rem}
`,
  'contact.band': `
.c-banded .sec-head{max-width:none}
.c-banded .sec-head h2{font-size:clamp(2.8rem,1rem + 9vw,9rem);line-height:.9;letter-spacing:-.055em}
.c-band{padding:1rem 0 2.4rem}
.c-band .contact-actions{margin:0}
.c-band .btn{font-size:1.15rem;padding:1.1rem 2rem}
.c-band-grid{display:grid;gap:2rem}
@media (min-width:900px){.c-band-grid{grid-template-columns:var(--cols);align-items:start}}
`,
  'contact.floating': `
.c-float{position:relative;display:grid;gap:1.2rem;padding:clamp(1rem,4vw,3rem);border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--primary),var(--secondary))}
.c-card{background:var(--surface);color:var(--surface-muted);border-radius:var(--radius-lg);padding:1.6rem;box-shadow:var(--shadow)}
.c-card .form{box-shadow:none;border:0;padding:0;background:none}
@media (min-width:900px){.c-float{grid-template-columns:var(--cols);align-items:start;padding-top:4.5rem}.c-card-a{translate:0 -3.4rem}.c-card-b{translate:0 .6rem}}
`,
  'about.statement': `
.a-big{font-family:var(--font-h);font-size:clamp(1.7rem,1rem + 3.6vw,3.9rem);line-height:1.1;letter-spacing:-.03em;margin:0 0 2rem;max-width:62rem;color:var(--text)}
.a-more{display:grid;gap:1rem;color:var(--muted)}
.a-more p{margin:0}
@media (min-width:900px){.a-more{grid-template-columns:var(--cols);gap:2rem 3rem}}
`,
};

/** CSS de los arquetipos usados por el sitio. */
export function layoutCss(g) {
  const p = g.plan;
  if (!p) return '';
  const used = [`/* ===== Arquetipos de layout: hero ${p.hero} · nav ${p.nav} · formas ${p.shapes} · divisores ${p.dividers} ===== */`];
  used.push(`:root{--cols:${GRID[p.grid] || GRID.even}}`);
  used.push('@media (min-width:900px){.about-grid,.contact-grid{grid-template-columns:var(--cols)}}');
  if (p.scale === 'big') used.push('h2{font-size:clamp(2.2rem,1.1rem + 4.4vw,4.4rem);line-height:1.02}');
  if (p.scale === 'huge') used.push('h2{font-size:clamp(2.5rem,.9rem + 6.6vw,6.6rem);line-height:.98;letter-spacing:-.045em}');
  if (HERO[p.hero]) used.push(HERO_COMMON, HERO[p.hero]);
  if (NAV[p.nav]) used.push(NAV[p.nav]);
  if (SHAPES[p.shapes]) used.push(SHAPES[p.shapes]);
  if (DIVIDERS[p.dividers]) used.push(DIVIDERS[p.dividers]);
  if (p.invert && p.invert !== 'none') used.push(INVERT);
  const seen = new Set();
  for (const s of g.sections) {
    const key = `${s.type}.${p.sections[s.type]}`;
    if (SECTION[key] && !seen.has(key)) { seen.add(key); used.push(SECTION[key]); }
  }
  used.push('.hero h1,.hero-copy{min-width:0}');
  return used.join('\n');
}

export function layoutReducedCss(g) {
  if (!g.plan) return '';
  return `  .stage .ring,.stage-sats li,.t-track,.h-clock .hand.m,.story-hint,.term .caret{animation:none !important}
  .t-ribbon{-webkit-mask-image:none;mask-image:none}
  .t-track{width:auto;flex-wrap:wrap}
  .t-ribbon ul[aria-hidden]{display:none}
  .hs-on .hs-wrap{height:auto !important}
  .hs-on .hs-pin{position:static !important;height:auto !important;overflow-x:auto !important}
  .hs-on .hs-track{translate:none !important}`;
}

/** JS mínimo: scroll horizontal pinneado de servicios (si no, queda el scroll nativo con snap). */
export function layoutJs(g) {
  if (!g.plan || g.plan.sections.services !== 'hscroll') return '';
  return `
  // Servicios con scroll horizontal pinneado (solo escritorio y sin reduced motion; si no, scroll nativo con snap)
  var hsWrap = doc.querySelector('[data-hs]');
  if (hsWrap && !reduce && window.matchMedia('(min-width: 900px)').matches) {
    var hsSection = hsWrap.closest('section');
    var hsTrack = hsWrap.querySelector('.hs-track');
    var hsPin = hsWrap.querySelector('.hs-pin');
    var hsDist = 0, hsRaf = 0;
    var hsMeasure = function () {
      hsSection.classList.remove('hs-on');
      hsDist = Math.max(0, hsTrack.scrollWidth - hsPin.clientWidth);
      hsWrap.style.setProperty('--hs-h', Math.round(hsDist + window.innerHeight) + 'px');
      hsSection.classList.add('hs-on');
    };
    var hsDraw = function () {
      hsRaf = 0;
      var r = hsWrap.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      hsTrack.style.setProperty('--hx', (-p * hsDist).toFixed(1) + 'px');
    };
    hsMeasure();
    window.addEventListener('scroll', function () { if (!hsRaf) hsRaf = window.requestAnimationFrame(hsDraw); }, { passive: true });
    window.addEventListener('resize', function () { hsMeasure(); hsDraw(); });
    hsDraw();
  }
`;
}
