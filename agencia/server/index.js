// Servidor HTTP de la agencia: API JSON, SSE, estaticos y zip. Cero dependencias.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeps, startProject, answerAndAdvance, runPipeline, isRunning, readSiteFiles, proposeProjectLogos, chooseProjectLogo, describeSiteFiles } from '../core/pipeline.js';
import { createMock } from '../core/llm/mock.js';
import { readConfig, SlidingLimiter, createSlots, clientIp, viaHttps, codeMatches, createKillSwitch, DISABLED_HTML } from './demo.js';
import { createAuditManager, AuditError, answersFromReport, completeAnswers, AUDIT_ID_RE } from '../core/audits.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const WEB_ROOT = path.join(ROOT, 'web');
const MAX_BODY = 1024 * 1024; // 1 MB
const MAX_ASSET_BYTES_DEFAULT = 2.5 * 1024 * 1024;
const DEMO_MAX_BODY = 128 * 1024;
const MAX_ASSET_BODY = 4 * 1024 * 1024 + 8192; // ~4 MB: solo POST /assets (un archivo de 2,5 MB en base64 + JSON)
const ID_RE = /^[A-Za-z0-9_-]{4,64}$/;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.map': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm', '.data': 'application/octet-stream', '.unityweb': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// ---------- ZIP "stored" (sin compresion) escrito a mano ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** entries: [{ name, data: Buffer|string }] -> Buffer con un .zip valido (metodo 0 = stored). */
export function makeZip(entries, date = new Date()) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const locals = []; const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name.replace(/\\/g, '/'), 'utf8');
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); // bit 11: nombres UTF-8
    lh.writeUInt16LE(0, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(0, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += lh.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

// ---------- helpers HTTP ----------
class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' };

function sendJSON(res, status, obj, extra = {}) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { ...BASE_HEADERS, ...extra, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > limit) { reject(new HttpError(413, 'Body demasiado grande')); req.resume(); return; }
    const chunks = []; let size = 0; let failed = false;
    req.on('data', (c) => {
      if (failed) return;
      size += c.length;
      if (size > limit) { failed = true; chunks.length = 0; reject(new HttpError(413, 'Body demasiado grande')); req.resume(); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!failed) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', (e) => { if (!failed) reject(e); });
  });
}

async function readJSON(req, limit = MAX_BODY) {
  if (req.__demoLimit && limit === MAX_BODY) limit = req.__demoLimit;
  const raw = await readBody(req, limit);
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch { throw new HttpError(400, 'JSON invalido'); }
}

/** Resuelve `rel` dentro de `root`; devuelve null si intenta escapar. */
function resolveSafe(root, rel) {
  let p;
  try { p = decodeURIComponent(rel); } catch { return null; }
  if (p.includes('\0')) return null;
  const full = path.resolve(root, '.' + path.sep + p.replace(/^[/\\]+/, ''));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function serveFile(req, res, root, rel, { cache = 'no-cache', validate = false } = {}) {
  const full = resolveSafe(root, rel);
  if (!full) return sendJSON(res, 400, { error: 'Ruta invalida' });
  let target = full;
  try {
    let st = fs.statSync(target);
    if (st.isDirectory()) { target = path.join(target, 'index.html'); st = fs.statSync(target); }
    const realRoot = fs.realpathSync(root);
    const real = fs.realpathSync(target);
    if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return sendJSON(res, 403, { error: 'Prohibido' });
    const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
    const extra = {};
    if (validate) { // ETag debil + Last-Modified para builds grandes (Unity): revalida con 304 en vez de rebajar
      const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
      extra.ETag = etag; extra['Last-Modified'] = st.mtime.toUTCString();
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ...BASE_HEADERS, ...extra, 'Cache-Control': cache }); return res.end(); }
    }
    res.writeHead(200, { ...BASE_HEADERS, ...extra, 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(target).on('error', () => res.destroy()).pipe(res);
  } catch {
    sendJSON(res, 404, { error: 'No encontrado' });
  }
}

function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

// ---------- app ----------
/**
 * Crea el http.Server (sin escuchar). opts: { llm, pace, deps }.
 * `deps` permite inyectar modulos (tests).
 */
export function createApp(opts = {}) {
  const pace = opts.pace ?? Number(process.env.PACE ?? 700);
  const depOverrides = opts.deps;
  let llmCache = opts.llm;
  const cfg = opts.config || readConfig(opts.env || process.env);
  const DEMO = cfg.publicDemo;
  const isDisabled = createKillSwitch(cfg);
  const limits = DEMO ? {
    projects: new SlidingLimiter({ windowMs: 3600_000, max: cfg.projectsPerHour }),
    runs: new SlidingLimiter({ windowMs: 3600_000, max: cfg.runsPerHour }),
    logos: new SlidingLimiter({ windowMs: 3600_000, max: cfg.logosPerHour }),
    unlockFails: new SlidingLimiter({ windowMs: 600_000, max: 5 }),
  } : null;
  const slots = createSlots(cfg.maxConcurrent);
  const sseByIp = new Map();
  const mock = createMock();
  const getDeps = () => loadDeps(depOverrides);
  let auditMgr = null;
  // En demo el LLM se decide por peticion (start recibe el suyo); el del gestor es siempre el mock.
  const audits = () => auditMgr || (auditMgr = createAuditManager({
    llm: () => (DEMO ? mock : getRealLLM()),
    ...(DEMO ? { maxConcurrent: cfg.maxConcurrent, perIpPerHour: cfg.auditsPerHour } : {}),
    ...(opts.audit || {}),
  }));
  const getRealLLM = async () => {
    if (!llmCache) llmCache = (await getDeps()).llm.getLLM({ unlocked: true });
    return llmCache;
  };
  /** LLM para esta peticion: en demo, el real solo con codigo valido; si no, el mock (no toca proveedor ni key). */
  const llmFor = (ctx) => (DEMO && !ctx.unlocked() ? mock : getRealLLM());
  const tooMany = (wait, msg) => new HttpError(429, msg, { retryAfterSec: wait });
  const maxUpload = DEMO ? cfg.maxUploadBytes : MAX_ASSET_BYTES_DEFAULT;

  /** Contexto de la peticion: IP y estado del codigo (se evalua una sola vez, y solo si hay cabecera). */
  function makeCtx(req) {
    const ip = clientIp(req, cfg);
    let state = null;
    const unlocked = () => {
      if (!DEMO) return true;
      if (state !== null) return state;
      const given = req.headers['x-access-code'];
      state = false;
      if (typeof given !== 'string' || !given || !cfg.accessCode) return state;
      if (limits.unlockFails.retryAfter(ip)) return state; // IP bloqueada por intentos fallidos: ni se compara
      if (codeMatches(given, cfg.accessCode)) state = true; else limits.unlockFails.record(ip);
      return state;
    };
    return { ip, unlocked };
  }

  async function needProject(id) {
    if (!ID_RE.test(id)) throw new HttpError(404, 'Proyecto no encontrado');
    const deps = await getDeps();
    const project = await deps.store.loadProject(id);
    if (!project) throw new HttpError(404, 'Proyecto no encontrado');
    return { deps, project };
  }

  async function handleApi(req, res, url, ctx) {
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const method = req.method;
    if (parts[1] === 'llm' && parts.length === 2) {
      if (method !== 'GET') throw new HttpError(405, 'Metodo no permitido');
      const full = !DEMO || ctx.unlocked();
      const llm = await llmFor(ctx);
      return sendJSON(res, 200, {
        name: llm.name, available: !!llm.available, mode: full ? 'full' : 'demo', limited: DEMO,
        limits: { projectsPerHour: DEMO ? cfg.projectsPerHour : null, maxUploadBytes: maxUpload },
      });
    }
    if (parts[1] === 'unlock' && parts.length === 2) {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      const body = await readJSON(req, 4096);
      if (!DEMO) return sendJSON(res, 200, { ok: true });
      const wait = limits.unlockFails.retryAfter(ctx.ip);
      if (wait) throw tooMany(wait, 'Demasiados intentos. Probá de nuevo en unos minutos.');
      if (cfg.accessCode && codeMatches(typeof body.code === 'string' ? body.code : '', cfg.accessCode)) return sendJSON(res, 200, { ok: true });
      limits.unlockFails.record(ctx.ip);
      return sendJSON(res, 200, { ok: false });
    }
    if (parts[1] === 'audits') return handleAudits(req, res, parts, ctx);
    if (parts[1] !== 'projects') throw new HttpError(404, 'Ruta no encontrada');

    if (parts.length === 2) {
      if (method === 'POST') {
        await readBody(req);
        if (DEMO) { const w = limits.projects.hit(ctx.ip); if (w) throw tooMany(w, 'Llegaste al máximo de proyectos de prueba por hora. Probá de nuevo más tarde.'); }
        const { project, question } = await startProject(depOverrides);
        if (DEMO) { project.ai = ctx.unlocked(); await (await getDeps()).store.saveProject(project); }
        return sendJSON(res, 201, { project, question });
      }
      if (method === 'GET') {
        const deps = await getDeps();
        // demo publica: el listado completo solo con codigo (no se filtran proyectos ajenos)
        return sendJSON(res, 200, { projects: DEMO && !ctx.unlocked() ? [] : await deps.store.listProjects() });
      }
      throw new HttpError(405, 'Metodo no permitido');
    }

    const id = parts[2];
    const sub = parts[3];
    const { deps, project } = await needProject(id);

    if (!sub) {
      if (method !== 'GET') throw new HttpError(405, 'Metodo no permitido');
      return sendJSON(res, 200, project);
    }
    if (sub === 'answer') {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      const body = await readJSON(req);
      if (typeof body.answer !== 'string') throw new HttpError(400, 'Falta "answer" (texto)');
      const out = await answerAndAdvance(id, body.answer, depOverrides);
      return sendJSON(res, 200, { project: out.project, question: out.nextQuestion });
    }
    if (sub === 'run') {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      await readBody(req);
      if (isRunning(id)) throw new HttpError(409, 'El pipeline ya esta corriendo');
      if (!project.answers || !Object.keys(project.answers).length) throw new HttpError(400, 'Responde al menos una pregunta antes de lanzar el pipeline');
      const llm = await llmFor(ctx);
      let release = null;
      if (DEMO) {
        const w = limits.runs.retryAfter(ctx.ip);
        if (w) throw tooMany(w, 'Ya lanzaste varios proyectos en esta hora. Probá de nuevo más tarde.');
        release = slots.acquire();
        if (!release) throw tooMany(30, 'Hay muchas personas probando la demo ahora mismo. Probá de nuevo en un ratito.');
        limits.runs.record(ctx.ip);
      }
      runPipeline(id, { llm, pace, deps: depOverrides }).catch((e) => console.error('[server] pipeline:', e)).finally(() => release && release());
      return sendJSON(res, 202, { started: true });
    }
    if (sub === 'events') {
      if (method !== 'GET') throw new HttpError(405, 'Metodo no permitido');
      return handleSSE(req, res, id, deps, ctx);
    }
    if (sub === 'files') {
      if (method !== 'GET') throw new HttpError(405, 'Metodo no permitido');
      return sendJSON(res, 200, { files: describeSiteFiles(await readSiteFiles(id, depOverrides)) });
    }
    if (sub === 'download') {
      if (method !== 'GET') throw new HttpError(405, 'Metodo no permitido');
      const files = await readSiteFiles(id, depOverrides);
      const names = Object.keys(files);
      if (!names.length) throw new HttpError(404, 'El sitio todavia no fue generado');
      const zip = makeZip(names.map((n) => ({ name: n, data: typeof files[n] === 'string' ? files[n] : Buffer.from(files[n].base64, 'base64') })));
      const fname = `${slug(project.brief?.businessName) || id}.zip`;
      res.writeHead(200, { ...BASE_HEADERS, 'Content-Type': 'application/zip', 'Content-Length': zip.length, 'Content-Disposition': `attachment; filename="${fname}"` });
      return res.end(zip);
    }
    if (sub === 'assets') return handleAssets(req, res, id, deps, parts[4], ctx);
    if (sub === 'logos') {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      await readBody(req);
      let release = null;
      if (DEMO) {
        const w = limits.logos.hit(ctx.ip);
        if (w) throw tooMany(w, 'Pediste muchos logos en esta hora. Probá de nuevo más tarde.');
        release = slots.acquire();
        if (!release) throw tooMany(30, 'Hay muchas personas probando la demo ahora mismo. Probá de nuevo en un ratito.');
      }
      try {
        const out = await proposeProjectLogos(id, { llm: await llmFor(ctx), deps: depOverrides });
        return sendJSON(res, 200, { options: out.options, notes: out.notes });
      } finally { if (release) release(); }
    }
    if (sub === 'logo') {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      const body = await readJSON(req);
      return sendJSON(res, 200, await chooseProjectLogo(id, { choice: body.choice, assetId: body.assetId }, depOverrides));
    }
    throw new HttpError(404, 'Ruta no encontrada');
  }

  async function handleAssets(req, res, id, deps, file, ctx) {
    const method = req.method;
    const A = deps.assets;
    if (!file) {
      if (method === 'GET') return sendJSON(res, 200, { assets: A.listAssets(id) });
      if (method === 'POST') {
        const body = await readJSON(req, DEMO ? Math.ceil((maxUpload * 4) / 3) + 8192 : MAX_ASSET_BODY);
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'El cuerpo debe ser un objeto JSON.');
        if (DEMO && typeof body.data === 'string' && Math.floor((body.data.replace(/^data:[^,]*,/, '').length * 3) / 4) > maxUpload) {
          throw new HttpError(413, 'En la demo el archivo puede pesar hasta ' + (maxUpload / 1048576).toFixed(1).replace('.', ',') + ' MB.');
        }
        return sendJSON(res, 201, { asset: A.saveAsset(id, body) });
      }
      throw new HttpError(405, 'Metodo no permitido');
    }
    if (method === 'GET' || method === 'HEAD') {
      const r = A.readAssetFile(id, file); // valida nombre (regex) + indice: sin path traversal
      if (!r) throw new HttpError(404, 'Archivo no encontrado');
      const headers = { ...BASE_HEADERS, 'Content-Type': r.rec.mime, 'Content-Length': r.data.length, 'Cache-Control': 'private, max-age=0' };
      if (r.rec.mime === 'image/svg+xml') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
      res.writeHead(200, headers);
      return res.end(method === 'HEAD' ? undefined : r.data);
    }
    if (method === 'DELETE') {
      if (!A.deleteAsset(id, file)) throw new HttpError(404, 'Archivo no encontrado');
      const fresh = await deps.store.loadProject(id);
      if (fresh && fresh.logo?.kind === 'uploaded' && fresh.logo.assetId === file) { delete fresh.logo; await deps.store.saveProject(fresh); }
      return sendJSON(res, 200, { deleted: true });
    }
    if (method === 'PATCH') {
      const body = await readJSON(req);
      const out = A.updateAsset(id, file, body);
      if (!out) throw new HttpError(404, 'Archivo no encontrado');
      return sendJSON(res, 200, { asset: out });
    }
    throw new HttpError(405, 'Metodo no permitido');
  }

  async function handleAudits(req, res, parts, ctx) {
    const method = req.method;
    if (parts.length === 2) {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      const body = await readJSON(req);
      try {
        const { id } = await audits().start(body && body.url, { ip: ctx.ip, ...(DEMO ? { llm: await llmFor(ctx) } : {}) });
        return sendJSON(res, 202, { id });
      } catch (e) {
        if (e instanceof AuditError) throw new HttpError(e.status, e.message, e.status === 429 ? { retryAfterSec: 60 } : undefined);
        throw e;
      }
    }
    const auditId = parts[2];
    if (!AUDIT_ID_RE.test(auditId)) throw new HttpError(404, 'Auditoria no encontrada');
    const cur = audits().get(auditId);
    if (!cur) throw new HttpError(404, 'Auditoria no encontrada');
    if (parts.length === 3) {
      if (method !== 'GET') throw new HttpError(405, 'Metodo no permitido');
      return sendJSON(res, 200, cur);
    }
    if (parts.length === 4 && parts[3] === 'rebuild') {
      if (method !== 'POST') throw new HttpError(405, 'Metodo no permitido');
      await readBody(req);
      if (cur.status !== 'done' || !cur.report) throw new HttpError(409, 'La auditoria todavia no termino o fallo: no hay datos para reconstruir el sitio.');
      const deps = await getDeps();
      if (DEMO) { const w = limits.projects.hit(ctx.ip); if (w) throw tooMany(w, 'Llegaste al máximo de proyectos de prueba por hora. Probá de nuevo más tarde.'); }
      const { project: created } = await startProject(depOverrides);
      const project = await deps.store.loadProject(created.id);
      if (DEMO) project.ai = ctx.unlocked();
      const done = await completeAnswers(cur.report, answersFromReport(cur.report), await llmFor(ctx));
      project.answers = done.answers;
      project.inferredAnswers = done.inferred;
      project.sourceAudit = auditId;
      const logoUrl = cur.report.extracted?.logoUrl;
      project.auditNotes = [
        ...(logoUrl ? [`El sitio original tiene un logo (${String(logoUrl).slice(0, 300)}). No se descargo automaticamente: si queres usarlo, subilo desde tus archivos.`] : []),
        ...done.notes,
      ];
      await deps.store.saveProject(project);
      const question = (await deps.interviewer.nextQuestion(project)) || null;
      return sendJSON(res, 201, { project, question });
    }
    throw new HttpError(404, 'Ruta no encontrada');
  }

  function handleSSE(req, res, id, deps, ctx) {
    if (DEMO) {
      const n = sseByIp.get(ctx.ip) || 0;
      if (n >= cfg.maxSse) throw tooMany(30, 'Demasiadas conexiones abiertas. Cerrá alguna pestaña y reintentá.');
      sseByIp.set(ctx.ip, n + 1);
      let freed = false;
      const free = () => { if (freed) return; freed = true; const m = (sseByIp.get(ctx.ip) || 1) - 1; if (m <= 0) sseByIp.delete(ctx.ip); else sseByIp.set(ctx.ip, m); };
      res.on('close', free); req.on('close', free);
    }
    res.writeHead(200, {
      ...BASE_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    const send = (evt) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(evt)}\n\n`); };
    // suscribir primero y encolar para no perder eventos entre history y live
    const queue = []; let replaying = true;
    const unsubscribe = deps.events.subscribe(id, (evt) => { if (replaying) queue.push(evt); else send(evt); });
    const past = deps.events.history(id) || [];
    for (const evt of past) send(evt);
    const seen = new Set(past.map((e) => JSON.stringify(e)));
    for (const evt of queue) { if (!seen.has(JSON.stringify(evt))) send(evt); }
    replaying = false;
    const ka = setInterval(() => { if (!res.writableEnded) res.write(': keep-alive\n\n'); }, 15000);
    let closed = false;
    const cleanup = () => { if (closed) return; closed = true; clearInterval(ka); try { unsubscribe(); } catch { /* ignore */ } };
    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
  }

  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return;
    let host;
    try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Origen invalido'); }
    if (host !== req.headers.host) throw new HttpError(403, 'Origen no permitido');
  }

  function checkHost(req) {
    const h = String(req.headers.host || '');
    if (h && (h.length > 255 || !/^[a-z0-9.\-:[\]]+$/i.test(h))) throw new HttpError(400, 'Host invalido');
    if (cfg.allowedHosts.length) {
      const bare = h.toLowerCase().replace(/:\d+$/, '');
      if (!cfg.allowedHosts.includes(h.toLowerCase()) && !cfg.allowedHosts.includes(bare)) throw new HttpError(421, 'Host no permitido');
    }
  }

  const frameAncestors = "frame-ancestors 'self'" + (cfg.embedOrigins.length ? ' ' + cfg.embedOrigins.join(' ') : '');
  function setSecurityHeaders(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Content-Security-Policy', frameAncestors); // sin X-Frame-Options: frame-ancestors manda
    if (viaHttps(req, cfg)) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      setSecurityHeaders(req, res);
      if (isDisabled()) {
        const isApi = url.pathname === '/api' || url.pathname.startsWith('/api/');
        if (isApi) return sendJSON(res, 503, { error: 'La demo está en pausa por ahora. Volvé a intentar en un rato.', disabled: true, retryAfterSec: 300 }, { 'Retry-After': '300' });
        const html = Buffer.from(DISABLED_HTML);
        res.writeHead(503, { ...BASE_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length, 'Cache-Control': 'no-store', 'Retry-After': '300' });
        return res.end(req.method === 'HEAD' ? undefined : html);
      }
      checkHost(req);
      checkOrigin(req);
      const ctx = makeCtx(req);
      if (DEMO) req.__demoLimit = DEMO_MAX_BODY; // CORS cerrado: nunca emitimos Access-Control-Allow-*; otros origenes reciben 403
      if (req.method === 'OPTIONS') { res.writeHead(204, { ...BASE_HEADERS, Allow: 'GET, HEAD, POST, PATCH, DELETE' }); return res.end(); }
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return await handleApi(req, res, url, ctx);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Metodo no permitido');
      if (url.pathname.startsWith('/sites/')) {
        const rest = url.pathname.slice('/sites/'.length);
        const slash = rest.indexOf('/');
        const id = slash < 0 ? rest : rest.slice(0, slash);
        if (!ID_RE.test(id)) throw new HttpError(404, 'Sitio no encontrado');
        if (slash < 0) { res.writeHead(301, { Location: `/sites/${id}/` }); return res.end(); }
        const deps = await getDeps();
        return serveFile(req, res, await deps.store.siteDir(id), rest.slice(slash + 1));
      }
      if (url.pathname.startsWith('/unity/Build/')) { // build WebGL de Unity: grande y de nombre fijo -> revalidar
        return serveFile(req, res, WEB_ROOT, url.pathname, { cache: 'public, max-age=0, must-revalidate', validate: true });
      }
      return serveFile(req, res, WEB_ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
    } catch (err) {
      const status = err instanceof HttpError || err?.status ? err.status : 500;
      if (status === 500) console.error('[server] error:', err);
      if (res.headersSent) return res.destroy();
      const extra = err.extra && err.extra.retryAfterSec ? { 'Retry-After': String(err.extra.retryAfterSec) } : {};
      sendJSON(res, status, { error: status === 500 ? 'Error interno del servidor' : err.message, ...(err.extra || {}) }, extra);
    }
  }

  const server = http.createServer((req, res) => { handler(req, res); });
  server.on('close', () => { if (limits) for (const l of Object.values(limits)) l.stop(); });
  server.keepAliveTimeout = 5000;
  return server;
}

export function startServer({ port = Number(process.env.PORT || 4310), host = process.env.HOST || '127.0.0.1', ...opts } = {}) {
  const server = createApp(opts);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  process.on('unhandledRejection', (e) => console.error('[server] unhandledRejection:', e));
  startServer().then((s) => {
    const { port } = s.address();
    console.log(`Agencia IA escuchando en http://localhost:${port}`);
  }).catch((e) => { console.error('No se pudo iniciar el servidor:', e.message); process.exit(1); });
}
