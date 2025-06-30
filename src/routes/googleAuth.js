const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const { getAuthUrl, saveRefreshToken } = require('../services/googleOAuthService');

// Ruta para redirigir al usuario a Google
router.get('/auth', async (req, res) => {
  try {
    const url = await getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Callback después de autorizar
router.get('/oauth2callback', async (req, res) => {
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

router.get('/tokens', async (req, res) => {
  try {
    const all = await Token.find();
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener tokens' });
  }
});

module.exports = router;
