// Iconos SVG inline (trazo, 24x24). Sin dependencias.
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  heart: '<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8.4 7 10 4-1.6 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-7 10-9"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.7 2.7-2.4-.6-.6-2.4z"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
  thumb: '<path d="M7 11v9H3v-9z"/><path d="M7 11l4-8c1.5 0 2.5 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.3l-1.2 7a2 2 0 0 1-2 1.7H7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
  whatsapp: '<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2.1-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2.1z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  quote: '<path d="M9 7H5v6h4v4l3-4V7zM19 7h-4v6h4v4l3-4V7z" transform="translate(-2 0)"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8 20 18M8.5 16 20 6"/>',
  cup: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',
  paw: '<circle cx="6" cy="11" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14" cy="6.5" r="2"/><circle cx="18" cy="11" r="2"/><path d="M12 12c-3 0-5 3-5 5.2 0 1.6 1.4 2.3 3 2 .7-.2 1.4-.3 2-.3s1.3.1 2 .3c1.6.3 3-.4 3-2C17 15 15 12 12 12z"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>'
};

const KEYWORDS = [
  [/(rapid|veloc|urgen|inmediat|express|ya\b)/i, 'bolt'],
  [/(precio|econom|costo|presupuesto|pago|cuota|barato|valor)/i, 'wallet'],
  [/(garant|segur|confian|calidad certif|protec)/i, 'shield'],
  [/(experien|a[nñ]os|trayect|profesional|premi|certific)/i, 'award'],
  [/(natural|org[aá]nic|ecol|vegano|sustent|fresc|casero|artesanal)/i, 'leaf'],
  [/(equipo|atenci[oó]n|personaliz|cercan|familia|trato)/i, 'users'],
  [/(env[ií]o|entrega|delivery|domicilio|reparto)/i, 'truck'],
  [/(horario|disponib|24|turno|reserva)/i, 'calendar'],
  [/(ubicaci|local|zona|barrio|cerca)/i, 'pin'],
  [/(amor|cuid|pasi[oó]n|cari[nñ]o|bienestar|salud)/i, 'heart'],
  [/(herramient|t[eé]cnic|repar|instal|mantenim)/i, 'tools'],
  [/(hogar|casa|vivienda|propiedad)/i, 'home'],
  [/(mascota|perro|gato|veterin)/i, 'paw'],
  [/(caf[eé]|desayuno|merienda|bebida)/i, 'cup'],
  [/(corte|peluquer|barber|estilo)/i, 'scissors'],
  [/(foto|imagen|video)/i, 'camera'],
  [/(nuev|moderno|innov|exclusiv|premium|[uú]nico|especial)/i, 'sparkle']
];
const ROTATION = ['sparkle', 'shield', 'heart', 'bolt', 'award', 'users', 'leaf', 'thumb'];

export function iconFor(text, index = 0, explicit = '') {
  const e = String(explicit || '').toLowerCase().trim();
  if (e && P[e]) return e;
  for (const [re, name] of KEYWORDS) if (re.test(String(text || ''))) return name;
  return ROTATION[index % ROTATION.length];
}

export function icon(name, cls = '') {
  return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.check}</svg>`;
}
export const hasIcon = (n) => Boolean(P[n]);
