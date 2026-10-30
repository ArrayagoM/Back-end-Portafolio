import { boldJs } from './bold.js';
import { layoutJs } from './layoutcss.js';

// JS del sitio generado (vanilla, sin dependencias).
// `g.vision.motion` activa el movimiento del hero: 'spotlight' (luz que sigue al cursor) o 'parallax' (capas con scroll).
// Solo se escriben transform / variables CSS dentro de requestAnimationFrame; nada de leer layout en cada evento.
function motionJs(g) {
  const motion = g && g.vision && g.vision.motion;
  if (motion === 'spotlight') {
    return `
  // Visión: spotlight que sigue al cursor (solo con mouse; en táctil queda la luz fija que respira)
  var heroEl = doc.querySelector('.hero');
  var spot = heroEl && heroEl.querySelector('.spot');
  if (spot && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var sx = 0, sy = 0, sRaf = 0, sRect = null;
    function drawSpot() {
      sRaf = 0;
      if (!sRect) sRect = heroEl.getBoundingClientRect();
      spot.style.setProperty('--tx', Math.round(sx - sRect.left) + 'px');
      spot.style.setProperty('--ty', Math.round(sy - sRect.top) + 'px');
    }
    heroEl.addEventListener('pointermove', function (e) {
      sx = e.clientX; sy = e.clientY;
      if (!sRaf) sRaf = window.requestAnimationFrame(drawSpot);
    }, { passive: true });
    window.addEventListener('scroll', function () { sRect = null; }, { passive: true });
    window.addEventListener('resize', function () { sRect = null; });
  }
`;
  }
  if (motion === 'parallax') {
    return `
  // Visión: parallax suave del fondo del hero (capas translate3d según --sy)
  var parBg = doc.querySelector('.hero .hero-bg');
  if (parBg && !reduce) {
    var parRaf = 0;
    var parLimit = (doc.querySelector('.hero') || {}).offsetHeight * 1.3 || 1200;
    function drawPar() {
      parRaf = 0;
      var y = window.scrollY || 0;
      if (y < parLimit) parBg.style.setProperty('--sy', String(y));
    }
    window.addEventListener('scroll', function () { if (!parRaf) parRaf = window.requestAnimationFrame(drawPar); }, { passive: true });
    window.addEventListener('resize', function () { parLimit = (doc.querySelector('.hero') || {}).offsetHeight * 1.3 || 1200; });
    drawPar();
  }
`;
  }
  return '';
}

export function buildScript(g) {
  return `/* Generado por Agencia IA */
(function () {
  'use strict';
  var doc = document;
  doc.documentElement.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header sticky: sombra al hacer scroll
  var header = doc.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menú móvil
  var burger = doc.querySelector('.burger');
  var menu = doc.getElementById('mobile-menu');
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('open', open);
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); burger.focus(); } });
  }

  // Animaciones on-scroll
  var targets = doc.querySelectorAll('.reveal, .section');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Link activo en el menú según la sección visible
  var links = doc.querySelectorAll('.nav-links a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (a && en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); l.removeAttribute('aria-current'); });
          a.classList.add('active'); a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) spy.observe(s); });
  }

${motionJs(g)}
${boldJs(g || {})}
${layoutJs(g || {})}
  // Formulario de contacto -> WhatsApp / mailto (sin backend)
  doc.querySelectorAll('form.form').forEach(function (form) {
    var status = form.querySelector('[data-status]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll('input, textarea');
      var ok = true;
      fields.forEach(function (f) {
        var bad = f.hasAttribute('required') && !f.value.trim();
        f.classList.toggle('invalid', bad);
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) ok = false;
      });
      if (!ok) {
        if (status) status.textContent = 'Completá todos los campos para poder enviar tu consulta.';
        var first = form.querySelector('.invalid'); if (first) first.focus();
        return;
      }
      var d = new FormData(form);
      var biz = form.getAttribute('data-biz') || '';
      var text = 'Hola ' + biz + '! Soy ' + d.get('nombre') + '.\\n' + d.get('mensaje') + '\\nContacto: ' + d.get('contacto');
      var channel = (e.submitter && e.submitter.getAttribute('data-channel')) || (form.getAttribute('data-wa') ? 'wa' : 'mail');
      var wa = form.getAttribute('data-wa');
      var mail = form.getAttribute('data-mail');
      if (channel === 'wa' && wa) {
        window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      } else if (mail) {
        window.location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Consulta desde la web - ' + biz) + '&body=' + encodeURIComponent(text);
      } else if (status) {
        status.textContent = 'Por ahora no hay un canal configurado. Usá los datos de contacto de esta página.';
        return;
      }
      if (status) status.textContent = 'Listo! Se abrió tu aplicación con el mensaje preparado.';
    });
  });
})();
`;
}
