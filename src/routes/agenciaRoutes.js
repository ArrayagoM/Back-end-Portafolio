// Agencia IA montada dentro de este backend, en /agencia/*  (p. ej. POST /agencia/api/projects).
//
// El código de la agencia (carpeta /agencia, ESM y sin dependencias) trae su propio servidor HTTP; acá se le
// pasan las peticiones tal cual (server.emit('request')) y se resuelve lo que el entorno serverless necesita:
//  - modo demo público ACTIVADO por defecto: sin clave de acceso usa el LLM simulado, con límites por IP;
//  - datos en /tmp (efímero en Vercel); la oficina es una demostración, no almacena nada importante;
//  - CORS con lista de orígenes permitidos (la interfaz vive en el portafolio, no en este servidor).
const { Router } = require('express');

const router = Router();

const DEFAULT_ORIGINS = ['https://tinchodev.it.com', 'https://www.tinchodev.it.com', 'https://martinarrayago.lat', 'https://www.martinarrayago.lat'];
const origins = () =>
  new Set(
    [...DEFAULT_ORIGINS, ...String(process.env.AGENCIA_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '').split(',')]
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  );
const isLocal = (o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o);

// Defaults del entorno (no pisan lo que ya esté definido en Vercel)
process.env.PUBLIC_DEMO = process.env.PUBLIC_DEMO ?? '1';
process.env.TRUST_PROXY = process.env.TRUST_PROXY ?? 'all';
process.env.DATA_DIR = process.env.DATA_DIR ?? (process.env.VERCEL ? '/tmp/agencia-data' : require('path').join(process.cwd(), 'tmp', 'agencia-data'));

let serverPromise = null;
function getServer() {
  if (!serverPromise) {
    serverPromise = import('../../agencia/server/index.js').then((m) => m.createApp());
  }
  return serverPromise;
}

router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (origins().has(origin.replace(/\/+$/, '')) || isLocal(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Code');
      res.setHeader('Access-Control-Max-Age', '600');
    } else if (req.method === 'OPTIONS') {
      return res.status(403).json({ error: 'Origen no permitido' });
    }
    // el servidor de la agencia solo acepta mismo origen: acá ya validamos el origen, así que se lo ocultamos
    delete req.headers.origin;
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Importante: esta ruta se monta ANTES de express.json() (ver app.js) para que el cuerpo llegue sin consumir.
router.use(async (req, res) => {
  try {
    (await getServer()).emit('request', req, res);
  } catch (err) {
    console.error('[agencia] no se pudo iniciar:', err);
    if (!res.headersSent) res.status(500).json({ error: 'La agencia no está disponible' });
  }
});

module.exports = router;
