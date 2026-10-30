// Assets del cliente (logo e imagenes) por proyecto: <projectDir>/assets/. Validacion por MAGIC BYTES, nunca por mime/extension del cliente.
// Cero dependencias. Los SVG solo se aceptan si sanitizeSvg() los acepta y se guardan YA SANEADOS.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { projectDir } from './store.js';
import { sanitizeSvg } from './agents/logo.js';

export const MAX_ASSET_BYTES = 2.5 * 1024 * 1024;
export const MAX_ASSETS = 8;
export const KINDS = ['logo', 'image'];
export const ASSET_FILE_RE = /^[a-f0-9]{12}\.(png|jpg|webp|gif|svg)$/;
export const ASSET_ID_RE = /^[a-f0-9]{12}$/;
export const SITE_ASSET_RE = /^assets\/[a-f0-9]{12}\.(png|jpg|webp|gif|svg)$/;
export const EXT_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

export class AssetError extends Error {
  constructor(status, message) { super(message); this.status = status; this.name = 'AssetError'; }
}

const assetsDir = (projectId) => path.join(projectDir(projectId), 'assets');
const indexFile = (projectId) => path.join(assetsDir(projectId), 'index.json');

function readIndex(projectId) {
  try {
    const arr = JSON.parse(fs.readFileSync(indexFile(projectId), 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeIndex(projectId, list) {
  fs.mkdirSync(assetsDir(projectId), { recursive: true });
  const tmp = indexFile(projectId) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
  fs.renameSync(tmp, indexFile(projectId));
}

/** Tipo real por magic bytes -> { ext, mime } | null. El SVG se detecta aparte (necesita sanitizar). */
export function sniffRaster(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: EXT_MIME.png };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: EXT_MIME.jpg };
  if (buf.length >= 6 && (buf.toString('latin1', 0, 6) === 'GIF87a' || buf.toString('latin1', 0, 6) === 'GIF89a')) return { ext: 'gif', mime: EXT_MIME.gif };
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { ext: 'webp', mime: EXT_MIME.webp };
  return null;
}

/** Dimensiones (best effort) para width/height del <img>; null si no se pueden leer. */
export function imageSize(buf, ext) {
  try {
    if (ext === 'png' && buf.length >= 24) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (ext === 'gif' && buf.length >= 10) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (ext === 'jpg') {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
      return null;
    }
    if (ext === 'webp' && buf.length >= 30) {
      const t = buf.toString('latin1', 12, 16);
      if (t === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (t === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
    }
    if (ext === 'svg') {
      const m = /viewBox="\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*"/.exec(buf.toString('utf8', 0, 600));
      if (m && +m[1] > 0 && +m[2] > 0) return { width: Math.round(+m[1]), height: Math.round(+m[2]) };
    }
  } catch { /* sin dimensiones */ }
  return null;
}

const cleanLabel = (s, max = 80) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>"'`&]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const HEX = /^#[0-9a-f]{6}$/i;

const publicView = (projectId, a) => ({
  id: a.id, name: a.name, kind: a.kind, mime: a.mime, bytes: a.bytes,
  url: `/api/projects/${projectId}/assets/${a.file}`,
  ...(a.colors?.length ? { colors: a.colors } : {}),
  ...(a.alt ? { alt: a.alt } : {}),
});

export function listAssets(projectId) {
  return readIndex(projectId).map((a) => publicView(projectId, a));
}
/** Registros internos (incluyen file/width/height). */
export function listAssetRecords(projectId) { return readIndex(projectId); }
export function getAssetRecord(projectId, id) {
  if (typeof id !== 'string' || !ASSET_ID_RE.test(id)) return null;
  return readIndex(projectId).find((a) => a.id === id) || null;
}

/** Lee los bytes de un asset por nombre de archivo (valida regex + indice => sin path traversal). */
export function readAssetFile(projectId, file) {
  if (typeof file !== 'string' || !ASSET_FILE_RE.test(file)) return null;
  const rec = readIndex(projectId).find((a) => a.file === file);
  if (!rec) return null;
  const full = path.join(assetsDir(projectId), file);
  try { return { rec, data: fs.readFileSync(full) }; } catch { return null; }
}

/** Valida y guarda un asset. Lanza AssetError(400|413|415|409). */
export function saveAsset(projectId, input = {}) {
  const kind = input.kind;
  if (!KINDS.includes(kind)) throw new AssetError(400, 'El campo "kind" debe ser "logo" o "image".');
  if (typeof input.data !== 'string' || !input.data) throw new AssetError(400, 'Falta "data" (el archivo en base64, sin prefijo data:).');
  let b64 = input.data.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!b64) throw new AssetError(400, 'El archivo esta vacio.');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 === 1) throw new AssetError(400, 'El contenido no es base64 valido.');
  // tamano estimado ANTES de decodificar
  const approx = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  if (approx > MAX_ASSET_BYTES) throw new AssetError(413, 'El archivo supera el maximo de 2,5 MB.');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw new AssetError(400, 'El archivo esta vacio.');
  if (buf.length > MAX_ASSET_BYTES) throw new AssetError(413, 'El archivo supera el maximo de 2,5 MB.');

  let ext; let mime; let out = buf;
  const raster = sniffRaster(buf);
  if (raster) ({ ext, mime } = raster);
  else {
    const head = buf.subarray(0, 4096).toString('utf8').replace(/^﻿/, '').trimStart();
    if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) {
      const clean = sanitizeSvg(buf.toString('utf8').replace(/^﻿/, ''));
      if (!clean) throw new AssetError(415, 'El SVG no es seguro o esta mal formado (no se permiten scripts, imagenes embebidas ni referencias externas).');
      ext = 'svg'; mime = EXT_MIME.svg; out = Buffer.from(clean, 'utf8');
    } else {
      throw new AssetError(415, 'Tipo de archivo no permitido. Solo PNG, JPEG, WebP, GIF o SVG.');
    }
  }
  // el mime declarado no manda, pero si miente sobre el contenido real lo rechazamos
  const declared = String(input.mime ?? '').toLowerCase().trim().replace('image/jpg', 'image/jpeg');
  if (declared && declared !== mime && declared !== 'application/octet-stream') {
    throw new AssetError(415, 'El contenido del archivo no coincide con el tipo declarado.');
  }
  if (out.length > MAX_ASSET_BYTES) throw new AssetError(413, 'El archivo supera el maximo de 2,5 MB.');

  const list = readIndex(projectId);
  if (list.length >= MAX_ASSETS) throw new AssetError(409, `Llegaste al maximo de ${MAX_ASSETS} archivos por proyecto. Borra alguno para subir otro.`);
  const colors = Array.isArray(input.colors) ? [...new Set(input.colors.filter((c) => typeof c === 'string' && HEX.test(c)).map((c) => c.toLowerCase()))].slice(0, 16) : [];
  const id = crypto.randomBytes(6).toString('hex');
  const file = `${id}.${ext}`;
  fs.mkdirSync(assetsDir(projectId), { recursive: true });
  fs.writeFileSync(path.join(assetsDir(projectId), file), out);
  const dims = imageSize(out, ext);
  const rec = {
    id, file, name: cleanLabel(input.name) || (kind === 'logo' ? 'logo' : 'imagen'), kind, mime, bytes: out.length,
    ...(colors.length ? { colors } : {}),
    ...(input.alt ? { alt: cleanLabel(input.alt, 140) } : {}),
    ...(dims && dims.width > 0 && dims.height > 0 ? { width: dims.width, height: dims.height } : {}),
  };
  list.push(rec);
  writeIndex(projectId, list);
  return publicView(projectId, rec);
}

export function updateAsset(projectId, id, patch = {}) {
  const list = readIndex(projectId);
  const rec = list.find((a) => a.id === id);
  if (!rec) return null;
  if (typeof patch.alt === 'string') rec.alt = cleanLabel(patch.alt, 140);
  if (typeof patch.name === 'string' && cleanLabel(patch.name)) rec.name = cleanLabel(patch.name);
  writeIndex(projectId, list);
  return publicView(projectId, rec);
}

export function deleteAsset(projectId, id) {
  if (typeof id !== 'string' || !ASSET_ID_RE.test(id)) return false;
  const list = readIndex(projectId);
  const i = list.findIndex((a) => a.id === id);
  if (i < 0) return false;
  const [rec] = list.splice(i, 1);
  try { fs.unlinkSync(path.join(assetsDir(projectId), rec.file)); } catch { /* ya no estaba */ }
  writeIndex(projectId, list);
  return true;
}

// ---------------------------------------------------------------- uso en el sitio

const FAVICON_ICON_OK = (s) => (typeof s === 'string' && s ? sanitizeSvg(s) : null);

/**
 * Aplica el logo elegido y las imagenes del cliente al brief (copia nueva).
 * - generado: applyLogoToBrief (no pisa colores del cliente) + icon para el favicon.
 * - subido: brief.logo = { kind:'uploaded', file:'assets/<id>.<ext>', mime, width?, height?, palette? }.
 * - brief.images = [{ file, alt, kind }] (alt generado desde el nombre del negocio; editable via PATCH).
 */
export function applyAssetsToBrief(brief, project, { applyLogoToBrief } = {}) {
  let out = JSON.parse(JSON.stringify(brief && typeof brief === 'object' ? brief : {}));
  const choice = project?.logo;
  const name = String(out.businessName || 'tu negocio');
  const used = { logo: null, images: 0 };
  if (choice?.kind === 'generated' && typeof applyLogoToBrief === 'function') {
    out = applyLogoToBrief(out, choice);
    if (out.logo) {
      const icon = FAVICON_ICON_OK(choice.icon);
      if (icon) out.logo.icon = icon;
      used.logo = 'generated';
    }
  } else if (choice?.kind === 'uploaded') {
    const rec = getAssetRecord(project.id, choice.assetId);
    if (rec) {
      out.logo = {
        kind: 'uploaded', file: `assets/${rec.file}`, mime: rec.mime,
        ...(rec.width ? { width: rec.width, height: rec.height } : {}),
        ...(choice.palette ? { palette: choice.palette } : {}),
      };
      const c = out.colors && typeof out.colors === 'object' ? out.colors : {};
      if (choice.palette && !HEX.test(String(c.primary || ''))) {
        out.colors = { ...c, primary: choice.palette.primary, ...(HEX.test(String(c.secondary || '')) ? {} : { secondary: choice.palette.secondary }) };
      }
      used.logo = 'uploaded';
    }
  }
  const imgs = listAssetRecords(project.id).filter((a) => a.kind === 'image');
  if (imgs.length) {
    out.images = imgs.map((a, i) => ({
      file: `assets/${a.file}`, kind: 'image', alt: a.alt || `Imagen ${i + 1} de ${name}`,
      ...(a.width ? { width: a.width, height: a.height } : {}),
    }));
    used.images = imgs.length;
  }
  return { brief: out, used };
}

/** Archivos del sitio para los assets que el brief realmente usa: { 'assets/x.png': {base64,mime} | 'svg text' }. */
export function siteAssetFiles(projectId, brief) {
  const wanted = new Set();
  if (brief?.logo?.kind === 'uploaded' && SITE_ASSET_RE.test(String(brief.logo.file))) wanted.add(brief.logo.file);
  for (const im of Array.isArray(brief?.images) ? brief.images : []) if (SITE_ASSET_RE.test(String(im?.file))) wanted.add(im.file);
  const out = {};
  for (const rel of wanted) {
    const r = readAssetFile(projectId, rel.slice('assets/'.length));
    if (!r) continue;
    out[rel] = r.rec.mime === EXT_MIME.svg ? r.data.toString('utf8') : { base64: r.data.toString('base64'), mime: r.rec.mime };
  }
  return out;
}
