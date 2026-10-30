// Paquete de audacia (brief.boldness / structure.vision.boldness): 'sobrio' | 'atrevido' (default) | 'extremo'.
//  - sobrio:   barra de progreso y micro-interacciones finas (nada más).
//  - atrevido: titular cinético, degradé de texto vivo, líneas que se dibujan, parallax por capas/puntero, cursor seguidor,
//              botones magnéticos con ripple, tarjetas con tilt 3D y brillo, cinta de servicios, contadores, bento grid,
//              secciones inclinadas, números gigantes, revelado con cortina, sección invertida, View Transitions.
//  - extremo:  todo lo anterior más intenso + letra por letra, texto vertical, tarjetas apiladas (sticky), intro de 1 s, easter egg.
// Reglas: sin librerías ni scripts externos (todo vive en styles.css y script.js), animaciones solo con transform/opacity
// (más background-position/stroke-dashoffset en elementos chicos), mejora progresiva (animation-timeline) y todo se apaga con
// prefers-reduced-motion. Sin JS o sin animaciones el contenido sigue 100% legible.

export function boldCss(g) {
  const lvl = g.boldness || 'atrevido';
  let css = `
/* ===== Audacia: base (progreso + micro-interacciones) ===== */
.progress{position:fixed;left:0;top:0;right:0;height:3px;z-index:70;pointer-events:none}
.progress i{display:block;height:100%;transform-origin:0 50%;transform:scaleX(var(--p,0));background:linear-gradient(90deg,var(--primary),var(--accent))}
@keyframes prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@supports (animation-timeline:scroll()){.progress i{transform:scaleX(0);animation:prog linear both;animation-timeline:scroll(root)}}
.btn:active{scale:.97}
.nav-links a{transition:background-color .2s,color .2s,translate .2s}
.nav-links a:hover{translate:0 -2px}
.field input,.field textarea{transition:border-color .2s,box-shadow .25s}
.card-ico .ico,.benefit-ico .ico{transition:rotate .45s cubic-bezier(.3,1.6,.5,1),scale .45s cubic-bezier(.3,1.6,.5,1)}
.card:hover .card-ico .ico,.benefit:hover .benefit-ico .ico{rotate:-10deg;scale:1.18}
.site-footer a,.info-list a{background-image:linear-gradient(currentColor,currentColor);background-repeat:no-repeat;background-position:0 100%;background-size:0 2px;transition:background-size .3s;text-decoration:none}
.site-footer a:hover,.info-list a:hover{background-size:100% 2px}
@keyframes focusPulse{from{outline-offset:12px;outline-color:transparent}}
:focus-visible{animation:focusPulse .5s ease-out 1}
`;
  if (lvl === 'sobrio') return css;

  css += `
/* ===== Audacia: atrevido ===== */
:root{--sl:2.4vw}
html,body,main{overflow-x:clip}
/* titular cinético */
@keyframes wordIn{from{opacity:0;transform:translate3d(0,.7em,0) rotate(5deg) skewX(-8deg)}to{opacity:1;transform:none}}
@keyframes chIn{from{opacity:0;transform:translate3d(0,.9em,0) rotateX(-75deg)}60%{opacity:1}to{opacity:1;transform:none}}
@keyframes ink{to{background-position:100% 50%}}
h1 .w{display:inline-block;animation:wordIn .85s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 90ms + 120ms);overflow-wrap:anywhere}
h1 .w.wl{display:inline-block;white-space:nowrap;animation:none}
h1 .w:nth-child(3n+2){font-weight:300}
h1 .w:nth-child(4n+3){font-style:italic}
h1 .ch{display:inline-block;animation:chIn .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc((var(--i,0) * 5 + var(--j,0)) * 36ms + 100ms)}
.hero h1{background:none}
@supports ((-webkit-background-clip:text) or (background-clip:text)){
  h1 .w:not(.wl),h1 .ch{background-image:linear-gradient(100deg,var(--text) 0%,var(--accent-ink) 30%,var(--primary-ink) 62%,var(--text) 100%);background-size:260% 100%;background-position:0 50%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  h1 .w:not(.wl){animation:wordIn .85s cubic-bezier(.2,.8,.2,1) both,ink 7s ease-in-out infinite alternate;animation-delay:calc(var(--i,0) * 90ms + 120ms),0s}
  h1 .ch{animation:chIn .8s cubic-bezier(.2,.8,.2,1) both,ink 7s ease-in-out infinite alternate;animation-delay:calc((var(--i,0) * 5 + var(--j,0)) * 36ms + 100ms),0s}
  [data-style="vibrante"] h1 .w,[data-style="vibrante"] h1 .ch{background-image:none;-webkit-text-fill-color:currentColor;color:inherit}
}
/* fondo vivo: líneas que se dibujan + parallax por puntero */
.hero-lines{position:absolute;inset:0;width:100%;height:100%;fill:none;overflow:visible}
.hero-lines path{stroke:var(--m2);stroke-width:2.5;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;opacity:.8;animation:draw 3.4s .5s cubic-bezier(.6,0,.2,1) forwards}
.hero-lines path+path{stroke:var(--m1);animation-delay:1.1s}
@keyframes draw{to{stroke-dashoffset:0}}
.hero-bg .lay{translate:calc(var(--px,0) * var(--kk,1) * -18px) calc(var(--py,0) * var(--kk,1) * -14px);transition:translate .5s ease-out}
.hero-bg .l2{--kk:2.2}
.hero-card{rotate:-1.6deg}
@media (min-width:900px){.hero-card{translate:-2rem 1.2rem}}
/* cursor, botones magnéticos y ripple */
.cur{position:fixed;left:0;top:0;width:2.6rem;height:2.6rem;margin:-1.3rem 0 0 -1.3rem;border:1.5px solid var(--accent);border-radius:50%;pointer-events:none;z-index:120;opacity:0;transform:translate3d(var(--cx,-100px),var(--cy,-100px),0);scale:1;transition:opacity .3s,scale .25s,background-color .25s}
.cur.on{opacity:.9}
.cur.big{scale:1.7;background:color-mix(in srgb,var(--accent) 16%,transparent)}
.cur-dot{position:fixed;left:0;top:0;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:var(--accent);pointer-events:none;z-index:121;opacity:0;transform:translate3d(var(--cx,-100px),var(--cy,-100px),0);transition:opacity .3s}
.cur-dot.on{opacity:1}
.btn{position:relative;overflow:hidden;translate:var(--bx,0px) var(--by,0px);transition:translate .25s ease-out,transform .18s ease,box-shadow .18s ease,background-color .18s ease}
.ripple{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:rgba(255,255,255,.45);transform:scale(0);pointer-events:none;animation:rip .7s ease-out forwards}
@keyframes rip{to{transform:scale(24);opacity:0}}
/* tarjetas: tilt 3D que sigue al puntero + brillo */
.card{position:relative}
.card::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(16rem circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--accent) 18%,transparent),transparent 62%);opacity:0;transition:opacity .3s;pointer-events:none}
.card:hover::after{opacity:1}
body:not([data-boldness="sobrio"]) .js .card.reveal.in{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(var(--ty,0px));transition:transform .25s ease-out,box-shadow .3s,border-color .3s}
body:not([data-boldness="sobrio"]) .js .card.reveal.in:hover{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(var(--ty,-6px))}
/* cinta de servicios (estilos no futuristas) y contadores */
body:not([data-style="futurista"]) .marquee{overflow:hidden;border-block:1px solid var(--line);background:var(--tint);padding-block:1.05rem;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
body:not([data-style="futurista"]) .marquee-track{display:flex;width:max-content;animation:marq 36s linear infinite}
body:not([data-style="futurista"]) .marquee ul{display:flex;flex:none;margin:0;padding:0;list-style:none}
body:not([data-style="futurista"]) .marquee li{display:flex;align-items:center;white-space:nowrap;font-family:var(--font-h);font-size:clamp(1.1rem,.9rem + 1.2vw,1.8rem);font-weight:700;letter-spacing:-.01em;color:var(--text)}
body:not([data-style="futurista"]) .marquee li::after{content:"\\2726";margin:0 1.6rem;color:var(--primary-ink)}
body:not([data-style="futurista"]) .marquee:hover .marquee-track{animation-play-state:paused}
@keyframes marq{to{transform:translate3d(-50%,0,0)}}
.stats ul{list-style:none;margin:0;padding:clamp(1.6rem,4vw,3.4rem) 0 0;display:flex;flex-wrap:wrap;align-items:flex-end;gap:1rem clamp(2rem,8vw,7rem)}
.stats li{display:flex;flex-direction:column}
.stats .num{font-family:var(--font-h);font-weight:800;font-size:clamp(3.2rem,10vw,8rem);line-height:.9;letter-spacing:-.05em;font-variant-numeric:tabular-nums;color:var(--primary-ink);min-width:1.2ch}
.stats span{font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
/* layouts no convencionales: secciones inclinadas, números gigantes, bento, asimetrías */
main{counter-reset:sec}
main>.section:not(.hero){counter-increment:sec;position:relative;isolation:isolate}
main>.section:not(.hero)::before{content:counter(sec,decimal-leading-zero);position:absolute;top:calc(var(--sl) + .4rem);right:-1vw;z-index:-1;font-family:var(--font-h);font-weight:800;font-size:clamp(7rem,22vw,19rem);line-height:.8;letter-spacing:-.06em;color:transparent;-webkit-text-stroke:1.5px color-mix(in srgb,var(--text) 15%,transparent);pointer-events:none}
@keyframes numdrift{from{translate:3vw 0}to{translate:-3vw 0}}
@supports (animation-timeline:view()){main>.section:not(.hero)::before{animation:numdrift linear both;animation-timeline:view()}}
.benefits .benefit:nth-child(even){margin-top:2.2rem}
.gallery .tile:nth-child(3n+1){rotate:-1.6deg}
.gallery .tile:nth-child(3n+2){rotate:1.3deg;translate:0 1.2rem}
.svc-bento[data-n="1"] .card h3{font-size:var(--fs-3)}
@media (min-width:900px){
  .svc-bento:is([data-n="3"],[data-n="4"],[data-n="5"],[data-n="6"],[data-n="7"],[data-n="8"],[data-n="9"],[data-n="10"],[data-n="11"],[data-n="12"]){grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:dense}
  .svc-bento:is([data-n="3"],[data-n="4"],[data-n="5"],[data-n="6"],[data-n="7"],[data-n="8"],[data-n="9"],[data-n="10"],[data-n="11"],[data-n="12"]) .card:nth-child(1){grid-column:span 2;grid-row:span 2;background-image:linear-gradient(165deg,color-mix(in srgb,var(--primary) 14%,transparent),transparent 60%)}
  .svc-bento:is([data-n="3"],[data-n="4"],[data-n="5"],[data-n="6"],[data-n="7"],[data-n="8"],[data-n="9"],[data-n="10"],[data-n="11"],[data-n="12"]) .card:nth-child(1) h3{font-size:var(--fs-3);line-height:1.05}
  .svc-bento[data-n="3"] .card:nth-child(n+2),.svc-bento[data-n="4"] .card:nth-child(2){grid-column:span 2}
  .svc-bento:is([data-n="6"],[data-n="7"],[data-n="8"],[data-n="9"],[data-n="10"],[data-n="11"],[data-n="12"]) .card:nth-child(n+6){grid-column:span 2}
  .svc-bento[data-odd="1"] .card:last-child{grid-column:span 4}
}
/* revelado con cortina (clip-path) en los títulos */
.js .section .sec-head h2{clip-path:inset(0 100% 0 0);transition:clip-path 1s cubic-bezier(.7,0,.2,1)}
.js .section.in .sec-head h2{clip-path:inset(-10% -3% -10% -3%)}
.js .reveal{transform:translateY(34px) scale(.97)}
/* View Transitions al navegar entre secciones */
@keyframes vtOut{to{opacity:0;scale:.985}}
@keyframes vtIn{from{opacity:0;scale:1.015}}
::view-transition-old(root){animation:vtOut .3s ease both}
::view-transition-new(root){animation:vtIn .4s ease both}
/* easter egg: confeti con la forma del motivo */
.egg{position:fixed;width:12px;height:12px;pointer-events:none;z-index:150;background:var(--accent);animation:egg 1.3s cubic-bezier(.1,.7,.3,1) forwards}
@keyframes egg{to{transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.2);opacity:0}}
.egg-aurora,.egg-blob{border-radius:50%}
.egg-orbit{border-radius:50%;background:none;border:2px solid var(--accent)}
.egg-paper-cut{clip-path:polygon(50% 0,100% 100%,0 100%)}
.egg-prisma{clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
`;

  if (lvl === 'extremo') {
    css += `
/* ===== Audacia: extremo ===== */
h1{font-size:clamp(2.1rem,.5rem + 8vw,6.3rem);line-height:.92;letter-spacing:-.055em}
@media (min-width:900px){.hero h1{margin-right:-8vw}}
.hero-card{rotate:-3.2deg}
@media (min-width:900px){.hero-card{translate:-1rem 4.5rem}}
main>.section:not(.hero)::before{-webkit-text-stroke-color:color-mix(in srgb,var(--text) 22%,transparent)}
.stats .num{font-size:clamp(4rem,15vw,12rem)}
@media (min-width:1280px){
  main>.section:not(.hero) .sec-head{position:relative}
  main>.section:not(.hero) .sec-head .eyebrow{position:absolute;left:-3.2rem;top:.3rem;margin:0;writing-mode:vertical-rl;rotate:180deg;letter-spacing:.3em;white-space:nowrap}
}
@media (min-width:900px){
  .quotes{display:block;max-width:46rem}
  .quotes>li{position:sticky;top:calc(5.5rem + var(--d,0) * 1.1rem);margin-bottom:1.4rem}
  .quotes>li:nth-child(even){margin-left:3rem}
}
.intro{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--deep);color:var(--on-deep);font-family:var(--font-h);font-size:clamp(1.8rem,7vw,4rem);font-weight:800;letter-spacing:-.04em;text-align:center;padding:1rem;clip-path:inset(0 0 0 0);transition:clip-path .65s cubic-bezier(.7,0,.2,1)}
.intro.out{clip-path:inset(0 0 100% 0)}
.intro span{display:block;animation:wordIn .6s cubic-bezier(.2,.8,.2,1) both}
`;
  }
  return css;
}

