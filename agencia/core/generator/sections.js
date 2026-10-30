// Renderers de secciones. Todo texto del cliente pasa por esc().
import { esc, str, arr, pick, paras, slug, safeUrl } from './util.js';
import { icon, iconFor } from './icons.js';
import { navItems } from './context.js';
import { heroBg, conceptTag } from './motifs.js';
import { heroVariant, sectionVariant, contactVariant } from './layouts.js';

export const btn = (href, label, cls = 'btn-primary', ico = '', external = false) =>
  `<a class="btn ${cls}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${ico}<span>${esc(label)}</span></a>`;

export function head(id, eyebrow, title, lead) {
  return `<header class="sec-head">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h2 id="${esc(id)}-t">${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</header>`;
}

export function wrap(section, id, inner, extraCls = '') {
  return `<section id="${esc(id)}" class="section s-${esc(section.type)}${extraCls ? ' ' + extraCls : ''}" aria-labelledby="${esc(id)}-t">\n<div class="container">\n${inner}\n</div>\n</section>`;
}

export function itemsOf(content, ...keys) {
  for (const k of keys) {
    const v = content?.[k];
    if (Array.isArray(v) && v.length) return v;
  }
  return [];
}

/** Hora/horarios: acepta string "Lun a Vie 9-18; Sáb 9-13" o lista. */
export function parseHours(text) {
  const parts = str(text).split(/\s*(?:;|\n|\||·)\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => {
    const m = /^(.{2,40}?)\s*[:\-–]\s*(\d.*|cerrado.*)$/i.exec(p) || /^([A-Za-zÁÉÍÓÚáéíóúñ .]+?)\s+(\d.*|cerrado.*)$/i.exec(p);
    return m ? { day: m[1].trim(), hours: m[2].trim() } : { day: '', hours: p };
  });
}

// Titular cinético: cada palabra (y en 'extremo' cada letra) lleva su índice para escalonar la entrada con CSS.
// El texto sigue siendo el mismo y legible sin JS ni animaciones.
export function kinetic(headline, g) {
  if (g.boldness === 'sobrio' && g.theme.style !== 'futurista') return esc(headline);
  const letters = g.boldness === 'extremo';
  return headline.split(/\s+/).filter(Boolean).map((w, i) => {
    const inner = letters ? Array.from(w).map((c, j) => `<span class="ch" style="--j:${j}">${esc(c)}</span>`).join('') : esc(w);
    return `<span class="w${letters ? ' wl' : ''}" style="--i:${i}">${inner}</span>`;
  }).join(' ');
}

