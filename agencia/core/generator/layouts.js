// Arquetipos de layout: renderers de hero y de variantes de sección según g.plan (structure.layoutPlan).
// Cada variante es una composición DISTINTA (otro DOM, otra jerarquía y otro recorrido visual), no solo otro CSS.
// Todo texto del cliente pasa por esc(). El CSS de cada variante vive en layoutcss.js y solo se emite el de las usadas.
import { esc, str, arr, pick, paras, slug } from './util.js';
import { icon, iconFor } from './icons.js';
import { btn, head, wrap, itemsOf, kinetic, parseHours } from './sections.js';
import { conceptTag } from './motifs.js';

const num2 = (i) => String(i + 1).padStart(2, '0');
const lis = (arr2, fn) => arr2.map(fn).join('');

/* ====================== HERO ====================== */

function infoLi([ico, k, v], i) {
  return `<li style="--n:${i}">${ico}<span><strong>${esc(k)}</strong>${esc(v)}</span></li>`;
}
function badgesUl(d, cls = 'hero-badges') {
  return d.badges.length ? `<ul class="${cls}">${d.badges.map((b) => `<li>${icon('check')}<span>${esc(b)}</span></li>`).join('')}</ul>` : '';
}

/** d = { headline, sub, cta, second, badges, info, photo } (ya preparados por hero() en sections.js). */
export function heroVariant(kind, g, id, d) {
  const open = `<section id="${esc(id)}" class="section hero hero-${kind}" data-hero="${esc(g.theme.style)}" aria-labelledby="${esc(id)}-t">`;
  const eyebrow = g.sector ? `<p class="eyebrow">${esc(g.sector)}</p>` : '';
  const h1 = `<h1 id="${esc(id)}-t">${kinetic(d.headline, g)}</h1>`;
  const lead = d.sub ? `<p class="lead">${esc(d.sub)}</p>` : '';
  const actions = `<div class="hero-actions">${d.cta}${d.second}</div>`;
  const concept = conceptTag(g);
  const info = d.info.slice(0, 3);
  const bg = d.bg;
  const letter = esc(g.name.trim().charAt(0).toUpperCase());
  let body;
  switch (kind) {
    case 'typo':
      body = `<div class="container hv">${eyebrow}${h1}<div class="typo-row">${lead}${actions}</div>${badgesUl(d)}${d.photo}${concept}</div>`;
      break;
    case 'stage':
      body = `<div class="container hv stage"><span class="ring r1" aria-hidden="true"></span><span class="ring r2" aria-hidden="true"></span><div class="stage-core">${eyebrow}${h1}${lead}${actions}${d.photo}</div><ul class="stage-sats">${lis(info, infoLi)}</ul>${badgesUl(d, 'hero-badges stage-badges')}${concept}</div>`;
      break;
    case 'editorial':
      body = `<div class="container hv ed"><span class="ed-letter" aria-hidden="true">${letter}</span><p class="eyebrow ed-vert">${esc(g.sector)}</p><div class="ed-main">${h1}</div><div class="ed-side">${lead}${actions}</div><ul class="ed-facts">${lis(info, infoLi)}</ul>${badgesUl(d)}${d.photo}${concept}</div>`;
      break;
    case 'bento': {
      const n = g.services.length;
      const metric = n ? `<strong>${n}</strong><span>${esc(g.sector === 'tienda' ? 'productos' : 'servicios')}</span>` : `<strong>${letter}</strong><span>${esc(g.name)}</span>`;
      body = `<div class="container hv hb"><div class="hb-t hb-title">${eyebrow}${h1}${lead}</div><div class="hb-t hb-cta">${actions}</div><div class="hb-t hb-metric">${metric}</div><div class="hb-t hb-info"><ul>${lis(info, infoLi)}</ul></div>${d.badges.length ? `<div class="hb-t hb-badges">${badgesUl(d, 'hb-list')}</div>` : ''}<div class="hb-t hb-mark" aria-hidden="true">${icon(iconFor(g.sector + ' ' + g.name, 0, ''))}</div>${d.photo ? `<div class="hb-t hb-photo">${d.photo}</div>` : ''}${concept}</div>`;
      break;
    }
    case 'poster':
      body = `<div class="container hv poster"><div class="pz pz-a">${eyebrow}${h1}</div><div class="pz pz-b">${lead || '<p class="lead">&nbsp;</p>'}</div><div class="pz pz-c">${actions}</div><span class="sticker" aria-hidden="true">${esc(g.sector || g.name)}</span><ul class="poster-info">${lis(info, infoLi)}</ul>${badgesUl(d)}${d.photo}${concept}</div>`;
      break;
    case 'terminal': {
      const handle = slug(g.name);
      const kv = info.map(([, k, v]) => `<li><span class="k">${esc(k.toLowerCase().replace(/\s+/g, '_'))}</span><span class="v">${esc(v)}</span></li>`).join('');
      body = `<div class="container hv"><div class="term" role="group" aria-label="${esc(g.name)}"><div class="term-bar" aria-hidden="true"><i></i><i></i><i></i><span>~/${esc(handle)}</span></div><div class="term-body"><p class="term-line" aria-hidden="true"><span class="prompt">$</span> abrir <b>${esc(handle)}</b></p>${eyebrow}${h1}<div class="term-out">${lead}</div><ul class="term-kv">${kv}</ul>${badgesUl(d, 'hero-badges term-badges')}<p class="term-line" aria-hidden="true"><span class="prompt">$</span> <span class="caret"></span></p>${actions}</div></div>${d.photo}${concept}</div>`;
      break;
    }
    case 'story':
      body = `<div class="story"><div class="story-pin"><div class="container hv">${eyebrow}${h1}<span class="story-hint" aria-hidden="true">${icon('chevron')}</span></div></div><div class="container story-steps"><div class="story-step">${lead}${actions}</div>${d.badges.length ? `<div class="story-step">${badgesUl(d, 'hero-badges big')}</div>` : ''}${info.length ? `<div class="story-step"><ul class="story-info">${lis(info, infoLi)}</ul></div>` : ''}${d.photo ? `<div class="story-step">${d.photo}</div>` : ''}</div>${concept}</div>`;
      break;
    default:
      return null;
  }
  return `${open}\n${bg}\n${body}\n</section>`;
}

