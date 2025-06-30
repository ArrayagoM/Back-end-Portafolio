const { google } = require('googleapis');
require('dotenv').config();
const mongoose = require('mongoose');
const Token = require('../models/Token');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);

// 🛠 Generar URL para autorización
async function getAuthUrl() {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',
  });
  console.log('🌐 URL de autorización generada:', url);
  return url;
}

// 💾 Guardar refresh_token en Mongo
async function saveRefreshToken(code) {
  try {
    console.log('⚙️ Obteniendo tokens con código:', code);

    // Paso 1: Obtener tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('🎟️ Tokens recibidos de Google:', tokens);

    if (!tokens.refresh_token) {
      console.log('❌ No se recibió refresh_token.');
      throw new Error('No se recibió refresh_token');
    }

    console.log('🧼 Eliminando tokens antiguos...');
    const deleted = await Token.deleteMany();
    console.log(`🧹 Se eliminaron ${deleted.deletedCount} tokens previos.`);

    console.log('📥 Preparando nuevo token para guardar:', {
      refreshToken: tokens.refresh_token,
      lastChecked: new Date(),
    });

    // Paso 2: Guardar en Mongo
    const saved = await Token.create({
      refreshToken: tokens.refresh_token,
      lastChecked: new Date(),
    });

    console.log('✅ Token guardado en Mongo correctamente:');
    console.log(saved);

    // Paso 3: Verificar que existe en la base
    const verify = await Token.findOne();
    if (verify) {
      console.log('🔍 Token encontrado en la base de datos:');
      console.log(`🧾 refreshToken: ${verify.refreshToken}`);
      console.log(`🕒 lastChecked: ${verify.lastChecked}`);
    } else {
      console.log('🚨 ERROR: el token no se encuentra en la base de datos.');
    }

    return tokens;
  } catch (err) {
    console.error('❌ Error en saveRefreshToken:', err.message);
    console.error(err.stack);
    throw err;
  }
}

// 🔁 Obtener cliente OAuth válido, actualizando si hace falta
async function getOAuthClientWithValidToken() {
  try {
    console.log('🔐 Buscando refresh_token en la base de datos...');

    const tokenDoc = await Token.findOne();

    if (!tokenDoc) throw new Error('No hay refresh_token almacenado en Mongo');

    console.log('🔑 Refresh token actual:', tokenDoc.refreshToken);

    oauth2Client.setCredentials({ refresh_token: tokenDoc.refreshToken });

    console.log('♻️ Solicitando nuevo access_token desde Google...');
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.refresh_token && credentials.refresh_token !== tokenDoc.refreshToken) {
      console.log('🆕 Google devolvió nuevo refresh_token. Actualizando DB...');
      tokenDoc.refreshToken = credentials.refresh_token;
    }

    tokenDoc.lastChecked = new Date();
    await tokenDoc.save();

    console.log('✅ Cliente OAuth listo con access_token actualizado.');
    return oauth2Client;
  } catch (err) {
    console.error('❌ Error en getOAuthClientWithValidToken:', err.message);
    throw err;
  }
}

module.exports = {
  getAuthUrl,
  saveRefreshToken,
  getOAuthClientWithValidToken,
};
