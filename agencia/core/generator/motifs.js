// Motivos de la visión de diseño (structure.vision.motif / motion): marcado del fondo del hero, CSS de cada motivo
// y movimiento, y marquee de servicios del estilo futurista.
// Reglas: solo CSS + transform/opacity para animar (nada que dispare layout), sin librerías ni scripts externos,
// y todo se apaga con prefers-reduced-motion.
import { esc } from './util.js';

/** Fondo decorativo del hero. Capas .lay (parallax) con formas .sh; .spot es la luz que sigue al cursor. */
export function heroBg(g) {
  const v = g.vision;
  if (!v) {
    return '<div class="hero-bg" aria-hidden="true"><svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"><circle class="b1" cx="640" cy="120" r="260"/><circle class="b2" cx="120" cy="520" r="200"/><circle class="b3" cx="420" cy="320" r="90"/></svg></div>';
  }
  const shapes = {
    aurora: '<div class="lay l1"><span class="sh s1"></span><span class="sh s2"></span></div><div class="lay l2"><span class="sh s3"></span><span class="sh s4"></span></div>',
    'neon-grid': '<div class="lay l1"><span class="sh s1"></span></div><div class="lay l2"><span class="ng-floor"><i></i></span><span class="ng-line"></span></div>',
    orbit: '<div class="lay l1"><span class="sh s1"></span><span class="sh s2"></span><span class="sh s3"></span></div><div class="lay l2"><span class="sh s4"></span></div>',
    blob: '<div class="lay l1"><span class="sh s1"></span><span class="sh s2"></span></div><div class="lay l2"><span class="sh s3"></span></div>',
    'paper-cut': '<div class="lay l1"><span class="sh s1"></span><span class="sh s2"></span></div><div class="lay l2"><span class="sh s3"></span><span class="sh s4"></span></div>',
    prisma: '<div class="lay l1"><span class="sh s1"></span><span class="sh s2"></span></div><div class="lay l2"><span class="sh s3"></span><span class="sh s4"></span></div>',
  }[v.motif];
  const spot = v.motion === 'spotlight' ? '<span class="spot"></span>' : '';
  const lines = g.boldness === 'sobrio' ? '' : '<svg class="hero-lines" viewBox="0 0 1200 600" preserveAspectRatio="none"><path pathLength="1" d="M-20 470 C 220 330 360 560 600 400 S 980 250 1220 340"/><path pathLength="1" d="M-20 140 C 200 240 380 60 640 170 S 1000 330 1220 180"/></svg>';
  return `<div class="hero-bg" aria-hidden="true">${shapes}${lines}${spot}</div>`;
}

/** Cinta de servicios (estilo futurista). Dos copias para el bucle; la segunda va oculta a lectores de pantalla. */
export function marquee(g) {
  if (!(g.plan && g.plan.marquee)) return '';
  const pool = g.services.length >= 2 ? g.services.map((s) => String(s.name || '')) : g.differentiators;
  const names = [...new Set(pool.map((n) => n.trim()).filter(Boolean))].slice(0, 8);
  if (names.length < 2) return '';
  const items = names.map((n) => `<li>${esc(n)}</li>`).join('');
  return `<div class="marquee" role="group" aria-label="Lo que hacemos"><div class="marquee-track"><ul>${items}</ul><ul aria-hidden="true">${items}</ul></div></div>`;
}

/** Franja de números reales del brief (cantidad de servicios / diferenciales) que cuentan al aparecer. */
export function stats(g) {
  if (!(g.plan && g.plan.stats)) return '';
  const items = [];
  if (g.services.length >= 2) items.push([g.services.length, g.sector === 'tienda' ? 'productos' : 'servicios']);
  if (g.differentiators.length >= 2) items.push([g.differentiators.length, 'diferenciales']);
  if (items.length < 1 || g.services.length < 2) return '';
  return `<div class="container stats"><ul>${items.map(([n, l]) => `<li><strong class="num" data-count="${n}">${n}</strong><span>${esc(l)}</span></li>`).join('')}</ul></div>`;
}

