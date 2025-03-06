const { google } = require('googleapis');
const moment = require('moment-timezone');
const sendEmail = require('../config/nodemailer');
const WhatsAppService = require('../services/whatsappService');
const Client = require('../models/Cliente');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const crearCita = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, phoneNumber, message, hora, fecha, agendarEnGoogle } = req.body;

    if (!name || !email || !phoneNumber || !message) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'El email no es válido' });
    }

    const phoneRegex = /^\+\d{8,15}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        message: 'El número de teléfono no es válido',
      });
    }
    if (message.length < 200) {
      return res.status(400).json({ message: 'El mensaje debe tener al menos 200 caracteres' });
    }

    const newClient = new Client({ name, email, phoneNumber, message });
    const savedClient = await newClient.save();

    if (!savedClient) {
      return res.status(500).json({ message: 'Error al guardar en la base de datos' });
    }

    let adminNotificationMessage = `Nueva cita agendada\n\nNombre: ${name}\nMensaje: ${message}\n`;

    if (agendarEnGoogle) {
      const startDateTime = moment.tz(`${fecha} ${hora}`, 'America/Cancun').toDate();
      const endDateTime = moment(startDateTime).add(1, 'hour').toDate(); // Duración de 1 hora

      const event = {
        summary: `Cita con ${name}`,
        start: { dateTime: startDateTime, timeZone: 'America/Cancun' },
        end: { dateTime: endDateTime, timeZone: 'America/Cancun' }, // Añadir tiempo de finalización
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

        await sendEmail(
          email,
          'Cita confirmada',
          `Hola ${name}, tu cita está confirmada para el ${fecha} a las ${hora}.\nAquí tienes el enlace de Google Meet: ${eventResponse.data.hangoutLink}`
        );

        const messageResponse = `¡Hola ${name}! 🙌\n\nTu cita está confirmada para el ${fecha} a las ${hora}. Aquí tienes el enlace de Google Meet: ${eventResponse.data.hangoutLink}.\n\n¡Saludos! 🚀😃`;
        await WhatsAppService.sendMessage(phoneNumber, messageResponse);

        adminNotificationMessage += `Estado: Agendado en Google Calendar\nEnlace: ${eventResponse.data.hangoutLink}`;
      } catch (error) {
        console.error('Error al crear el evento en Google Calendar:', error);
        return res
          .status(500)
          .json({ success: false, error: 'Error al crear el evento en Google Calendar' });
      }
    } else {
      adminNotificationMessage += `Estado: No agendó en Google Calendar`;
    }

    await sendEmail('jarrayago@abc.gob.ar', 'Nueva cita agendada', adminNotificationMessage);

    return res.status(201).json({ success: true, message: 'Cita creada correctamente' });
  } catch (error) {
    console.error('Error en crearCita:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { crearCita };