/* ====================== SECCIONES ====================== */

function servicesItems(g, c) {
  const items = itemsOf(c, 'items', 'services', 'list').map((i) => (typeof i === 'string' ? { name: i } : i));
  const seen = new Set(items.map((i) => slug(pick(i, 'name', 'title'))));
  for (const sv of g.services) { const k = slug(sv.name); if (!seen.has(k)) { items.push(sv); seen.add(k); } }
  return items.map((it, i) => ({ name: pick(it, 'name', 'title'), desc: pick(it, 'description', 'text', 'desc'), price: pick(it, 'price', 'precio'), ico: iconFor(`${pick(it, 'name', 'title')} ${pick(it, 'description', 'text', 'desc')}`, i, it.icon) }));
}

function services(g, s, id, kind) {
  const c = s.content || {};
  const items = servicesItems(g, c);
  if (!items.length) return null;
  const hd = head(id, pick(c, 'eyebrow') || 'Lo que hacemos', pick(c, 'title', 'heading') || 'Nuestros servicios', pick(c, 'intro', 'subtitle', 'lead', 'text'));
  const cta = `<p class="sec-cta">${btn(g.cta.href, g.cta.label, 'btn-primary', icon('arrow'), g.cta.external)}</p>`;
  const price = (p) => (p ? `<span class="price">${esc(p)}</span>` : '');
  switch (kind) {
    case 'list':
      return wrap(s, id, `${hd}<ol class="svc-list">${lis(items, (it, i) => `<li class="svc-row reveal" style="--d:${i % 6}"><span class="svc-n" aria-hidden="true">${num2(i)}</span><div class="svc-t"><h3>${esc(it.name)}</h3>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}</div>${price(it.price)}<span class="svc-ico" aria-hidden="true">${icon(it.ico)}</span></li>`)}</ol>${cta}`, 'svc-listing');
    case 'stack':
      return wrap(s, id, `${hd}<ul class="svc-stack">${lis(items, (it, i) => `<li class="svc-card" style="--i:${i}"><span class="svc-ico" aria-hidden="true">${icon(it.ico)}</span><span class="svc-n" aria-hidden="true">${num2(i)}</span><h3>${esc(it.name)}</h3>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}${price(it.price)}</li>`)}</ul>${cta}`, 'svc-stacked');
    case 'hscroll':
      return wrap(s, id, `${hd}<div class="hs-wrap" data-hs><div class="hs-pin"><ul class="hs-track">${lis(items, (it, i) => `<li class="hs-card" style="--i:${i}"><span class="svc-n" aria-hidden="true">${num2(i)}</span><span class="svc-ico" aria-hidden="true">${icon(it.ico)}</span><h3>${esc(it.name)}</h3>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}${price(it.price)}</li>`)}</ul></div></div>${cta}`, 'svc-hs');
    case 'accordion':
      return wrap(s, id, `${hd}<div class="svc-acc">${lis(items, (it, i) => `<details class="svc-item reveal" style="--d:${i % 6}"${i === 0 ? ' open' : ''}><summary><span class="svc-n" aria-hidden="true">${num2(i)}</span><span class="svc-name">${esc(it.name)}</span>${price(it.price)}${icon('chevron', 'faq-chev')}</summary><div class="svc-body">${it.desc ? `<p>${esc(it.desc)}</p>` : '<p>Consultanos por los detalles.</p>'}</div></details>`)}</div>${cta}`, 'svc-accordion');
    default:
      return null;
  }
}

