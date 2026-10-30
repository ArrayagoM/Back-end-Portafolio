// Modo demo publica protegida: configuracion por entorno, limites (ventanas deslizantes en memoria),
// IP del cliente (solo confia en cabeceras de proxy si TRUST_PROXY), codigo de acceso (tiempo constante)
// e interruptor de apagado. Cero dependencias. El codigo de acceso NUNCA se loguea ni viaja por URL.
import crypto from 'node:crypto';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';

const int = (v, def, min = 0) => { const n = Number.parseInt(String(v ?? ''), 10); return Number.isFinite(n) && n >= min ? n : def; };
const flag = (v) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());
const ORIGIN_RE = /^https?:\/\/(\*\.)?[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

/** Lee la configuracion del entorno. `env` se puede inyectar (tests). */
export function readConfig(env = process.env) {
  const trust = String(env.TRUST_PROXY ?? '').trim().toLowerCase();
  const embedOrigins = String(env.ALLOWED_EMBED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter((s) => ORIGIN_RE.test(s));
  const allowedHosts = String(env.ALLOWED_HOSTS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const projectsPerHour = int(env.DEMO_MAX_PROJECTS_PER_HOUR, 4, 1);
  return {
    publicDemo: flag(env.PUBLIC_DEMO),
    accessCode: String(env.ACCESS_CODE ?? '').trim().slice(0, 256),
    projectsPerHour,
    runsPerHour: projectsPerHour * 2,
    logosPerHour: projectsPerHour * 3,
    auditsPerHour: int(env.DEMO_MAX_AUDITS_PER_HOUR, 6, 1),
    maxConcurrent: int(env.DEMO_MAX_CONCURRENT, 2, 1),
    maxUploadBytes: int(env.DEMO_MAX_UPLOAD_BYTES, 1.5 * 1024 * 1024, 1024),
    maxSse: int(env.DEMO_MAX_SSE_PER_IP, 8, 1),
    trustProxy: trust === 'all' ? 'all' : flag(trust) ? 'loopback' : 'off',
    embedOrigins,
    allowedHosts,
    disabled: flag(env.DEMO_DISABLED),
  };
}

// ---------- ventanas deslizantes ----------
export class SlidingLimiter {
  constructor({ windowMs, max, maxKeys = 20000, now = () => Date.now() }) {
    Object.assign(this, { windowMs, max, maxKeys, now });
    this.map = new Map(); // key -> [timestamps]
    this.timer = setInterval(() => this.sweep(), Math.min(windowMs, 60_000));
    this.timer.unref?.();
  }
  _live(key) {
    const t = this.now();
    const arr = (this.map.get(key) || []).filter((x) => t - x < this.windowMs);
    if (arr.length) this.map.set(key, arr); else this.map.delete(key);
    return arr;
  }
  count(key) { return this._live(key).length; }
  /** Segundos hasta que se libere un lugar (0 si hay lugar). */
  retryAfter(key) {
    const arr = this._live(key);
    if (arr.length < this.max) return 0;
    return Math.max(1, Math.ceil((arr[arr.length - this.max] + this.windowMs - this.now()) / 1000));
  }
  record(key) {
    const arr = this._live(key);
    arr.push(this.now());
    this.map.set(key, arr);
    if (this.map.size > this.maxKeys) this.sweep(true);
  }
  /** check + record. Devuelve 0 si pasa (y registra) o los segundos de espera. */
  hit(key) {
    const wait = this.retryAfter(key);
    if (wait) return wait;
    this.record(key);
    return 0;
  }
  sweep(force = false) {
    const t = this.now();
    for (const [k, v] of this.map) if (!v.some((x) => t - x < this.windowMs)) this.map.delete(k);
    if (force) while (this.map.size > this.maxKeys) this.map.delete(this.map.keys().next().value); // tope duro
  }
  stop() { clearInterval(this.timer); }
}

/** Cupos simultaneos (pipelines, logos). acquire() devuelve release() o null. */
export function createSlots(max) {
  let n = 0;
  return {
    acquire() { if (n >= max) return null; n++; let done = false; return () => { if (!done) { done = true; n--; } }; },
    get active() { return n; },
  };
}

// ---------- IP del cliente ----------
const isLoopback = (a) => a === '::1' || a === '127.0.0.1' || a === '::ffff:127.0.0.1' || /^::ffff:127\./.test(a || '') || /^127\./.test(a || '');

const stripV4Mapped = (s) => s.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, '$1');

/** IP de la peticion. Las cabeceras de proxy se ignoran salvo que TRUST_PROXY este activo (y el par sea loopback, o TRUST_PROXY=all). */
export function clientIp(req, cfg) {
  const sock = stripV4Mapped(req.socket?.remoteAddress || 'unknown');
  if (cfg.trustProxy === 'off') return sock;
  if (cfg.trustProxy === 'loopback' && !isLoopback(req.socket?.remoteAddress)) return sock;
  const cf = String(req.headers['cf-connecting-ip'] || '').trim();
  if (cf && net.isIP(cf)) return stripV4Mapped(cf.toLowerCase());
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  // el ultimo valor lo agrega el proxy de confianza; los anteriores los puede inventar el cliente
  for (let i = xff.length - 1; i >= 0; i--) if (net.isIP(xff[i])) return stripV4Mapped(xff[i].toLowerCase());
  return sock;
}

/** true si la peticion llego por HTTPS segun un proxy de confianza. */
export function viaHttps(req, cfg) {
  if (cfg.trustProxy === 'off') return false;
  if (cfg.trustProxy === 'loopback' && !isLoopback(req.socket?.remoteAddress)) return false;
  if (/^https$/i.test(String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim())) return true;
  return /"scheme":"https"/.test(String(req.headers['cf-visitor'] || ''));
}

// ---------- codigo de acceso ----------
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest();

/** Comparacion en tiempo constante (hash + timingSafeEqual: no filtra ni el largo). */
export function codeMatches(given, expected) {
  if (typeof given !== 'string' || !given || !expected) return false;
  if (given.length > 256) return false;
  return crypto.timingSafeEqual(sha(given), sha(expected));
}

// ---------- interruptor de apagado ----------
export function createKillSwitch(cfg, dataDir = () => path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))) {
  let lastCheck = 0; let lastVal = false;
  return () => {
    if (cfg.disabled) return true;
    const t = Date.now();
    if (t - lastCheck < 1000) return lastVal; // el archivo se mira como mucho 1 vez por segundo
    lastCheck = t;
    try { lastVal = fs.existsSync(path.join(dataDir(), 'DISABLED')); } catch { lastVal = false; }
    return lastVal;
  };
}

export const DISABLED_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo en pausa</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#2a1d17;color:#fff7e6;font:16px/1.5 system-ui,sans-serif;padding:24px;text-align:center}main{max-width:32rem}h1{font-size:1.4rem;margin:0 0 .5rem}p{margin:.4rem 0;color:#d8c3a5}</style></head>
<body><main><h1>La demo está en pausa por ahora</h1><p>La apagué temporalmente para cuidar los recursos. Volvé a intentar en un rato.</p><p>Gracias por pasar.</p></main></body></html>`;