/** <img> propio del cliente: ruta assets/ ya validada, alt siempre, width/height si se conocen, lazy salvo la primera. */
export function imgTag(im, { eager = false } = {}) {
  const wh = im.width && im.height ? ` width="${im.width}" height="${im.height}"` : '';
  return `<img src="${esc(im.file)}" alt="${esc(im.alt)}"${wh} ${eager ? 'decoding="async" fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
}

// ---------------- HERO ----------------
function hero(g, s, id) {
  const c = s.content || {};
  const headline = pick(c, 'headline', 'title', 'heading') || g.name;
  const sub = pick(c, 'subheadline', 'subtitle', 'subtitulo', 'text', 'description') || g.description;
  const ctaLabel = pick(c.cta, 'label') || pick(c, 'ctaLabel') || g.cta.label;
  const second = g.links.wa && g.cta.type !== 'whatsapp'
    ? btn(g.links.wa, 'WhatsApp', 'btn-ghost', icon('whatsapp'), true)
    : (g.links.tel && g.cta.type !== 'call' ? btn(g.links.tel, 'Llamar', 'btn-ghost', icon('phone')) : '');
  const badges = (arr(c.badges).map(str).filter(Boolean).length ? arr(c.badges).map(str) : g.differentiators).slice(0, 3);
  const info = [];
  if (g.contact.hours) info.push([icon('clock'), 'Horarios', g.contact.hours]);
  if (g.contact.address) info.push([icon('pin'), 'Dónde estamos', g.contact.address]);
  if (g.contact.phone) info.push([icon('phone'), 'Teléfono', g.contact.phone]);
  const photo = g.images && g.images[0] ? imgTag(g.images[0], { eager: true, cls: '' }) : '';
  const photoFig = photo ? `<figure class="hero-photo">${photo}</figure>` : '';
  const card = photo
    ? `<aside class="hero-card has-photo" aria-label="${esc(g.name)}">${photoFig}${info.length ? `<ul>${info.slice(0, 3).map(([i, k, v]) => `<li>${i}<span><strong>${esc(k)}</strong>${esc(v)}</span></li>`).join('')}</ul>` : ''}</aside>`
    : info.length
    ? `<aside class="hero-card" aria-label="Datos del negocio"><p class="hero-card-title">${esc(g.name)}</p><ul>${info.slice(0, 3).map(([i, k, v]) => `<li>${i}<span><strong>${esc(k)}</strong>${esc(v)}</span></li>`).join('')}</ul></aside>`
    : `<aside class="hero-card hero-mark" aria-hidden="true"><span>${esc(g.name.trim().charAt(0).toUpperCase())}</span></aside>`;
  if (g.plan && g.plan.hero !== 'split') {
    const cta = btn(g.cta.href, ctaLabel, 'btn-primary', g.cta.type === 'whatsapp' ? icon('whatsapp') : g.cta.type === 'call' ? icon('phone') : icon('arrow'), g.cta.external);
    const v = heroVariant(g.plan.hero, g, id, { headline, sub, cta, second, badges, info, photo: photoFig, bg: heroBg(g) });
    if (v) return v;
  }
  return `<section id="${esc(id)}" class="section hero" data-hero="${esc(g.theme.style)}" aria-labelledby="${esc(id)}-t">
${heroBg(g)}
<div class="container hero-grid">
<div class="hero-copy">
${g.sector ? `<p class="eyebrow">${esc(g.sector)}</p>` : ''}
<h1 id="${esc(id)}-t">${kinetic(headline, g)}</h1>
${sub ? `<p class="lead">${esc(sub)}</p>` : ''}
<div class="hero-actions">${btn(g.cta.href, ctaLabel, 'btn-primary', g.cta.type === 'whatsapp' ? icon('whatsapp') : g.cta.type === 'call' ? icon('phone') : icon('arrow'), g.cta.external)}${second}</div>
${badges.length ? `<ul class="hero-badges">${badges.map((b) => `<li>${icon('check')}<span>${esc(b)}</span></li>`).join('')}</ul>` : ''}
</div>
${card}
${conceptTag(g)}
</div>
</section>`;
}

// ---------------- ABOUT ----------------
function about(g, s, id) {
  const c = s.content || {};
  const title = pick(c, 'title', 'heading', 'headline') || `Conocé ${g.name}`;
  let body = paras(c.text ?? c.body ?? c.paragraphs ?? c.description);
  if (!body.length) body = paras(g.description);
  const points = (arr(c.highlights).length ? arr(c.highlights) : arr(c.items)).map(str).filter(Boolean).slice(0, 5);
  const inner = `<div class="about-grid">
<div class="about-copy">${head(id, pick(c, 'eyebrow') || 'Sobre nosotros', title, '')}${body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
<div class="about-side">${points.length ? `<ul class="check-list">${points.map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('')}</ul>` : `<div class="about-mark" aria-hidden="true">${icon('sparkle')}</div>`}</div>
</div>`;
  return wrap(s, id, inner);
}

// ---------------- SERVICES ----------------
function services(g, s, id) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'services', 'list').map((i) => (typeof i === 'string' ? { name: i } : i));
  const seen = new Set(items.map((i) => slug(pick(i, 'name', 'title'))));
  for (const sv of g.services) {
    const k = slug(sv.name);
    if (!seen.has(k)) { items.push(sv); seen.add(k); }
  }
  const title = pick(c, 'title', 'heading') || 'Nuestros servicios';
  const lead = pick(c, 'intro', 'subtitle', 'lead', 'text');
  const cards = items.map((it, i) => {
    const name = pick(it, 'name', 'title');
    const desc = pick(it, 'description', 'text', 'desc');
    const price = pick(it, 'price', 'precio');
    return `<li class="card reveal" style="--d:${i % 6}"><span class="card-ico">${icon(iconFor(name + ' ' + desc, i, it.icon))}</span><h3>${esc(name)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}${price ? `<p class="price">${esc(price)}</p>` : ''}</li>`;
  }).join('\n');
  const cta = items.length ? `<p class="sec-cta">${btn(g.cta.href, g.cta.label, 'btn-primary', icon('arrow'), g.cta.external)}</p>` : '';
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Lo que hacemos', title, lead)}<ul class="grid cards svc-bento" data-n="${items.length}"${items.length > 5 && items.length % 2 === 0 ? ' data-odd="1"' : ''}>${cards}</ul>${cta}`);
}

