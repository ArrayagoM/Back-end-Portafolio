const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const QRCode = require('qrcode');
const moment = require('moment-timezone');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// Configuración de Google Calendar (igual que antes)
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Objeto para manejar el estado de las conversaciones (por número)
const conversationStates = {};

// Función stub para transcribir audio
// Función para transcribir el audio de WhatsApp usando el script Python
// Función para transcribir el audio
async function transcribeAudio(msg) {
  console.log('Transcribiendo audio con OpenAI...');

  // Descarga el audio desde WhatsApp
  const media = await msg.downloadMedia();
  if (!media) {
    throw new Error('No se pudo descargar el audio.');
  }

  // Guarda el audio en un archivo temporal. IMPORTANTE: el archivo debe estar en formato WAV
  const tempAudioPath = path.join(__dirname, 'temp_audio.wav'); // Aquí guardas el archivo como temp_audio.wav
  fs.writeFileSync(tempAudioPath, Buffer.from(media.data, 'base64'));

  return new Promise((resolve, reject) => {
    // Llama al script Python que procesa el audio descargado
    const scriptPath = path.join(__dirname, 'transcribe.py');
    exec(`python3 "${scriptPath}" "${tempAudioPath}"`, (err, stdout, stderr) => {
      // Borra el archivo temporal después de la transcripción
      fs.unlinkSync(tempAudioPath);
      if (err) {
        console.error('Error ejecutando transcribe.py:', err);
        return reject(err);
      }
      // stdout contendrá la transcripción y los prints de [DEBUG], por lo que puedes extraer la última línea
      const lines = stdout.trim().split('\n');
      const transcription = lines[lines.length - 1];
      resolve(transcription);
    });
  });
}

