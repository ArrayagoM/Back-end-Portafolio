require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const googleAuthRoutes = require('./routes/googleAuth');
const { getAuthUrl, saveRefreshToken } = require('./services/googleOAuthService');
const routes = require('./routes/index');

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
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — se elimina la barra final por si está mal configurada en Vercel
const rawOrigin = process.env.FRONTEND_URL || '*';
const allowedOrigin = rawOrigin === '*' ? '*' : rawOrigin.replace(/\/$/, '');

app.use(
  cors({
    origin: allowedOrigin,
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