function benefits(g, s, id, kind) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'benefits', 'list').map((i) => (typeof i === 'string' ? { title: i } : i));
  if (!items.length) items = g.differentiators.map((d) => ({ title: d }));
  if (!items.length) return null;
  const rows = items.map((it, i) => ({ t: pick(it, 'title', 'name'), d: pick(it, 'text', 'description'), ico: iconFor(`${pick(it, 'title', 'name')} ${pick(it, 'text', 'description')}`, i, it.icon) }));
  const hd = head(id, pick(c, 'eyebrow') || 'Nuestra diferencia', pick(c, 'title', 'heading') || `Por qué elegir ${g.name}`, pick(c, 'intro', 'subtitle', 'lead'));
  switch (kind) {
    case 'radial':
      return wrap(s, id, `${hd}<div class="b-radial" style="--n:${rows.length}"><div class="b-core" aria-hidden="true"><span>${esc(g.name.trim().charAt(0).toUpperCase())}</span></div><ul>${lis(rows, (r, i) => `<li style="--i:${i}"><span class="b-pos reveal" style="--d:${i % 6}"><span class="benefit-ico">${icon(r.ico)}</span><h3>${esc(r.t)}</h3>${r.d ? `<p>${esc(r.d)}</p>` : ''}</span></li>`)}</ul></div>`, 'b-radialized');
    case 'columns':
      return wrap(s, id, `${hd}<ol class="b-cols">${lis(rows, (r, i) => `<li class="reveal" style="--d:${i % 6}"><span class="b-num" aria-hidden="true">${num2(i)}</span><div><h3>${esc(r.t)}</h3>${r.d ? `<p>${esc(r.d)}</p>` : ''}</div></li>`)}</ol>`, 'b-columned');
    case 'strip':
      return wrap(s, id, `${hd}<ul class="b-strip">${lis(rows, (r, i) => `<li class="reveal" style="--d:${i % 6}"><span class="b-big">${icon(r.ico)}</span><h3>${esc(r.t)}</h3>${r.d ? `<p>${esc(r.d)}</p>` : ''}</li>`)}</ul>`, 'b-stripped');
    default:
      return null;
  }
}