/** Detalle discreto de la visión: nombre del concepto como sello pequeño en el hero. */
export function conceptTag(g) {
  if (!g.vision || !g.vision.name) return '';
  return `<p class="concept"><span class="concept-dot" aria-hidden="true"></span>Concepto «${esc(g.vision.name)}»</p>`;
}

/** CSS de motivos + movimientos. Se aplica a los 5 estilos; los colores salen de --m1/--m2/--m3 (ajustables por estilo). */
export function motifCss() {
  return `
/* ===== Visión de diseño: motivos y movimientos ===== */
:root{--m1:var(--primary);--m2:var(--accent);--m3:var(--secondary)}
[data-style="vibrante"] .hero-bg{--m1:#ffffff;--m2:var(--accent);--m3:#ffffff}
[data-style="elegante"] .hero-bg{opacity:.7}
[data-motif] .section{isolation:isolate}
.hero-bg .lay{position:absolute;inset:0;transform:translate3d(0,calc(var(--sy,0) * var(--k,0) * 1px),0)}
.hero-bg .l1{--k:.12}
.hero-bg .l2{--k:.28}
.hero-bg .sh{position:absolute;display:block;will-change:transform}
.concept{position:absolute;left:0;bottom:-.4rem;margin:0;display:flex;align-items:center;gap:.5rem;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:inherit}
.concept-dot{width:.5rem;height:.5rem;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}
.hero-grid{position:relative;padding-bottom:1.6rem}
.spot{position:absolute;left:0;top:0;width:40rem;height:40rem;margin:-20rem 0 0 -20rem;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--m2) 42%,transparent),transparent);transform:translate3d(var(--tx,70vw),var(--ty,12rem),0);will-change:transform;pointer-events:none}
@keyframes fl{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(2.5%,-7%,0) scale(1.07)}}
@keyframes morph{0%,100%{border-radius:42% 58% 60% 40%/50% 40% 60% 50%;transform:rotate(0) scale(1)}33%{border-radius:60% 40% 38% 62%/42% 60% 40% 58%;transform:rotate(60deg) scale(1.06)}66%{border-radius:48% 52% 66% 34%/62% 38% 62% 38%;transform:rotate(130deg) scale(.96)}}
@keyframes sway{0%,100%{transform:skewX(-5deg) rotate(-2deg) scale(1)}50%{transform:skewX(5deg) rotate(2deg) scale(1.05)}}
@keyframes spin{to{rotate:360deg}}
@keyframes ngrun{to{transform:rotateX(64deg) translateY(64px)}}
@keyframes pulse{from{opacity:.55}to{opacity:1}}
/* movimiento: float / morph / sway sobre las formas */
[data-motion="float"] .sh{animation:fl 17s ease-in-out infinite alternate}
[data-motion="float"] .sh.s2{animation-duration:23s;animation-delay:-7s}
[data-motion="float"] .sh.s3{animation-duration:20s;animation-delay:-3s}
[data-motion="float"] .sh.s4{animation-duration:26s;animation-delay:-11s}
[data-motion="morph"] .sh{animation:morph 19s ease-in-out infinite}
[data-motion="morph"] .sh.s2{animation-duration:25s;animation-delay:-8s}
[data-motion="morph"] .sh.s3{animation-duration:22s;animation-delay:-4s}
[data-motion="morph"] .sh.s4{animation-duration:29s;animation-delay:-12s}
[data-motion="spotlight"] .sh{animation:fl 40s ease-in-out infinite alternate}
[data-motion="spotlight"] .spot{animation:pulse 5s ease-in-out infinite alternate}
[data-motif="paper-cut"][data-motion="morph"] .sh,[data-motif="prisma"][data-motion="morph"] .sh{animation-name:sway}

/* aurora: malla de gradientes que flota */
[data-motif="aurora"] .s1{width:72vmax;height:72vmax;left:-24vmax;top:-34vmax;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--m1) 62%,transparent),transparent 72%);opacity:.5}
[data-motif="aurora"] .s2{width:64vmax;height:64vmax;right:-26vmax;top:-18vmax;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--m2) 58%,transparent),transparent 72%);opacity:.5}
[data-motif="aurora"] .s3{width:80vmax;height:44vmax;left:8%;bottom:-30vmax;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--m3) 55%,transparent),transparent 72%);opacity:.45}
[data-motif="aurora"] .s4{width:130%;height:26vmax;left:-15%;top:22%;rotate:-11deg;background:linear-gradient(100deg,transparent 12%,color-mix(in srgb,var(--m2) 30%,transparent) 42%,color-mix(in srgb,var(--m1) 32%,transparent) 62%,transparent 88%);opacity:.7;border-radius:50%}
[data-motif="aurora"] .sec-head{position:relative}
[data-motif="aurora"] .sec-head::before{content:"";position:absolute;left:-5rem;top:-4rem;width:24rem;height:15rem;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 20%,transparent),transparent);z-index:-1;pointer-events:none}
[data-motif="aurora"]:not([data-style="futurista"]) .card,[data-motif="aurora"]:not([data-style="futurista"]) .quote{background-image:linear-gradient(135deg,color-mix(in srgb,var(--primary) 7%,transparent),color-mix(in srgb,var(--accent) 10%,transparent))}
[data-motif="aurora"] .s-contact{background:radial-gradient(60% 90% at 85% 0%,color-mix(in srgb,var(--accent) 18%,transparent),transparent),var(--tint)}

/* neon-grid: piso de rejilla en perspectiva + sol de neón */
[data-motif="neon-grid"] .s1{width:min(46vmax,34rem);aspect-ratio:1;right:6%;bottom:30%;border-radius:50%;background:linear-gradient(180deg,var(--m2),var(--m1));-webkit-mask-image:repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 19px);mask-image:repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 19px);opacity:.55}
.ng-floor{position:absolute;left:-40%;right:-40%;bottom:0;height:46%;perspective:520px;overflow:hidden;-webkit-mask-image:linear-gradient(to top,#000 40%,transparent);mask-image:linear-gradient(to top,#000 40%,transparent)}
.ng-floor i{position:absolute;left:0;right:0;top:-60%;bottom:0;background-image:linear-gradient(color-mix(in srgb,var(--m1) 75%,transparent) 1.5px,transparent 1.5px),linear-gradient(90deg,color-mix(in srgb,var(--m1) 75%,transparent) 1.5px,transparent 1.5px);background-size:64px 64px;transform:rotateX(64deg);transform-origin:50% 100%;animation:ngrun 4.5s linear infinite}
.ng-line{position:absolute;left:0;right:0;bottom:46%;height:2px;background:linear-gradient(90deg,transparent,var(--m2),transparent);box-shadow:0 0 22px var(--m2);opacity:.9}
[data-motif="neon-grid"] .eyebrow::before{content:"// ";opacity:.7}
[data-motif="neon-grid"] .card,[data-motif="neon-grid"] .quote{position:relative;border-radius:calc(var(--radius) * .45)}
[data-motif="neon-grid"] .card::before,[data-motif="neon-grid"] .quote::before{content:"";position:absolute;inset:-1px;pointer-events:none;background:linear-gradient(var(--accent),var(--accent)) top left/16px 2px no-repeat,linear-gradient(var(--accent),var(--accent)) top left/2px 16px no-repeat,linear-gradient(var(--accent),var(--accent)) bottom right/16px 2px no-repeat,linear-gradient(var(--accent),var(--accent)) bottom right/2px 16px no-repeat}
[data-motif="neon-grid"] main>.section:not(.hero):nth-of-type(even){background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:48px 48px}

/* orbit: anillos que giran con un satélite cada uno (rotate) + movimiento extra (transform) */
@keyframes ellipse{0%,100%{transform:scale(1,1)}50%{transform:scale(1.18,.84)}}
[data-motif="orbit"]{--x:none}
[data-motif="orbit"][data-motion="float"]{--x:fl 21s ease-in-out infinite alternate}
[data-motif="orbit"][data-motion="morph"]{--x:ellipse 15s ease-in-out infinite}
[data-motif="orbit"] .sh.s1,[data-motif="orbit"] .sh.s2,[data-motif="orbit"] .sh.s3{aspect-ratio:1;border-radius:50%;border:1px solid color-mix(in srgb,var(--m1) 45%,transparent);right:-8%;top:50%;margin-top:calc(var(--d) / -2);width:var(--d);animation:spin var(--t) linear infinite,var(--x)}
[data-motif="orbit"] .sh.s1{--d:min(30rem,80vw);--t:46s}
[data-motif="orbit"] .sh.s2{--d:min(46rem,120vw);--t:74s;border-style:dashed;animation-direction:reverse,normal}
[data-motif="orbit"] .sh.s3{--d:min(64rem,160vw);--t:110s;border-color:color-mix(in srgb,var(--m3) 38%,transparent)}
[data-motif="orbit"] .sh.s1::after,[data-motif="orbit"] .sh.s2::after,[data-motif="orbit"] .sh.s3::after{content:"";position:absolute;top:-6px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:var(--m2);box-shadow:0 0 16px var(--m2)}
[data-motif="orbit"] .sh.s4{width:min(14rem,40vw);aspect-ratio:1;right:4%;top:calc(50% - 7rem);border-radius:50%;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--m2) 70%,transparent),color-mix(in srgb,var(--m1) 35%,transparent) 60%,transparent 72%);opacity:.6}
[data-motif="orbit"] .card-ico,[data-motif="orbit"] .benefit-ico{position:relative;border-radius:50%}
[data-motif="orbit"] .card-ico::after,[data-motif="orbit"] .benefit-ico::after{content:"";position:absolute;inset:-7px;border:1px dashed color-mix(in srgb,var(--primary) 55%,transparent);border-radius:50%;animation:spin 26s linear infinite}
[data-motif="orbit"] .sec-head h2::after{content:"";display:inline-block;width:.4em;height:.4em;margin-left:.35em;border-radius:50%;background:var(--accent);box-shadow:0 0 0 .2em color-mix(in srgb,var(--accent) 28%,transparent)}

/* blob: formas líquidas */
[data-motif="blob"] .s1{width:46vmax;height:46vmax;left:-12vmax;top:-18vmax;border-radius:42% 58% 60% 40%/50% 40% 60% 50%;background:linear-gradient(135deg,color-mix(in srgb,var(--m1) 70%,transparent),color-mix(in srgb,var(--m2) 55%,transparent));opacity:.42}
[data-motif="blob"] .s2{width:36vmax;height:36vmax;right:-8vmax;top:6%;border-radius:60% 40% 38% 62%/42% 60% 40% 58%;background:linear-gradient(200deg,color-mix(in srgb,var(--m2) 65%,transparent),color-mix(in srgb,var(--m3) 55%,transparent));opacity:.4}
[data-motif="blob"] .s3{width:30vmax;height:30vmax;left:30%;bottom:-16vmax;border-radius:48% 52% 66% 34%/62% 38% 62% 38%;border:2px solid color-mix(in srgb,var(--m1) 55%,transparent);opacity:.7}
[data-motif="blob"] .card,[data-motif="blob"] .quote{border-radius:2rem 3rem 1.7rem 2.6rem}
[data-motif="blob"] .card:nth-child(even),[data-motif="blob"] li:nth-child(even) .quote{border-radius:3rem 1.7rem 2.6rem 2rem}
[data-motif="blob"] .card-ico,[data-motif="blob"] .benefit-ico,[data-motif="blob"] .avatar,[data-motif="blob"] .brand-mark,[data-motif="blob"] .about-mark{border-radius:58% 42% 52% 48%/48% 56% 44% 52%}
[data-motif="blob"] .tile figure,[data-motif="blob"] .check-list,[data-motif="blob"] .hours-list,[data-motif="blob"] .form{border-radius:2.2rem 3rem 2rem 2.8rem}

/* paper-cut: capas de papel recortado */
[data-motif="paper-cut"] .sh{height:22%;bottom:0;left:-2%;right:-2%;clip-path:polygon(0 38%,8% 22%,17% 40%,27% 18%,38% 36%,50% 14%,61% 34%,73% 16%,84% 38%,93% 20%,100% 34%,100% 100%,0 100%)}
[data-motif="paper-cut"] .lay{filter:drop-shadow(0 -4px 8px rgba(0,0,0,.16))}
[data-motif="paper-cut"] .s1{background:color-mix(in srgb,var(--m3) 24%,transparent);bottom:-3%}
[data-motif="paper-cut"] .s2{background:color-mix(in srgb,var(--m1) 22%,transparent);bottom:-6%;clip-path:polygon(0 30%,10% 44%,21% 24%,33% 42%,45% 22%,56% 40%,68% 20%,79% 42%,90% 26%,100% 38%,100% 100%,0 100%)}
[data-motif="paper-cut"] .s3{background:color-mix(in srgb,var(--m2) 22%,transparent);bottom:-9%;clip-path:polygon(0 40%,12% 26%,24% 44%,36% 24%,49% 42%,60% 22%,72% 40%,85% 24%,100% 44%,100% 100%,0 100%)}
[data-motif="paper-cut"] .s4{height:auto;width:min(22rem,60vw);aspect-ratio:1;left:auto;right:6%;top:12%;bottom:auto;background:color-mix(in srgb,var(--m2) 26%,transparent);clip-path:polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%);rotate:12deg}
[data-motif="paper-cut"] .card,[data-motif="paper-cut"] .quote,[data-motif="paper-cut"] .form{box-shadow:5px 5px 0 color-mix(in srgb,var(--primary) 24%,transparent),10px 10px 0 color-mix(in srgb,var(--accent) 18%,transparent)}
[data-motif="paper-cut"] .card:nth-child(odd){rotate:-.5deg}
[data-motif="paper-cut"] .card:nth-child(even){rotate:.5deg}

/* prisma: facetas de cristal e iridiscencia */
[data-motif="prisma"] .sh{background:conic-gradient(from 30deg,var(--m1),var(--m2),var(--m3),var(--m1));opacity:.34}
[data-motif="prisma"] .s1{width:min(38rem,70vmax);aspect-ratio:1;right:-6%;top:-10%;clip-path:polygon(50% 0,100% 100%,0 100%)}
[data-motif="prisma"] .s2{width:min(26rem,52vmax);aspect-ratio:1;left:-5%;bottom:-14%;clip-path:polygon(0 0,100% 0,50% 100%);opacity:.26}
[data-motif="prisma"] .s3{width:min(16rem,40vmax);aspect-ratio:1;right:22%;bottom:8%;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);opacity:.4}
[data-motif="prisma"] .s4{width:min(10rem,28vmax);aspect-ratio:1;left:24%;top:10%;clip-path:polygon(0 100%,50% 0,100% 100%);opacity:.3}
@property --ang{syntax:"<angle>";inherits:false;initial-value:0deg}
[data-motif="prisma"] .card,[data-motif="prisma"] .quote{border:1px solid transparent;background:linear-gradient(var(--card-bg,var(--surface)),var(--card-bg,var(--surface))) padding-box,conic-gradient(from var(--ang),var(--primary),var(--accent),var(--secondary),var(--primary)) border-box;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,0 100%);transition:--ang .9s ease,transform .25s,box-shadow .25s}
[data-motif="prisma"] .card:hover,[data-motif="prisma"] .quote:hover{--ang:180deg}
`;
}

/** Reduced motion: apaga todo lo animado de los motivos. */
export function motifReducedCss() {
  return `  .hero-bg .sh,.hero-bg .spot,.ng-floor i,.marquee-track,[data-motif="orbit"] .card-ico::after,[data-motif="orbit"] .benefit-ico::after{animation:none !important}
  .hero-bg .lay{transform:none !important}
  .hero-copy::before{animation:none !important}
  .marquee-track{width:auto;flex-wrap:wrap}
  .marquee-track ul[aria-hidden]{display:none}
  .marquee{-webkit-mask-image:none;mask-image:none}`;
}
