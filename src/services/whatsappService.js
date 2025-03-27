const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const QRCode = require('qrcode');
const BotService = require('./botService');
const moment = require('moment-timezone');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// Configuración de Google Calendar
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL
);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

class WhatsAppService {
  constructor() {
    this.lastQR = null;
    this.isReady = false;
    this.botService = new BotService(this);
    this.messageQueue = new Map(); // Cola de mensajes para manejar envíos fallidos

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'cliente-1',
        dataPath: path.join(__dirname, '../../tmp/.wwebjs_auth'),
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
      takeoverOnConflict: true,
      takeoverTimeoutMs: 10000
    });

    this.initializeClient();
    this.setupCleanupInterval();
  }

  initializeClient() {
    this.client.on('qr', (qr) => {
      this.isReady = false;
      this.lastQR = qr;
      console.log('Nuevo QR generado');
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.lastQR = null;
      console.log('Cliente de WhatsApp listo');
      this.processMessageQueue(); // Procesar mensajes en cola al estar listo
    });

    this.client.on('disconnected', (reason) => {
      console.log(`Cliente desconectado: ${reason}`);
      this.isReady = false;
      setTimeout(() => {
        this.client.initialize();
      }, 10000);
    });

    this.client.on('message', async (msg) => {
      try {
        if (!msg || !msg.from || msg.from === 'status@broadcast') return;
        
        // Validación adicional del objeto de mensaje
        if (!msg.id || !msg.body || !msg.from) {
          console.warn('Mensaje recibido con estructura inválida:', msg);
          return;
        }

        await this.botService.handleMessage(msg);
      } catch (error) {
        console.error('Error en el manejo del mensaje:', error);
        await this.safeReply(msg, '⚠️ Ocurrió un error al procesar tu mensaje. Por favor intenta nuevamente.');
      }
    });

    this.client.initialize().catch((err) => {
      console.error('Error al inicializar:', err);
      setTimeout(() => this.client.initialize(), 15000);
    });
  }

  async safeReply(msg, content, options = {}) {
    const maxRetries = 3;
    let attempts = 0;
    const messageId = msg.id.id || Date.now().toString();
    
    while (attempts < maxRetries) {
      attempts++;
      try {
        // Intento principal con reply
        await msg.reply(content, { ...options, quotedMessageId: null });
        return true;
      } catch (replyError) {
        console.error(`Intento ${attempts} fallido (reply):`, replyError);
        
        try {
          // Fallback 1: Envío directo al chat
          const chat = await msg.getChat();
          await chat.sendMessage(content);
          return true;
        } catch (chatError) {
          console.error(`Intento ${attempts} fallido (chat.sendMessage):`, chatError);
          
          try {
            // Fallback 2: Envío por ID de contacto
            const contact = await msg.getContact();
            await this.client.sendMessage(contact.id._serialized, content);
            return true;
          } catch (contactError) {
            console.error(`Intento ${attempts} fallido (sendMessage by ID):`, contactError);
            
            if (attempts === maxRetries) {
              // Agregar a cola para reintento posterior
              this.messageQueue.set(messageId, { msg, content, options });
              console.warn('Mensaje agregado a cola para reintento:', messageId);
              return false;
            }
            
            // Esperar antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          }
        }
      }
    }
    return false;
  }

  async processMessageQueue() {
    if (!this.isReady || this.messageQueue.size === 0) return;
    
    console.log(`Procesando cola de ${this.messageQueue.size} mensajes pendientes...`);
    
    for (const [messageId, { msg, content, options }] of this.messageQueue) {
      try {
        const success = await this.safeReply(msg, content, options);
        if (success) {
          this.messageQueue.delete(messageId);
        }
      } catch (error) {
        console.error(`Error procesando mensaje ${messageId} de la cola:`, error);
      }
    }
  }

  setupCleanupInterval() {
    setInterval(() => {
      this.processMessageQueue();
    }, 60000); // Procesar cola cada minuto
  }

  async handleCalendarEvent(eventDetails) {
    try {
      const event = {
        summary: eventDetails.summary,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.startDateTime,
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: eventDetails.endDateTime,
          timeZone: 'America/Mexico_City',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink
      };
    } catch (error) {
      console.error('Error al crear evento en el calendario:', error);
      throw {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  async getClientStatus() {
    if (this.isReady) return { status: 'connected', qr: null };
    
    if (this.lastQR) {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(this.lastQR);
        return { 
          status: 'waiting_qr', 
          qr: qrCodeDataURL,
          message: 'Escanee el código QR para conectar'
        };
      } catch (error) {
        console.error('Error generando QR:', error);
        return { 
          status: 'error', 
          qr: null, 
          message: 'Error al generar QR' 
        };
      }
    }
    
    return { 
      status: 'initializing', 
      qr: null, 
      message: 'Inicializando cliente WhatsApp...' 
    };
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isReady) {
      throw new Error('Cliente de WhatsApp no está listo');
    }

    try {
      // Validación y formato del número de teléfono
      const formattedNumber = phoneNumber.replace(/\D/g, '');
      if (!formattedNumber) {
        throw new Error('Número de teléfono no válido');
      }

      const numberId = await this.client.getNumberId(formattedNumber);
      if (!numberId) {
        throw new Error('Número no registrado en WhatsApp');
      }

      // Validación del contenido del mensaje
      if (!message || typeof message !== 'string') {
        throw new Error('El mensaje no puede estar vacío');
      }

      const sentMessage = await this.client.sendMessage(numberId._serialized, message);
      return {
        success: true,
        messageId: sentMessage.id.id,
        timestamp: sentMessage.timestamp
      };
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw {
        success: false,
        error: error.message,
        isBusiness: error.message.includes('business account')
      };
    }
  }
}
const whatsappService = new WhatsAppService();
module.exports = whatsappService;





