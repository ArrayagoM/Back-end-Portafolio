require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const googleAuthRoutes = require('./routes/googleAuth');
const { getAuthUrl, saveRefreshToken } = require('./services/googleOAuthService');
const routes = require('./routes/index');
const agenciaRoutes = require('./routes/agenciaRoutes');

const app = express();
app.name = 'API TinchoDev';

// ─── Variables de entorno requeridas ─────────────────────────────────────────
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL, GROQ_API_KEY } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URL) {
  console.error('❌ Faltan variables de entorno de Google OAuth.');
  process.exit(1);
}

if (!GROQ_API_KEY) {
  console.warn('⚠️  GROQ_API_KEY no definida. El módulo de IA no funcionará.');
}

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(morgan('dev'));

// Agencia IA (/agencia/*): trae su propio parseo y CORS, por eso va antes de express.json()
app.use('/agencia', agenciaRoutes);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — FRONTEND_URL admite varios orígenes separados por coma; siempre se permiten los dominios propios
const DEFAULT_ORIGINS = ['https://new-protfolio-xi.vercel.app', 'https://tinchodev.it.com', 'https://www.tinchodev.it.com', 'https://martinarrayago.lat', 'https://www.martinarrayago.lat'];
const rawOrigin = process.env.FRONTEND_URL || '*';
const allowedList = rawOrigin === '*'
  ? null
  : [...new Set([...DEFAULT_ORIGINS, ...rawOrigin.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)])];

app.use(
  cors({
    origin: allowedList
      ? (origin, cb) => cb(null, !origin || allowedList.includes(origin.replace(/\/$/, '')) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /^https:\/\/new-protfolio[\w-]*\.vercel\.app$/.test(origin))
      : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    name: app.name,
    status: 'online',
    version: '2.0.0',
    endpoints: {
      citas: '/api/citas',
      proyectos: '/api/proyect',
      reviews: '/api/review',
      ai: '/api/ai',
      agencia: '/agencia/api/llm',
      google: '/google/auth',
    },
  });
});

app.use('/google', googleAuthRoutes);

app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
}, routes);

// OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Código no recibido' });

    const tokens = await saveRefreshToken(code);
    return res.status(200).json({
      message: 'Refresh token guardado con éxito',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch (err) {
    console.error('❌ Error en /oauth2callback:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// ─── Error handler global ─────────────────────────────────────────────────────
app.use((error, req, res, next) => {
  console.error('❌ Error global:', error.message);
  res.status(error.status || 500).json({
    message: error.message || 'Ocurrió un error inesperado',
  });
});

module.exports = app;