// ---------------- BENEFITS ----------------
function benefits(g, s, id) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'benefits', 'list').map((i) => (typeof i === 'string' ? { title: i } : i));
  if (!items.length) items = g.differentiators.map((d) => ({ title: d }));
  const title = pick(c, 'title', 'heading') || `Por qué elegir ${g.name}`;
  const lis = items.map((it, i) => {
    const t = pick(it, 'title', 'name');
    const d = pick(it, 'text', 'description');
    return `<li class="benefit reveal" style="--d:${i % 6}"><span class="benefit-ico">${icon(iconFor(t + ' ' + d, i, it.icon))}</span><div><h3>${esc(t)}</h3>${d ? `<p>${esc(d)}</p>` : ''}</div></li>`;
  }).join('\n');
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Nuestra diferencia', title, pick(c, 'intro', 'subtitle', 'lead'))}<ul class="grid benefits">${lis}</ul>`);
}

// ---------------- TESTIMONIALS ----------------
function testimonials(g, s, id) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'testimonials').map((t) => (typeof t === 'string' ? { text: t } : t));
  if (!items.length) items = g.testimonials;
  const title = pick(c, 'title', 'heading') || 'Lo que dicen nuestros clientes';
  if (!items.length) {
    return wrap(s, id, `${head(id, 'Opiniones', 'Tu experiencia cuenta', 'Probanos y contanos cómo te fue. Leemos todos los mensajes.')}<p class="sec-cta">${btn(g.cta.href, g.cta.label, 'btn-primary', icon('arrow'), g.cta.external)}</p>`);
  }
  const figs = items.map((t, i) => {
    const text = pick(t, 'text', 'quote');
    const who = pick(t, 'name', 'author');
    const role = pick(t, 'role', 'detail');
    return `<li class="reveal" style="--d:${i % 6}"><figure class="quote">${icon('quote', 'quote-ico')}<blockquote><p>${esc(text)}</p></blockquote><figcaption><span class="avatar" aria-hidden="true">${esc(who.charAt(0).toUpperCase() || '·')}</span><span><strong>${esc(who)}</strong>${role ? `<small>${esc(role)}</small>` : ''}</span></figcaption></figure></li>`;
  }).join('\n');
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Opiniones', title, '')}<ul class="grid quotes">${figs}</ul>`);
}

// ---------------- GALLERY ----------------
function gallery(g, s, id) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'images', 'gallery').map((i) => (typeof i === 'string' ? { caption: i } : i));
  if (!items.length) items = g.services.slice(0, 6).map((sv) => ({ caption: sv.name }));
  const title = pick(c, 'title', 'heading') || 'Galería';
  // fotos del cliente: la primera va al hero (eager); el resto a la galeria (lazy). Sin fotos, se mantiene el diseño de siempre.
  const own = (g.images || []).slice(1, 10);
  const ownTiles = own.map((im, i) => `<li class="tile reveal" style="--d:${i % 6}"><figure>${imgTag(im)}</figure></li>`);
  const tiles = ownTiles.length ? ownTiles.join('\n') : items.slice(0, 9).map((it, i) => {
    const cap = pick(it, 'caption', 'alt', 'title', 'name');
    const src = safeUrl(pick(it, 'src', 'image', 'url'));
    const inner = src
      ? `<img src="${esc(src)}" alt="${esc(cap || g.name)}" loading="lazy" decoding="async">`
      : `<div class="tile-art t${i % 5}" role="img" aria-label="${esc(cap || g.name)}">${icon(iconFor(cap, i))}</div>`;
    return `<li class="tile reveal" style="--d:${i % 6}"><figure>${inner}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure></li>`;
  }).join('\n');
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Mirá nuestro trabajo', title, pick(c, 'intro', 'lead'))}<ul class="grid gallery">${tiles}</ul>`);
}

