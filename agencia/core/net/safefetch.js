// safeFetch: GET http(s) con protección SSRF obligatoria. Cero dependencias (fetch/dns/net built-in).
// Política: solo http/https, sin credenciales en la URL, puertos 80/443/8080/8443, el host se resuelve con
// dns.lookup(all:true) y se BLOQUEA si ALGUNA dirección es no pública (loopback, privadas, link-local/metadata,
// CGNAT, 0.0.0.0, multicast, ::1, fc00::/7, fe80::/10, IPv4 mapeada/embebida en IPv6). Cada redirección se
// valida a mano (redirect:'manual') con la misma política. Los mensajes de error NO reflejan IPs ni URLs.
// Limitación conocida: entre el lookup de validación y el connect de fetch podría haber DNS rebinding
// (fetch nativo no permite fijar la IP sin dependencias); se mitiga validando también cada redirección.
import dns from 'node:dns';
import net from 'node:net';

export const USER_AGENT = 'AgenciaIA-Auditor/1.0';
const ALLOWED_PORTS = new Set(['80', '443', '8080', '8443']);
const DEFAULT_ACCEPT = 'text/html,application/xhtml+xml';

export class SafeFetchError extends Error {
  constructor(code, message) { super(message); this.name = 'SafeFetchError'; this.code = code; }
}
const fail = (code, msg) => { throw new SafeFetchError(code, msg); };

function blockedV4(oct) {
  const [a, b, c] = oct;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;                 // link-local + metadata cloud
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;      // CGNAT
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true;    // benchmarking
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;                               // multicast, reservadas, broadcast
  return false;
}

function parseV6(ip) {
  let s = ip.toLowerCase().split('%')[0];
  const tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const o = tail[1].split('.').map(Number);
    s = s.slice(0, -tail[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }
  const parts = s.split('::');
  if (parts.length > 2) return null;
  const h = parts[0] ? parts[0].split(':') : [];
  const r = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  let groups;
  if (parts.length === 1) groups = h;
  else groups = [...h, ...Array(Math.max(0, 8 - h.length - r.length)).fill('0'), ...r];
  if (groups.length !== 8) return null;
  const nums = groups.map((g) => parseInt(g, 16));
  return nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff) ? null : nums;
}

/** true si la IP (v4 o v6) NO es pública y por lo tanto está prohibida. */
export function isBlockedIP(ip) {
  const fam = net.isIP(ip);
  if (fam === 4) return blockedV4(ip.split('.').map(Number));
  if (fam !== 6) return true; // lo que no podemos interpretar, se bloquea
  const g = parseV6(ip);
  if (!g) return true;
  const v4of = (hi, lo) => [hi >> 8, hi & 255, lo >> 8, lo & 255];
  if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 0 || g[7] === 1)) return true; // :: y ::1
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return blockedV4(v4of(g[6], g[7])); // mapeada / compatible
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return blockedV4(v4of(g[6], g[7])); // NAT64
  if (g[0] === 0x2002) return blockedV4(v4of(g[1], g[2]));                 // 6to4
  if ((g[0] & 0xfe00) === 0xfc00) return true;                             // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true;                             // fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true;                             // site-local
  if ((g[0] & 0xff00) === 0xff00) return true;                             // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;                     // documentación
  return false;
}

const BAD_HOST = /(^|\.)(localhost|local|internal|localdomain|lan|home\.arpa)$/;
const BLOCKED_MSG = 'Destino no permitido (red interna o privada).';

export async function assertPublic(u, lookup) {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') fail('PROTOCOL', 'Solo se permiten URLs http o https.');
  if (u.username || u.password) fail('CREDENTIALS', 'La URL no puede incluir usuario ni contraseña.');
  if (u.port && !ALLOWED_PORTS.has(u.port)) fail('PORT', 'Puerto no permitido (solo 80, 443, 8080 y 8443).');
  const host = u.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!host) fail('HOST', 'URL sin host.');
  if (BAD_HOST.test(host)) fail('BLOCKED', BLOCKED_MSG);
  if (net.isIP(host)) {
    if (isBlockedIP(host)) fail('BLOCKED', BLOCKED_MSG);
    return;
  }
  let addrs;
  try { addrs = await lookup(host, { all: true }); } catch { fail('DNS', 'No se pudo resolver el dominio.'); }
  if (!Array.isArray(addrs)) addrs = addrs ? [addrs] : [];
  if (!addrs.length) fail('DNS', 'No se pudo resolver el dominio.');
  for (const a of addrs) {
    if (isBlockedIP(typeof a === 'string' ? a : a.address)) fail('BLOCKED', BLOCKED_MSG);
  }
}

