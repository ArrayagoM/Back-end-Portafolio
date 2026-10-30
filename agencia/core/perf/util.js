// Utilidades compartidas del agente de rendimiento (Lucho). Cero dependencias: solo zlib/crypto de Node.
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

export const bytes = (s) => Buffer.byteLength(String(s ?? ''), 'utf8');
export const gzipBytes = (s) => zlib.gzipSync(Buffer.from(String(s ?? ''), 'utf8'), { level: 9 }).length;
export const brotliBytes = (s) => zlib.brotliCompressSync(Buffer.from(String(s ?? ''), 'utf8'), {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 },
}).length;
export const hash8 = (s) => createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex').slice(0, 8);

/** Mapa {ruta: string} sin 'partials/…' ni valores no string. */
export function deliverable(files) {
  const out = {};
  for (const [k, v] of Object.entries(files || {})) if (!k.startsWith('partials/') && typeof v === 'string') out[k] = v;
  return out;
}

/** Copia el mapa completo (incluye partials y valores raros: se pasan tal cual). */
export function cloneMap(files) { return { ...(files || {}) }; }

/** Archivos que NO pesan en la carga de la página (metadatos del hosting / SEO). */
export const isMetaFile = (p) => p === '_headers' || p === '_redirects' || p === 'robots.txt' || p === 'sitemap.xml';

export const isExternalUrl = (u) => /^(https?:)?\/\//i.test(String(u || '').trim());
export const isDataUrl = (u) => /^data:/i.test(String(u || '').trim());
export const isSpecialUrl = (u) => /^(mailto|tel|javascript|sms|#)/i.test(String(u || '').trim());

/** Ruta local normalizada (sin ?query, #hash, ./ ni /inicial) o null si es externa/data. */
export function localPath(u) {
  const s = String(u ?? '').trim();
  if (!s || isExternalUrl(s) || isDataUrl(s) || isSpecialUrl(s)) return null;
  return s.split(/[?#]/)[0].replace(/^\.\//, '').replace(/^\//, '');
}

export const kb = (n) => Math.round((n / 1024) * 10) / 10;

/** Quita el versionado ?v=hash (para comparar referencias antes/después). */
export function stripVersion(u) {
  return String(u ?? '').replace(/([?&])v=[0-9a-f]{6,16}(?=&|#|$)/i, '$1').replace(/[?&]$/, '').replace(/\?&/, '?');
}

/** Estilo de salida de las comparaciones: primer elemento distinto. */
export function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return `#${i}: «${String(a[i] ?? '(nada)').slice(0, 90)}» ≠ «${String(b[i] ?? '(nada)').slice(0, 90)}»`;
  return '';
}