// ---------------- HOURS ----------------
function hours(g, s, id) {
  const c = s.content || {};
  let rows = itemsOf(c, 'items', 'hours', 'schedule').map((r) => (typeof r === 'string' ? parseHours(r)[0] : { day: pick(r, 'day', 'dia'), hours: pick(r, 'hours', 'time', 'horario') }));
  if (!rows.length) rows = parseHours(g.contact.hours);
  const title = pick(c, 'title', 'heading') || 'Horarios de atención';
  const list = rows.length
    ? `<dl class="hours-list">${rows.map((r) => `<div class="hours-row">${r.day ? `<dt>${esc(r.day)}</dt>` : '<dt>Horario</dt>'}<dd>${esc(r.hours)}</dd></div>`).join('')}</dl>`
    : `<p>Consultanos por WhatsApp o teléfono para coordinar tu horario.</p>`;
  const side = `<div class="hours-side">${icon('clock', 'big-ico')}${g.contact.address ? `<p><strong>Estamos en</strong><br>${esc(g.contact.address)}</p>` : ''}${g.links.map ? btn(g.links.map, 'Cómo llegar', 'btn-ghost', icon('pin'), true) : ''}</div>`;
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Cuándo visitarnos', title, '')}<div class="hours-grid">${list}${side}</div>`);
}

// ---------------- FAQ ----------------
function faq(g, s, id) {
  const c = s.content || {};
  let items = itemsOf(c, 'items', 'faqs', 'questions').map((i) => ({ q: pick(i, 'q', 'question', 'pregunta'), a: pick(i, 'a', 'answer', 'respuesta') })).filter((i) => i.q);
  if (!items.length) {
    if (g.contact.hours) items.push({ q: '¿Cuáles son los horarios de atención?', a: g.contact.hours });
    if (g.contact.address) items.push({ q: '¿Dónde están ubicados?', a: g.contact.address });
    items.push({ q: '¿Cómo puedo contactarlos?', a: [g.contact.whatsapp && `WhatsApp ${g.contact.whatsapp}`, g.contact.phone && `teléfono ${g.contact.phone}`, g.contact.email].filter(Boolean).join(', ') || 'Usá el formulario de contacto de esta página.' });
  }
  const title = pick(c, 'title', 'heading') || 'Preguntas frecuentes';
  const dets = items.map((i, n) => `<details class="faq-item reveal" style="--d:${n % 6}"><summary><span>${esc(i.q)}</span>${icon('chevron', 'faq-chev')}</summary><div class="faq-a"><p>${esc(i.a)}</p></div></details>`).join('\n');
  return wrap(s, id, `${head(id, pick(c, 'eyebrow') || 'Dudas', title, '')}<div class="faq-list">${dets}</div>`);
}