function testimonials(g, s, id, kind) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'testimonials').map((t) => (typeof t === 'string' ? { text: t } : t));
  if (!items.length) items = g.testimonials;
  if (!items.length) return null;
  const q = items.map((t) => ({ text: pick(t, 'text', 'quote'), who: pick(t, 'name', 'author'), role: pick(t, 'role', 'detail') }));
  const hd = head(id, pick(c, 'eyebrow') || 'Opiniones', pick(c, 'title', 'heading') || 'Lo que dicen nuestros clientes', '');
  const cap = (t) => `<figcaption><span class="avatar" aria-hidden="true">${esc(t.who.charAt(0).toUpperCase() || '·')}</span><span><strong>${esc(t.who)}</strong>${t.role ? `<small>${esc(t.role)}</small>` : ''}</span></figcaption>`;
  switch (kind) {
    case 'quote':
      return wrap(s, id, `${hd}<ul class="t-slides" tabindex="0" aria-label="Opiniones">${lis(q, (t, i) => `<li class="t-slide"><figure>${icon('quote', 'quote-ico')}<blockquote><p>${esc(t.text)}</p></blockquote>${cap(t)}<span class="t-count" aria-hidden="true">${num2(i)} / ${num2(q.length - 1)}</span></figure></li>`)}</ul>`, 't-quoted');
    case 'masonry':
      return wrap(s, id, `${hd}<ul class="t-masonry">${lis(q, (t, i) => `<li class="reveal" style="--d:${i % 6}"><figure class="quote">${icon('quote', 'quote-ico')}<blockquote><p>${esc(t.text)}</p></blockquote>${cap(t)}</figure></li>`)}</ul>`, 't-masoned');
    case 'ribbon': {
      const one = lis(q, (t) => `<li><figure class="quote"><blockquote><p>${esc(t.text)}</p></blockquote>${cap(t)}</figure></li>`);
      const two = lis(q, (t) => `<li><figure class="quote"><blockquote><p>${esc(t.text)}</p></blockquote></figure></li>`);
      return wrap(s, id, `${hd}<div class="t-ribbon"><div class="t-track"><ul>${one}</ul><ul aria-hidden="true">${two}</ul></div></div>`, 't-ribboned');
    }
    default:
      return null;
  }
}