class WhatsAppService {
  constructor() {
    this.lastQR = null; // Almacenar el último QR generado
    this.isReady = false; // Estado del cliente

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'cliente-1',
        dataPath: path.join(__dirname, '../../tmp/.wwebjs_auth'),
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    });

    this.initializeClient();
  }

  // Inicializar cliente de WhatsApp
  initializeClient() {
    this.client.on('qr', (qr) => {
      this.isReady = false; // Cliente no está listo
      this.lastQR = qr; // Almacenar el QR actual
      console.log('Se generó un nuevo QR para conectar WhatsApp.');
    });

    this.client.on('ready', () => {
      this.isReady = true; // Cliente está listo
      this.lastQR = null; // Limpiar el QR ya que hay sesión activa
      console.log('Cliente de WhatsApp listo para enviar mensajes.');
    });

    this.client.on('disconnected', (reason) => {
      console.log(`Cliente desconectado: ${reason}`);
      this.isReady = false; // Cliente no está listo
      setTimeout(() => {
        this.client.initialize();
      }, 5000);
    });

    this.client.on('message', async (msg) => {
      const phone = msg.from; // Formato: "123456789@c.us"

      let incomingText = msg.body ? msg.body.trim() : '';
      const text = incomingText.toLowerCase();

      // Si el usuario escribe "menu"
      if (text === 'menu') {
        await msg.reply(
          `Bienvenido al menú de opciones. Aquí están las opciones disponibles:
          
1. **Agendar una cita**: Responde con "agendar" para agendar una cita.
2. **Cancelar cita**: Responde con "cancelar" para cancelar una cita agendada (en desarrollo).
3. **Más información**: Responde con "más" para recibir más detalles sobre cómo agendar una cita.

Para agendar una cita, solo escribe "agendar" y sigue las instrucciones.`
        );
        return;
      }

      // Si no hay estado, evaluamos si el usuario quiere agendar
      if (!conversationStates[phone]) {
        if (text === 'agendar') {
          conversationStates[phone] = { state: 'waiting_for_name' };
          await msg.reply('¡Perfecto! Para agendar tu cita, primero necesito tu nombre completo.');
        }
        return;
      }

      // Si ya existe un estado, procesamos según la etapa en la conversación
      const conv = conversationStates[phone];

      // Si el bot está esperando el nombre
      if (conv.state === 'waiting_for_name') {
        conv.name = incomingText; // Guardamos el nombre del usuario
        conv.state = 'waiting_for_email';
        await msg.reply('Gracias. Ahora, por favor, proporciona tu correo electrónico.');
      }

      // Si el bot está esperando el email
      else if (conv.state === 'waiting_for_email') {
        conv.email = incomingText; // Guardamos el email del usuario
        conv.state = 'waiting_for_datetime';
        await msg.reply(
          'Gracias. Ahora, por favor, indícame la fecha y hora de la cita en uno de estos formatos:\n\n• Formato 1: YYYY-MM-DD HH:mm (ejemplo: 2025-03-13 13:00 horas)\n• Formato 2: DD-MM-YYYY HH:mm (ejemplo: 13-03-2025 13:00 hs)'
        );
      }

      // Si el bot está esperando la fecha y hora
      else if (conv.state === 'waiting_for_datetime') {
        // Limpiamos palabras residuales y procesamos la fecha/hora
        let dateTimeText = incomingText.replace(/(horas|hs)/gi, '').trim();
        let dateTime = moment.tz(dateTimeText, 'YYYY-MM-DD HH:mm', 'America/Cancun');
        if (!dateTime.isValid()) {
          dateTime = moment.tz(dateTimeText, 'DD-MM-YYYY HH:mm', 'America/Cancun');
        }
        if (!dateTime.isValid() || dateTime.isBefore(moment())) {
          await msg.reply(
            'La fecha y hora no son válidas o ya han pasado. Por favor, envía una fecha y hora futuras en alguno de los formatos indicados.'
          );
          return;
        }
        conv.dateTime = dateTime;
        conv.state = 'waiting_for_confirmation';
        const formattedDate = dateTime.format('DD-MM-YYYY');
        const formattedTime = dateTime.format('HH:mm');
        await msg.reply(
          `¿Confirmas agendar la cita para el ${formattedDate} a las ${formattedTime}? Responde con "sí" para confirmar o "no" para cancelar.`
        );
      }

      // Si está esperando confirmación
      else if (conv.state === 'waiting_for_confirmation') {
        if (text === 'sí' || text === 'si') {
          // Crear el evento en Google Calendar
          try {
            const startDateTime = conv.dateTime.toDate();
            const endDateTime = conv.dateTime.clone().add(1, 'hour').toDate();
            const event = {
              summary: `Cita agendada para ${conv.name}`,
              description: `Cita con ${conv.name} - Email: ${conv.email}`,
              start: { dateTime: startDateTime, timeZone: 'America/Cancun' },
              end: { dateTime: endDateTime, timeZone: 'America/Cancun' },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 1440 },
                  { method: 'popup', minutes: 30 },
                ],
              },
            };

            const eventResponse = await calendar.events.insert({
              calendarId: process.env.CALENDAR_ID,
              resource: event,
            });

            // Extraer el enlace del evento desde la propiedad htmlLink
            const calendarLink = eventResponse.data.htmlLink;

            // Enviar el enlace de Google Calendar al usuario
            await msg.reply(
              `¡Cita agendada exitosamente! Aquí tienes el enlace para ver la cita en Google Calendar: ${calendarLink}\n\nRecibirás una notificación un día antes y 30 minutos antes de la cita.`
            );
          } catch (error) {
            console.error('Error al agendar la cita:', error);
            await msg.reply(
              'Ocurrió un error al agendar tu cita. Por favor, inténtalo de nuevo más tarde.'
            );
          }
          delete conversationStates[phone];
        } else if (text === 'no') {
          await msg.reply('La solicitud de agendamiento ha sido cancelada.');
          delete conversationStates[phone];
        } else {
          await msg.reply(
            "Respuesta no reconocida. Por favor, responde con 'sí' para confirmar o 'no' para cancelar."
          );
        }
      }
    });

    this.client
      .initialize()
      .then(() => console.log('Cliente de WhatsApp inicializado.'))
      .catch((err) => console.error('Error al inicializar el cliente:', err));
  }

  // Obtener el estado del cliente y el QR si no hay sesión activa
  async getClientStatus() {
    if (this.isReady) {
      return { status: 204 }; // Cliente ya tiene sesión activa
    }

    if (this.lastQR) {
      const qrCodeDataURL = await QRCode.toDataURL(this.lastQR); // Convertir QR a DataURL
      return { status: 200, qr: qrCodeDataURL }; // Devolver QR si no hay sesión activa
    }

    return { status: 200, qr: null, message: 'Esperando conexión' }; // Caso de error inesperado
  }

  // Enviar mensaje a un número de WhatsApp
  async sendMessage(number, message) {
    if (!number || number.trim() === '') {
      return;
    }

    const isValidNumber = /^\+\d{10,15}$/.test(number);
    if (!isValidNumber) {
      throw new Error('Número no válido');
    }

    const formattedNumber = `${number.replace(/\+/g, '')}@c.us`;

    try {
      const response = await this.client.sendMessage(formattedNumber, message);
      console.log('mensage de whatsapp enviado correctamente');
      return response;
    } catch (error) {
      console.error(`Error enviando mensaje a ${formattedNumber}:`, error.message);
      throw error;
    }
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