// ---------------- CONTACT ----------------
function contact(g, s, id) {
  const c = s.content || {};
  const title = pick(c, 'title', 'heading') || 'Contactanos';
  const lead = pick(c, 'text', 'subtitle', 'intro', 'lead') || 'Escribinos y te respondemos a la brevedad.';
  const acts = [];
  if (g.links.wa) acts.push(btn(g.links.wa, 'Escribir por WhatsApp', 'btn-wa', icon('whatsapp'), true));
  if (g.links.tel) acts.push(btn(g.links.tel, 'Llamar', 'btn-primary', icon('phone')));
  if (g.links.map) acts.push(btn(g.links.map, 'Cómo llegar', 'btn-ghost', icon('pin'), true));
  const info = [];
  if (g.contact.phone) info.push([icon('phone'), 'Teléfono', `<a href="${esc(g.links.tel || '#')}">${esc(g.contact.phone)}</a>`]);
  if (g.contact.email) info.push([icon('mail'), 'Email', `<a href="${esc(g.links.mail)}">${esc(g.contact.email)}</a>`]);
  if (g.contact.address) info.push([icon('pin'), 'Dirección', esc(g.contact.address)]);
  if (g.contact.hours) info.push([icon('clock'), 'Horarios', esc(g.contact.hours)]);
  if (g.links.ig) info.push([icon('instagram'), 'Instagram', `<a href="${esc(g.links.ig)}" target="_blank" rel="noopener noreferrer">${esc(g.contact.instagram)}</a>`]);
  const hasWa = Boolean(g.wa);
  const hasMail = Boolean(g.contact.email);
  const submits = [
    hasWa ? `<button class="btn btn-wa" type="submit" data-channel="wa">${icon('whatsapp')}<span>Enviar por WhatsApp</span></button>` : '',
    hasMail ? `<button class="btn ${hasWa ? 'btn-ghost' : 'btn-primary'}" type="submit" data-channel="mail">${icon('mail')}<span>Enviar por email</span></button>` : '',
    !hasWa && !hasMail ? `<button class="btn btn-primary" type="submit" data-channel="none">${icon('arrow')}<span>Enviar consulta</span></button>` : ''
  ].join('');
  const form = `<form class="form" id="${esc(id)}-form" data-wa="${esc(g.wa)}" data-mail="${esc(g.contact.email)}" data-biz="${esc(g.name)}" ${hasMail && !hasWa ? `action="${esc(g.links.mail)}" method="post" enctype="text/plain"` : 'action="#" method="get"'} novalidate>
<h3>Mandanos tu consulta</h3>
<div class="field"><label for="${esc(id)}-n">Tu nombre</label><input id="${esc(id)}-n" name="nombre" type="text" autocomplete="name" required></div>
<div class="field"><label for="${esc(id)}-c">Teléfono o email</label><input id="${esc(id)}-c" name="contacto" type="text" autocomplete="email" required></div>
<div class="field"><label for="${esc(id)}-m">Mensaje</label><textarea id="${esc(id)}-m" name="mensaje" rows="4" required></textarea></div>
<div class="form-actions">${submits}</div>
<p class="form-note" role="status" aria-live="polite" data-status>Al enviar se abre tu app de ${hasWa ? 'WhatsApp' : 'correo'} con el mensaje listo. No guardamos tus datos.</p>
</form>`;
  const hd = head(id, pick(c, 'eyebrow') || 'Hablemos', title, lead);
  if (g.plan && g.plan.sections.contact !== 'split') {
    const v = contactVariant(g.plan.sections.contact, g, s, id, { head: hd, acts, info, form });
    if (v) return v;
  }
  const inner = `${hd}
<div class="contact-grid">
<div class="contact-info">${acts.length ? `<div class="contact-actions">${acts.join('')}</div>` : ''}${info.length ? `<ul class="info-list">${info.map(([i, k, v]) => `<li>${i}<span><strong>${esc(k)}</strong>${v}</span></li>`).join('')}</ul>` : ''}</div>
${form}
</div>`;
  return wrap(s, id, inner);
}

// ---------------- FOOTER ----------------
function footer(g, s, id) {
  const nav = navItems(g);
  const soc = [];
  if (g.links.ig) soc.push(`<a href="${esc(g.links.ig)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram de ${esc(g.name)}">${icon('instagram')}</a>`);
  if (g.links.wa) soc.push(`<a href="${esc(g.links.wa)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de ${esc(g.name)}">${icon('whatsapp')}</a>`);
  if (g.links.mail) soc.push(`<a href="${esc(g.links.mail)}" aria-label="Email de ${esc(g.name)}">${icon('mail')}</a>`);
  return `<footer id="${esc(id)}" class="site-footer">
<div class="container foot-grid">
<div><p class="foot-brand">${esc(g.name)}</p>${g.description ? `<p class="foot-desc">${esc(g.description.slice(0, 180))}</p>` : ''}${soc.length ? `<p class="foot-social">${soc.join('')}</p>` : ''}</div>
${nav.length ? `<nav aria-label="Pie de página"><p class="foot-title">Secciones</p><ul>${nav.map((n) => `<li><a href="#${esc(n.id)}">${esc(n.label)}</a></li>`).join('')}</ul></nav>` : ''}
<div><p class="foot-title">Contacto</p><ul class="foot-contact">${g.contact.phone ? `<li><a href="${esc(g.links.tel || '#')}">${esc(g.contact.phone)}</a></li>` : ''}${g.contact.email ? `<li><a href="${esc(g.links.mail)}">${esc(g.contact.email)}</a></li>` : ''}${g.contact.address ? `<li>${esc(g.contact.address)}</li>` : ''}${g.contact.hours ? `<li>${esc(g.contact.hours)}</li>` : ''}</ul></div>
</div>
<div class="container foot-base"><p>&copy; ${g.year} ${esc(g.name)}. Todos los derechos reservados.</p></div>
</footer>`;
}

const RENDERERS = { hero, about, services, benefits, testimonials, gallery, hours, faq, contact, footer };

export function renderSection(g, section) {
  const id = slug(section.id || section.type);
  const fn = RENDERERS[section.type] || about;
  let html = (g.plan && sectionVariant(g, section, id)) || fn(g, section, id);
  if (g.plan && g.plan.invert === section.type && section.type !== 'hero') html = html.replace('class="section ', 'class="section inv ');
  return html;
}