function hours(g, s, id, kind) {
  const c = s.content || {};
  let rows = itemsOf(c, 'items', 'hours', 'schedule').map((r) => (typeof r === 'string' ? parseHours(r)[0] : { day: pick(r, 'day', 'dia'), hours: pick(r, 'hours', 'time', 'horario') }));
  if (!rows.length) rows = parseHours(g.contact.hours);
  if (!rows.length) return null;
  const hd = head(id, pick(c, 'eyebrow') || 'Cuándo visitarnos', pick(c, 'title', 'heading') || 'Horarios de atención', '');
  const dl = `<dl class="h-rows">${lis(rows, (r) => `<div class="h-row"><dt>${esc(r.day || 'Horario')}</dt><dd>${esc(r.hours)}</dd></div>`)}</dl>`;
  const where = g.contact.address ? `<p class="h-where">${icon('pin')}<span>${esc(g.contact.address)}</span></p>` : '';
  const map = g.links.map ? btn(g.links.map, 'Cómo llegar', 'btn-ghost', icon('pin'), true) : '';
  switch (kind) {
    case 'ticket':
      return wrap(s, id, `${hd}<div class="h-ticket"><div class="h-stub" aria-hidden="true">${icon('clock', 'big-ico')}<span>${esc(g.name)}</span></div><div class="h-main"><p class="h-kicker">Entrada libre</p>${dl}${where}${map}</div></div>`, 'h-ticketed');
    case 'clock':
      return wrap(s, id, `${hd}<div class="h-clock-wrap"><svg class="h-clock" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle cx="100" cy="100" r="92" class="face"/>${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${(100 + 78 * Math.sin(a)).toFixed(1)}" y1="${(100 - 78 * Math.cos(a)).toFixed(1)}" x2="${(100 + 88 * Math.sin(a)).toFixed(1)}" y2="${(100 - 88 * Math.cos(a)).toFixed(1)}" class="tick"/>`; }).join('')}<line x1="100" y1="100" x2="100" y2="48" class="hand m"/><line x1="100" y1="100" x2="132" y2="82" class="hand h"/><circle cx="100" cy="100" r="5" class="pivot"/></svg><div class="h-side">${dl}${where}${map}</div></div>`, 'h-clocked');
    case 'table':
      return wrap(s, id, `${hd}<div class="h-table">${dl}<div class="h-aside">${where}${map}</div></div>`, 'h-tabled');
    default:
      return null;
  }
}

function faq(g, s, id, kind) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'faqs', 'questions').map((i) => ({ q: pick(i, 'q', 'question', 'pregunta'), a: pick(i, 'a', 'answer', 'respuesta') })).filter((i) => i.q);
  if (!items.length) return null;
  const hd = head(id, pick(c, 'eyebrow') || 'Dudas', pick(c, 'title', 'heading') || 'Preguntas frecuentes', '');
  switch (kind) {
    case 'columns':
      return wrap(s, id, `${hd}<div class="faq-cols">${lis(items, (i, n) => `<article class="reveal" style="--d:${n % 6}"><h3><span aria-hidden="true">${num2(n)}</span> ${esc(i.q)}</h3><p>${esc(i.a)}</p></article>`)}</div>`, 'faq-columned');
    case 'chat':
      return wrap(s, id, `${hd}<div class="faq-chat">${lis(items, (i, n) => `<div class="turn reveal" style="--d:${n % 6}"><p class="bubble q">${esc(i.q)}</p><p class="bubble a"><span class="bot" aria-hidden="true">${esc(g.name.trim().charAt(0).toUpperCase())}</span>${esc(i.a)}</p></div>`)}</div>`, 'faq-chatty');
    default:
      return null;
  }
}

/** Contacto: recibe las piezas ya armadas por contact() (acts, info, form, head). */
export function contactVariant(kind, g, s, id, p) {
  const infoUl = p.info.length ? `<ul class="info-list">${p.info.map(([i, k, v]) => `<li>${i}<span><strong>${esc(k)}</strong>${v}</span></li>`).join('')}</ul>` : '';
  const acts = p.acts.length ? `<div class="contact-actions">${p.acts.join('')}</div>` : '';
  switch (kind) {
    case 'band':
      return wrap(s, id, `${p.head}<div class="c-band">${acts}</div><div class="c-band-grid">${infoUl}${p.form}</div>`, 'c-banded');
    case 'floating':
      return wrap(s, id, `${p.head}<div class="c-float"><div class="c-card c-card-a">${acts}${infoUl}</div><div class="c-card c-card-b">${p.form}</div></div>`, 'c-floated');
    default:
      return null;
  }
}

function about(g, s, id, kind) {
  if (kind !== 'statement') return null;
  const c = s.content || {};
  let body = paras(c.text ?? c.body ?? c.paragraphs ?? c.description);
  if (!body.length) body = paras(g.description);
  if (!body.length) return null;
  const points = (arr(c.highlights).length ? arr(c.highlights) : arr(c.items)).map(str).filter(Boolean).slice(0, 5);
  const title = pick(c, 'title', 'heading', 'headline') || `Conocé ${g.name}`;
  const rest = body.slice(1);
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Sobre nosotros', title, '')}<div class="a-statement"><p class="a-big">${esc(body[0])}</p>${rest.length || points.length ? `<div class="a-more">${rest.map((p) => `<p>${esc(p)}</p>`).join('')}${points.length ? `<ul class="check-list">${points.map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('')}</ul>` : ''}</div>` : ''}</div>`, 'a-statemented');
}

const VARIANTS = { services, benefits, testimonials, hours, faq, about };

/** Renderiza la variante elegida; devuelve null si no hay (o no aplica) y se usa el render clásico. */
export function sectionVariant(g, section, id) {
  const fn = VARIANTS[section.type];
  const kind = g.plan && g.plan.sections ? g.plan.sections[section.type] : null;
  if (!fn || !kind) return null;
  return fn(g, section, id, kind);
}
