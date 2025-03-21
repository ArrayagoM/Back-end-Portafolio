const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const qs = require('qs');

const routes = require('./routes/index');
const { getWhatsAppQR } = require('./routes/WhatsAppRoutes');
const app = express();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('❌ Faltan variables de entorno necesarias.');
  process.exit(1);
}

app.name = 'API TinchoDev';

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
const allowedOrigins = ['https://tinchodev.it.com', 'http://localhost:3000'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'El CORS policy para este sitio no permite acceder desde ' + origin;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.get('/', (req, res) => {
  res.status(200).send('hellor, weldome my server the my porfolio.');
});
app.use('/api', routes);
app.get('/api/whatsapp/qr', getWhatsAppQR);

app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      console.log('❌ Código de autorización no encontrado.');
      return res.status(400).json({ error: 'Código de autorización no encontrado' });
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    if (!refresh_token) {
      console.log('❌ No se recibió un refresh_token.');
      return res.status(400).json({
        error:
          'No se recibió un refresh_token. Asegúrate de que el "access_type" sea "offline" y el "prompt" sea "consent" en la URL de autorización.',
      });
    }

    console.log('✅ Refresh token obtenido correctamente.');
    res.status(200).json({ access_token, refresh_token });
  } catch (error) {
    console.error('❌ Error en /oauth2callback:', error);
    res.status(500).json({
      error: 'Error al obtener el refresh token',
      details: error.response ? error.response.data : error.message,
    });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204));

app.use((error, req, res, next) => {
  console.error('❌ Error global:', error);
  res.status(500).json({ message: error.message || 'Ocurrió un error inesperado' });
});

module.exports = app;
