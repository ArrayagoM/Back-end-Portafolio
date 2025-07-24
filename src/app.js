const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const googleAuthRoutes = require('./routes/googleAuth');
const axios = require('axios');
const Token = require('./models/Token');
const { getAuthUrl, saveRefreshToken } = require('./services/googleOAuthService');

const qs = require('qs');

const routes = require('./routes/index');
// const { getWhatsAppQR } = require('./routes/WhatsAppRoutes');
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

app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('hellor, weldome my server the my porfolio.');
});

app.use('/google', googleAuthRoutes);
app.use(
  '/api',
  (req, res, next) => {
    console.log('ruta api acansada');
    next();
  },
  routes
);
// app.get('/api/whatsapp/qr', getWhatsAppQR);

// app.get('/oauth2callback', async (req, res) => {
//   try {
//     const code = req.query.code;

//     if (!code) {
//       console.log('❌ Código de autorización no encontrado.');
//       return res.status(400).json({ error: 'Código de autorización no encontrado' });
//     }

//     const tokenResponse = await axios.post(
//       'https://oauth2.googleapis.com/token',
//       qs.stringify({
//         code,
//         client_id: CLIENT_ID,
//         client_secret: CLIENT_SECRET,
//         redirect_uri: REDIRECT_URI,
//         grant_type: 'authorization_code',
//       }),
//       {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//       }
//     );

//     const { access_token, refresh_token } = tokenResponse.data;

//     if (!refresh_token) {
//       console.log('❌ No se recibió un refresh_token.');
//       return res.status(400).json({
//         error:
//           'No se recibió un refresh_token. Asegúrate de que el "access_type" sea "offline" y el "prompt" sea "consent" en la URL de autorización.',
//       });
//     }

//     console.log('✅ Refresh token obtenido correctamente.');
//     res.status(200).json({ access_token, refresh_token });
//   } catch (error) {
//     console.error('❌ Error en /oauth2callback:', error);
//     res.status(500).json({
//       error: 'Error al obtener el refresh token',
//       details: error.response ? error.response.data : error.message,
//     });
//   }
// });

app.get('/oauth2callback', async (req, res) => {
  console.log('🚀 Entró a /oauth2callback con query:', req.query);
  try {
    const { code } = req.query;
    if (!code) {
      console.log('❌ No se recibió código en query');
      return res.status(400).json({ error: 'Código no recibido' });
    }

    console.log('📬 Código recibido:', code);
    const tokens = await saveRefreshToken(code);
    console.log('🎉 Tokens guardados:', tokens);

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

app.get('/favicon.ico', (req, res) => res.status(204));

app.use((error, req, res, next) => {
  console.error('❌ Error global:', error);
  res.status(500).json({ message: error.message || 'Ocurrió un error inesperado' });
});

module.exports = app;
