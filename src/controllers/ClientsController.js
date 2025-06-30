const { google } = require('googleapis');
const moment = require('moment-timezone');
const sendEmail = require('../config/nodemailer');
const Token = require('../models/Token')
// const WhatsAppService = require('../services/whatsappService');
const Client = require('../models/Cliente');
const OAuth2 = google.auth.OAuth2;

const crearCita = async (req, res) => {
  try {
    console.log(req.body);
    let { name, email, phoneNumber, message, hora, fecha, agendarEnGoogle, phoneCode } = req.body;
    name = name.trim();
    email = email.trim();
    phoneNumber = phoneNumber.trim();

    if (!name || !email || !phoneNumber || !message || !phoneCode) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'El email no es válido' });
    }

    if (message.length < 10) {
      return res.status(400).json({ message: 'El mensaje debe tener al menos 10 caracteres' });
    }

    const newClient = new Client({ name, email, phoneNumber: phoneNumber, message });
    const savedClient = await newClient.save();

    if (!savedClient) {
      return res.status(500).json({ message: 'Error al guardar en la base de datos' });
    }

    let adminNotificationMessage = `
      <h2>Nueva solicitud de contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phoneNumber}</p>
      <p><strong>Mensaje:</strong> ${message}</p>
    `;

    const logoUrl =
      process.env.LOGO_URL || 'https://tinchodev.it.com/static/media/logo.194f9768dd3fb4b97f76.png';

    if (agendarEnGoogle) {
      // 🔁 Nuevo bloque para obtener el refresh token desde MongoDB
      const tokenDoc = await Token.findOne();
      if (!tokenDoc || !tokenDoc.refreshToken) {
        return res.status(500).json({ message: 'No hay token guardado en la base de datos' });
      }

      const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.REDIRECT_URL
      );

      oauth2Client.setCredentials({ refresh_token: tokenDoc.refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const startDateTime = moment.tz(`${fecha} ${hora}`, 'America/Cancun').toDate();
      const endDateTime = moment(startDateTime).add(1, 'hour').toDate();

      const event = {
        summary: `Cita con ${name}`,
        start: { dateTime: startDateTime, timeZone: 'America/Cancun' },
        end: { dateTime: endDateTime, timeZone: 'America/Cancun' },
        colorId: '10',
        conferenceData: {
          createRequest: { requestId: new Date().toISOString() },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      try {
        const eventResponse = await calendar.events.insert({
          calendarId: process.env.CALENDAR_ID,
          resource: event,
          conferenceDataVersion: 1,
        });

        const userEmailHtml = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Cita Confirmada</title>
            <style>
              body { background-color: #f4f4f4; font-family: Arial, sans-serif; }
              .container { background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center; }
              .logo { width: 120px; margin-bottom: 20px; }
              .btn-cta { display: inline-block; background-color: #ff5722; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${logoUrl}" alt="Logo" class="logo" />
              <h1>¡Cita Confirmada!</h1>
              <p>Hola <strong>${name}</strong>,</p>
              <p>Tu cita está confirmada para el <strong>${fecha}</strong> a las <strong>${hora}</strong>.</p>
              <p>Accede a tu cita mediante los siguientes enlaces:</p>
              <p>
                <a href="${eventResponse.data.hangoutLink}" class="btn-cta" target="_blank">
                  Unirse a Google Meet
                </a>
              </p>
              <p>
                <a href="${eventResponse.data.htmlLink}" class="btn-cta" target="_blank">
                  Ver en Google Calendar
                </a>
              </p>
              <p>Gracias por confiar en nosotros.</p>
              <p>Saludos,<br/>El equipo de Soporte</p>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: email,
          subject: 'Cita confirmada',
          html: userEmailHtml,
        });

        adminNotificationMessage += `
          <p><strong>Estado:</strong> Agendado en Google Calendar</p>
          <p><strong>Enlace Meet:</strong> <a href="${eventResponse.data.hangoutLink}">${eventResponse.data.hangoutLink}</a></p>
          <p><strong>Enlace Calendar:</strong> <a href="${eventResponse.data.htmlLink}">${eventResponse.data.htmlLink}</a></p>
        `;
      } catch (error) {
        console.error('Error al crear el evento en Google Calendar:', error);
        return res.status(500).json({ success: false, error: 'Error al crear el evento en Google Calendar' });
      }
    } else {
      const userContactEmailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Mensaje Recibido</title>
          <style>
            body { background-color: #f4f4f4; font-family: Arial, sans-serif; }
            .container { background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center; }
            .logo { width: 120px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${logoUrl}" alt="Logo" class="logo" />
            <h1>¡Mensaje Recibido!</h1>
            <p>Hola <strong>${name}</strong>,</p>
            <p>Hemos recibido tu mensaje y nos pondremos en contacto a la brevedad.</p>
            <p>Gracias por escribirnos.</p>
            <p>Saludos,<br/>El equipo de Soporte</p>
          </div>
        </body>
        </html>
      `;
      await sendEmail({
        to: email,
        subject: 'Mensaje Recibido',
        html: userContactEmailHtml,
      });

      adminNotificationMessage += `<p><strong>Estado:</strong> Mensaje de contacto sin cita</p>`;
    }

    await sendEmail({
      to: 'jarrayago@abc.gob.ar',
      subject: 'Nueva solicitud de contacto',
      html: adminNotificationMessage,
    });

    return res.status(201).json({ success: true, message: 'Cita/Contacto creado correctamente' });
  } catch (error) {
    console.error('Error en crearCita:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { crearCita };