/** CSS que apaga lo animado del paquete de audacia con prefers-reduced-motion. */
export function boldReducedCss(g) {
  if (g.boldness === 'sobrio') return '';
  return `  h1 .w,h1 .ch{animation:none !important;opacity:1 !important;transform:none !important}
  .hero-lines path{animation:none !important;stroke-dashoffset:0 !important}
  .js .section .sec-head h2{clip-path:none !important}
  .js .reveal{transform:none !important}
  .cur,.cur-dot,.intro,.egg{display:none !important}
  .hero-bg .lay{translate:none !important}
  main>.section:not(.hero)::before{animation:none !important}
  .progress i{animation:none !important}`;
}

/** JS mínimo del paquete (se inserta en script.js). Usa la variable `reduce` y `doc` del script base. */
export function boldJs(g) {
  const lvl = g.boldness || 'atrevido';
  const motif = g.vision ? g.vision.motif : 'aurora';
  let js = `
  // Barra de progreso de lectura (CSS scroll-driven si el navegador lo soporta; si no, esta alternativa)
  var bar = doc.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.appendChild(doc.createElement('i'));
  doc.body.appendChild(bar);
  if (!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'))) {
    var pRaf = 0;
    var drawP = function () {
      pRaf = 0;
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', h > 0 ? Math.min(1, window.scrollY / h).toFixed(4) : '0');
    };
    window.addEventListener('scroll', function () { if (!pRaf) pRaf = window.requestAnimationFrame(drawP); }, { passive: true });
    drawP();
  }
`;
  if (lvl === 'sobrio') return js;

  js += `
  var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  // Contadores: cuentan hasta el número real cuando entran en pantalla
  var nums = doc.querySelectorAll('[data-count]');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target;
        var to = parseInt(el.getAttribute('data-count'), 10) || 0;
        var t0 = null;
        var step = function (t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / 900);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { cio.observe(n); });
  }

  // Ripple en botones
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.btn');
    if (!b || reduce) return;
    var r = b.getBoundingClientRect();
    var s = doc.createElement('span');
    s.className = 'ripple';
    s.style.left = (e.clientX - r.left) + 'px';
    s.style.top = (e.clientY - r.top) + 'px';
    b.appendChild(s);
    window.setTimeout(function () { s.remove(); }, 750);
  });

  // Navegación entre secciones con View Transitions (si no existe, el ancla normal con scroll suave)
  if (doc.startViewTransition && !reduce) {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var id = a.getAttribute('href').slice(1);
      var t = id ? doc.getElementById(id) : null;
      if (!t) return;
      e.preventDefault();
      doc.startViewTransition(function () {
        doc.documentElement.style.scrollBehavior = 'auto';
        t.scrollIntoView();
        doc.documentElement.style.scrollBehavior = '';
        t.setAttribute('tabindex', '-1');
        t.focus({ preventScroll: true });
        if (window.history && history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
  }

  // Easter egg: 5 clics rápidos en el logo lanzan confeti con la forma del motivo de diseño
  var brandEl = doc.querySelector('.brand');
  var eggClicks = 0;
  var eggTimer = 0;
  function burst(from) {
    var r = from.getBoundingClientRect();
    for (var i = 0; i < 26; i++) {
      var p = doc.createElement('i');
      var a = Math.random() * 6.283;
      var d = 90 + Math.random() * 220;
      p.className = 'egg egg-${motif}';
      p.setAttribute('aria-hidden', 'true');
      p.style.left = (r.left + r.width / 2) + 'px';
      p.style.top = (r.top + r.height / 2) + 'px';
      p.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
      doc.body.appendChild(p);
      (function (n) { window.setTimeout(function () { n.remove(); }, 1500); })(p);
    }
  }
  if (brandEl && !reduce) {
    brandEl.addEventListener('click', function () {
      eggClicks += 1;
      window.clearTimeout(eggTimer);
      eggTimer = window.setTimeout(function () { eggClicks = 0; }, 1500);
      if (eggClicks >= 5) { eggClicks = 0; burst(brandEl); }
    });
  }

  if (fine && !reduce) {
    // Cursor seguidor
    var ring = doc.createElement('div');
    var dot = doc.createElement('div');
    ring.className = 'cur';
    dot.className = 'cur-dot';
    ring.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(ring);
    doc.body.appendChild(dot);
    var cx = 0, cy = 0, rx = 0, ry = 0, cRaf = 0;
    var follow = function () {
      rx += (cx - rx) * 0.18;
      ry += (cy - ry) * 0.18;
      ring.style.setProperty('--cx', rx.toFixed(1) + 'px');
      ring.style.setProperty('--cy', ry.toFixed(1) + 'px');
      cRaf = (Math.abs(cx - rx) > 0.3 || Math.abs(cy - ry) > 0.3) ? window.requestAnimationFrame(follow) : 0;
    };
    doc.addEventListener('pointermove', function (e) {
      cx = e.clientX; cy = e.clientY;
      dot.style.setProperty('--cx', cx + 'px');
      dot.style.setProperty('--cy', cy + 'px');
      ring.classList.add('on');
      dot.classList.add('on');
      ring.classList.toggle('big', !!(e.target.closest && e.target.closest('a,button,.card,summary,input,textarea')));
      if (!cRaf) cRaf = window.requestAnimationFrame(follow);
    }, { passive: true });
    doc.documentElement.addEventListener('mouseleave', function () { ring.classList.remove('on'); dot.classList.remove('on'); });

    // Botones magnéticos
    doc.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });

    // Tarjetas: tilt 3D + brillo que sigue al puntero
    doc.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - 0.5) * 12).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
        c.style.setProperty('--ty', '-6px');
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () {
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
        c.style.setProperty('--ty', '0px');
      });
    });

    // Parallax por capas con el puntero en el hero
    var heroP = doc.querySelector('.hero');
    var bgP = heroP && heroP.querySelector('.hero-bg');
    if (heroP && bgP) {
      var prRaf = 0;
      heroP.addEventListener('pointermove', function (e) {
        if (prRaf) return;
        var px = e.clientX, py = e.clientY;
        prRaf = window.requestAnimationFrame(function () {
          prRaf = 0;
          var r = heroP.getBoundingClientRect();
          bgP.style.setProperty('--px', (((px - r.left) / r.width - 0.5) * 2).toFixed(3));
          bgP.style.setProperty('--py', (((py - r.top) / r.height - 0.5) * 2).toFixed(3));
        });
      }, { passive: true });
    }
  }
`;

  if (lvl === 'extremo') {
    js += `
  // Intro breve (menos de 1,2 s, saltable, una vez por sesión). El contenido ya está en el HTML: no bloquea nada.
  try {
    if (!reduce && !window.sessionStorage.getItem('intro')) {
      window.sessionStorage.setItem('intro', '1');
      var brandName = doc.querySelector('.brand span:last-child');
      var intro = doc.createElement('div');
      var word = doc.createElement('span');
      intro.className = 'intro';
      intro.setAttribute('aria-hidden', 'true');
      word.textContent = brandName ? brandName.textContent : '';
      intro.appendChild(word);
      doc.body.appendChild(intro);
      var closed = false;
      var closeIntro = function () {
        if (closed) return;
        closed = true;
        intro.classList.add('out');
        window.setTimeout(function () { intro.remove(); }, 700);
      };
      window.setTimeout(closeIntro, 450);
      ['click', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { window.addEventListener(t, closeIntro, { once: true, passive: true }); });
    }
  } catch (err) { /* sin sessionStorage: sin intro */ }
`;
  }
  return js;
}
