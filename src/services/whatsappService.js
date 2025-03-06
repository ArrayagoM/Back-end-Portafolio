const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const QRCode = require('qrcode');

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
      return response;
    } catch (error) {
      console.error(`Error enviando mensaje a ${formattedNumber}:`, error.message);
      throw error;
    }
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