function headersToObject(h) {
  const out = {};
  if (!h) return out;
  if (typeof h.forEach === 'function') h.forEach((v, k) => { out[String(k).toLowerCase()] = String(v); });
  else for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = String(v);
  if (typeof h.getSetCookie === 'function') {
    const sc = h.getSetCookie();
    if (sc && sc.length) out['set-cookie'] = sc.join('\n');
  }
  return out;
}

async function readLimited(res, maxBytes, race) {
  const chunks = [];
  let total = 0, truncated = false;
  const body = res.body;
  if (body && typeof body.getReader === 'function') {
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await race(reader.read());
        if (done) break;
        const room = maxBytes - total;
        if (value.length > room) {
          if (room > 0) chunks.push(value.subarray(0, room));
          total += Math.max(room, 0);
          truncated = true;
          break;
        }
        chunks.push(value); total += value.length;
      }
    } finally { try { await reader.cancel(); } catch { /* ya cerrado */ } }
  } else {
    const buf = typeof res.arrayBuffer === 'function'
      ? Buffer.from(await race(res.arrayBuffer()))
      : Buffer.from(String(await race(res.text())), 'utf8');
    truncated = buf.length > maxBytes;
    chunks.push(buf.subarray(0, maxBytes)); total = Math.min(buf.length, maxBytes);
  }
  return { buf: Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))), truncated, total };
}

/**
 * safeFetch(url, { maxBytes, timeoutMs, maxRedirects, accept, lookup, fetchImpl })
 * -> { url, finalUrl, status, headers, body, bytes, truncated, redirects:[{status,to}], ms }
 * `accept`: lista separada por comas de content-types permitidos (prefijo "tipo/*" admitido).
 */
export async function safeFetch(url, { maxBytes = 3e6, timeoutMs = 10000, maxRedirects = 5, accept = DEFAULT_ACCEPT, lookup, fetchImpl } = {}) {
  const t0 = Date.now();
  const doLookup = lookup || ((h, o) => dns.promises.lookup(h, o));
  const doFetch = fetchImpl || globalThis.fetch;
  const ac = new AbortController();
  let timer;
  const deadline = new Promise((_, rej) => {
    timer = setTimeout(() => { ac.abort(); rej(new SafeFetchError('TIMEOUT', 'Tiempo de espera agotado al descargar el sitio.')); }, timeoutMs);
  });
  deadline.catch(() => {});
  const race = (p) => Promise.race([p, deadline]);
  try {
    let u;
    try { u = new URL(String(url)); } catch { fail('URL', 'URL inválida.'); }
    const startUrl = u.href;
    const redirects = [];
    const allowed = String(accept).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (let hop = 0; ; hop++) {
      await race(assertPublic(u, doLookup));
      let res;
      try {
        res = await race(doFetch(u.href, {
          method: 'GET', redirect: 'manual', signal: ac.signal,
          headers: { 'user-agent': USER_AGENT, accept: `${allowed.join(',')},*/*;q=0.1`, 'accept-language': 'es,en;q=0.8' },
        }));
      } catch (e) {
        if (e instanceof SafeFetchError) throw e;
        fail('NETWORK', 'No se pudo conectar con el sitio.');
      }
      const status = res.status;
      const loc = res.headers ? (res.headers.get ? res.headers.get('location') : res.headers.location) : null;
      if (status >= 300 && status < 400 && loc) {
        try { res.body?.cancel?.(); } catch { /* nada */ }
        if (hop >= maxRedirects) fail('REDIRECTS', 'Demasiadas redirecciones.');
        let next;
        try { next = new URL(loc, u); } catch { fail('REDIRECT', 'Redirección inválida.'); }
        redirects.push({ status, to: next.href });
        u = next;
        continue; // se revalida con assertPublic al inicio del ciclo
      }
      const headers = headersToObject(res.headers);
      const ct = (headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ok = allowed.some((a) => ct === a || (a.endsWith('/*') && ct.startsWith(a.slice(0, -1))));
      if (ct && !ok && status !== 204 && status !== 304) {
        try { res.body?.cancel?.(); } catch { /* nada */ }
        fail('CONTENT_TYPE', 'El contenido no es del tipo esperado (se rechazan binarios y otros formatos).');
      }
      let read;
      try { read = await readLimited(res, maxBytes, race); } catch (e) {
        if (e instanceof SafeFetchError) throw e;
        fail('NETWORK', 'Se cortó la descarga del sitio.');
      }
      return {
        url: startUrl, finalUrl: u.href, status, headers,
        body: read.buf.toString('utf8'), bytes: read.total, truncated: read.truncated,
        redirects, ms: Date.now() - t0,
      };
    }
  } finally { clearTimeout(timer); }
}

export default { safeFetch, isBlockedIP, SafeFetchError };
