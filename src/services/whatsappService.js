const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const QRCode = require('qrcode');
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

// Objeto para manejar el estado de las conversaciones
const conversationStates = {};

class WhatsAppService {
  constructor() {
    this.lastQR = null;
    this.isReady = false;
    this.userSessions = {};

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
    });

    this.client.on('disconnected', (reason) => {
      console.log(`Cliente desconectado: ${reason}`);
      this.isReady = false;
      setTimeout(() => {
        this.client.initialize();
      }, 5000);
    });

    this.client.on('message', async (msg) => {
      try {
        if (msg.from.endsWith('@g.us')) return;
        const phone = msg.from;
        let incomingText = msg.body ? msg.body.trim() : '';
        const text = incomingText.toLowerCase();
        const now = new Date();

        // Actualizar última interacción
        this.userSessions[phone] = now;

        // Limpieza de sesiones antiguas
        this.cleanOldSessions();

        // Detección de comandos principales
        if (await this.handleMainCommands(msg, phone, text)) return;

        // Si no hay estado previo, mostrar menú
        if (!conversationStates[phone]) {
          await this.showMainMenu(msg);
          return;
        }

        // Procesar conversación existente
        const conv = conversationStates[phone];

        // Flujo para presupuestos
        if (conv.type === 'presupuesto') {
          await this.handleBudgetFlow(msg, conv, phone, text, incomingText);
          return;
        }

        // Flujo para citas
        if (conv.type === 'cita') {
          await this.handleAppointmentFlow(msg, conv, phone, text, incomingText);
          return;
        }
      } catch (error) {
        console.error('Error en el manejo del mensaje:', error);
      }
    });

    this.client.initialize().catch((err) => console.error('Error al inicializar:', err));
  }

  async cleanOldSessions() {
    const now = new Date();
    for (const [phone, lastInteraction] of Object.entries(this.userSessions)) {
      if (now - lastInteraction > 30 * 60 * 1000) {
        // 30 minutos de inactividad
        delete this.userSessions[phone];
        delete conversationStates[phone];
      }
    }
  }

  async handleMainCommands(msg, phone, text) {
    // Comandos que pueden interrumpir cualquier flujo
    const interruptCommands = {
      menu: () => this.showMainMenu(msg),
      ayuda: () => this.showHelp(msg),
      cancelar: () => this.cancelOperation(msg, phone),
      reiniciar: () => this.resetConversation(msg, phone),
      hola: () => this.greetUser(msg),
    };

    for (const [cmd, handler] of Object.entries(interruptCommands)) {
      if (text === cmd) {
        await handler();
        return true;
      }
    }

    // Detección de intenciones principales
    if (!conversationStates[phone]) {
      const intent = this.detectIntent(text);
      if (intent === 'presupuesto') {
        conversationStates[phone] = {
          state: 'project_selection',
          type: 'presupuesto',
          lastInteraction: new Date(),
        };
        await this.startBudgetConversation(msg);
        return true;
      }
      if (intent === 'cita') {
        conversationStates[phone] = {
          state: 'waiting_for_name',
          type: 'cita',
          lastInteraction: new Date(),
        };
        await msg.reply('📅 ¡Vamos a agendar tu cita! Por favor, dime tu nombre completo:');
        return true;
      }
    }

    return false;
  }

  detectIntent(text) {
    const presupuestoWords = ['presupuesto', 'cotiz', 'precio', 'costo', 'valor', 'cuánto cuesta'];
    const citaWords = ['agendar', 'cita', 'reunión', 'consulta', 'asesoría'];

    if (presupuestoWords.some((word) => text.includes(word))) return 'presupuesto';
    if (citaWords.some((word) => text.includes(word))) return 'cita';
    return null;
  }

  async showMainMenu(msg) {
    await msg.reply(
      `¡Hola! 👋 Soy tu asistente digital. ¿En qué puedo ayudarte?\n\n` +
        `🔹 *Menú Principal*:\n\n` +
        `1. 📅 *Agendar cita* - Escribe "agendar"\n` +
        `2. 💰 *Presupuesto* - Escribe "presupuesto"\n` +
        `3. 📋 *Nuestros servicios* - Escribe "servicios"\n` +
        `4. 📞 *Contacto directo* - Escribe "contacto"\n\n` +
        `💡 También puedes decirme directamente qué necesitas, como:\n` +
        `- "Quiero un presupuesto para una app móvil"\n` +
        `- "Necesito agendar una cita para mañana"`
    );
  }

  async startBudgetConversation(msg) {
    await msg.reply(
      `🌟 ¡Perfecto! Vamos a crear tu presupuesto personalizado. 🚀\n\n` +
        `📌 *Primero dime qué tipo de proyecto necesitas:*\n\n` +
        `1️⃣ 🛍️ E-commerce/Tienda online\n` +
        `2️⃣ 📱 Aplicación móvil\n` +
        `3️⃣ 🤖 IoT/Robótica\n` +
        `4️⃣ 🌐 Sitio web corporativo\n` +
        `5️⃣ 🧠 Sistema personalizado\n` +
        `6️⃣ ❓ No estoy seguro/Ayúdame\n\n` +
        `💡 Responde con el número o nombre del proyecto.`
    );
  }

  async handleBudgetFlow(msg, conv, phone, text, incomingText) {
    conv.lastInteraction = new Date();

    // Mapeo de opciones de proyecto mejorado
    const projectOptions = {
      // E-commerce
      1: 'ecommerce',
      ecommerce: 'ecommerce',
      tienda: 'ecommerce',
      online: 'ecommerce',
      comercio: 'ecommerce',
      venta: 'ecommerce',

      // App móvil
      2: 'app_movil',
      app: 'app_movil',
      móvil: 'app_movil',
      movil: 'app_movil',
      aplicacion: 'app_movil',
      celular: 'app_movil',

      // IoT/Robótica
      3: 'iot',
      robotica: 'iot',
      robótica: 'iot',
      arduino: 'iot',
      sensores: 'iot',
      raspberry: 'iot',

      // Sitio web
      4: 'web',
      sitio: 'web',
      página: 'web',
      pagina: 'web',
      landing: 'web',
      corporativo: 'web',

      // Sistema personalizado
      5: 'sistema',
      personalizado: 'sistema',
      software: 'sistema',
      programa: 'sistema',

      // No está seguro
      6: 'indeciso',
      'no sé': 'indeciso',
      'no se': 'indeciso',
      ayuda: 'indeciso',
      indeciso: 'indeciso',
    };

    if (conv.state === 'project_selection') {
      const selectedProject = projectOptions[text.toLowerCase()];

      if (selectedProject) {
        conv.projectType = selectedProject;
        conv.state = `${selectedProject}_details`;

        // Mensajes específicos para cada tipo de proyecto
        const projectMessages = {
          ecommerce:
            `🛍️ *TIENDA ONLINE* - ¡Excelente elección! 💻\n\n` +
            `Nuestros paquetes incluyen:\n` +
            `• Catálogo de productos\n` +
            `• Creació y carga de nuevo productos\n` +
            `• Crear productos %OFF/ super%OFF/ Liquidación\n` +
            `• Redirecionamiento A WhatsApp Bussiness\n` +
            `• Panel administrativo Donde se puede crear, editar y elimiinar los productos\n\n` +
            `💰 *Desde $350 USD*\n\n` +
            `💰 *Aquí un ejemplo de lado del cliente https://vercel.com/teamsgamers/client-tu-y-yo *\n\n` +
            `¿Qué prefieres?\n1. Paquete básico\n2. Solución personalizada\n3. Comparar opciones\n\n` +
            `Responde con el número o "no sé" para ayuda.`,

          app_movil:
            `📱 *APLICACIÓN MÓVIL* - El futuro en tus manos! 📲\n\n` +
            `Primero necesito saber:\n` +
            `• ¿Para qué plataforma? (iOS, Android o ambas)\n` +
            `• ¿Tienes backend existente? 🖥️\n` +
            `• Funcionalidades clave (ej: GPS, cámara, pagos)\n\n` +
            `💡 *Ejemplo de respuesta:* "Android, sin backend, necesita GPS y Facebook Login"`,

          indeciso:
            `🤔 *NO ESTOY SEGURO* - ¡No hay problema! ✨\n\n` +
            `Responde estas preguntas:\n` +
            `1. ¿Qué problema quieres resolver?\n` +
            `2. ¿Quiénes usarán tu solución?\n` +
            `3. ¿Tienes algún plazo especial?\n\n` +
            `💭 *Ejemplo:* "Quiero ayudar a pequeños negocios a vender en línea antes de Navidad"`,
        };

        await msg.reply(
          projectMessages[selectedProject] ||
            `🔧 *PROYECTO PERSONALIZADO* - ¡Vamos a crearlo juntos! 🛠️\n\n` +
              `Por favor describe:\n` +
              `• 3 funcionalidades principales\n` +
              `• Público objetivo\n` +
              `• Plazo estimado\n\n` +
              `✏️ *Ejemplo:* "Sistema de reservas con calendario, pagos online y notificaciones SMS para hoteles pequeños"`
        );
      } else {
        await msg.reply(
          `⚠️ No reconocí tu respuesta. Por favor elige:\n\n` +
            `1. E-commerce\n2. App móvil\n3. IoT/Robótica\n4. Sitio web\n5. Sistema personalizado\n6. No estoy seguro\n\n` +
            `O dime "ayuda" si necesitas orientación.`
        );
      }
      return;
    }

    // Estados específicos para cada tipo de proyecto
    if (conv.state === 'ecommerce_details') {
      if (['1', 'basico', 'básico', 'paquete'].includes(text.toLowerCase())) {
        conv.package = 'basic';
        conv.state = 'ecommerce_basic_details';
        await msg.reply(
          `🛒 *PAQUETE BÁSICO E-COMMERCE* - Buena elección! ✅\n\n` +
            `💰 *Inversión:* $350 USD\n` +
            `⏱️ *Tiempo estimado:* 2-3 semanas\n\n` +
            `📌 *Para finalizar, necesito saber:*\n\n` +
            `1. ¿Ya tienes dominio y hosting? (SI/NO)\n` +
            `2. ¿Necesitas diseño de logo? (SI/NO)\n` +
            `3. ¿Tienes imágenes de productos? (SI/NO)\n\n` +
            `💡 *Ejemplo de respuesta:* "SI, NO, SI"`
        );
      } else if (['2', 'personalizado', 'personalizada'].includes(text.toLowerCase())) {
        conv.package = 'custom';
        conv.state = 'ecommerce_custom_details';
        await msg.reply(
          `🔧 *E-COMMERCE PERSONALIZADO* - ¡Vamos a crear algo único! 🎨\n\n` +
            `Por favor describe:\n` +
            `1. Número estimado de productos\n` +
            `2. Métodos de pago necesarios\n` +
            `3. Integraciones especiales (ERP, CRM, etc.)\n` +
            `4. Requerimientos de diseño\n\n` +
            `✏️ *Ejemplo:* "200 productos, PayPal y tarjetas, conexión con QuickBooks, diseño minimalista"`
        );
      } else {
        await msg.reply(
          `No entendí tu respuesta. Por favor elige:\n` +
            `1. Paquete básico ($350)\n` +
            `2. Solución personalizada\n` +
            `3. Comparar opciones\n\n` +
            `O escribe "cancelar" para volver al menú.`
        );
      }
      return;
    }

    if (conv.state === 'ecommerce_basic_details') {
      const responses = incomingText.split(',').map((r) => r.trim().toLowerCase());
      if (
        responses.length !== 3 ||
        !['si', 'no'].includes(responses[0]) ||
        !['si', 'no'].includes(responses[1]) ||
        !['si', 'no'].includes(responses[2])
      ) {
        await msg.reply(
          `⚠️ Formato incorrecto. Por favor responde las 3 preguntas con SI/NO separadas por comas.\n\n` +
            `*Ejemplo:* "SI, NO, SI"`
        );
        return;
      }

      const [hasDomain, needsLogo, hasProductsImages] = responses;
      let extras = [];
      let total = 350;

      if (hasDomain === 'no') {
        extras.push('Registro de dominio (+$15/año)');
        total += 15;
      }
      if (needsLogo === 'si') {
        extras.push('Diseño de logo básico (+$50)');
        total += 50;
      }
      if (hasProductsImages === 'no') {
        extras.push('Sesión fotográfica básica (+$100)');
        total += 100;
      }

      let replyMsg =
        `📝 *RESUMEN DE TU COTIZACIÓN* 🧾\n\n` +
        `🛒 *Paquete Básico E-commerce*\n` +
        `• Precio base: $350 USD\n`;

      if (extras.length > 0) {
        replyMsg +=
          `\n🔹 *Extras incluidos:*\n${extras.map((e) => `• ${e}`).join('\n')}\n\n` +
          `💵 *Total estimado:* $${total} USD\n`;
      } else {
        replyMsg += `\n• No se agregaron extras\n` + `💵 *Total:* $350 USD\n`;
      }

      replyMsg +=
        `⏳ *Tiempo estimado:* ${extras.length > 0 ? '3-4' : '2-3'} semanas\n\n` +
        `¿Todo parece correcto? (Responde *CONFIRMAR* o *AJUSTAR*)`;

      await msg.reply(replyMsg);
      conv.state = 'ecommerce_confirmation';
      conv.quoteDetails = { total, extras };
      return;
    }

    if (conv.state === 'ecommerce_confirmation') {
      if (text.includes('confirmar') || text === 'si') {
        await msg.reply(
          `🎉 *¡COTIZACIÓN CONFIRMADA!* 🎊\n\n` +
            `📌 *Próximos pasos:*\n` +
            `1. Un asesor te contactará en menos de 2 horas\n` +
            `2. Recibirás un cuestionario de requisitos\n` +
            `3. Programaremos reunión de inicio\n\n` +
            `⏳ *Fecha estimada de entrega:* ${moment()
              .add(extras.length > 0 ? 21 : 14, 'days')
              .format('DD/MM/YYYY')}\n\n` +
            `💡 *Prepárate:*\n` +
            `• Reúne imágenes de productos\n` +
            `• Piensa en tus colores favoritos\n` +
            `• Ten a mano tus datos fiscales\n\n` +
            `¿Alguna otra pregunta antes de finalizar?`
        );
        delete conversationStates[phone];
      } else if (text.includes('ajustar')) {
        await msg.reply(
          `🔧 *¿Qué necesitas ajustar?*\n\n` +
            `1. Agregar más productos\n` +
            `2. Incluir métodos de pago adicionales\n` +
            `3. Necesito diseño personalizado\n` +
            `4. Otro (especificar)\n\n` +
            `Responde con el número o descripción`
        );
        conv.state = 'ecommerce_adjustments';
      } else {
        await msg.reply(`Por favor confirma con *CONFIRMAR* o solicita cambios con *AJUSTAR*`);
      }
      return;
    }

    // Manejo de otros estados del flujo de presupuesto...
  }

  async handleAppointmentFlow(msg, conv, phone, text, incomingText) {
    conv.lastInteraction = new Date();

    if (conv.state === 'waiting_for_name') {
      if (incomingText.length < 3) {
        await msg.reply('El nombre parece muy corto. Por favor ingresa tu nombre completo:');
        return;
      }
      conv.name = incomingText;
      conv.state = 'waiting_for_email';
      await msg.reply(`Gracias ${incomingText}. Ahora necesito tu email para la confirmación:`);
      return;
    }

    if (conv.state === 'waiting_for_email') {
      if (!incomingText.includes('@') || !incomingText.includes('.')) {
        await msg.reply('El email no parece válido. Por favor ingresa un email correcto:');
        return;
      }
      conv.email = incomingText;
      conv.state = 'waiting_for_datetime';
      await msg.reply(
        `Perfecto. Ahora indícame la fecha y hora para la cita:\n\n` +
          `Puedes usar formatos como:\n` +
          `• "15/03 a las 3pm"\n` +
          `• "2025-03-15 15:00"\n` +
          `• "próximo lunes a las 10"\n\n` +
          `💡 Horario de atención: Lunes a Viernes 9am - 6pm`
      );
      return;
    }

    if (conv.state === 'waiting_for_datetime') {
      const dateTime = this.parseDateTime(incomingText);
      if (!dateTime || !dateTime.isValid()) {
        await msg.reply(
          `No pude entender la fecha/hora. Por favor usa formatos como:\n` +
            `• "15/03 a las 3pm"\n` +
            `• "2025-03-15 15:00"\n` +
            `• "próximo lunes a las 10"`
        );
        return;
      }

      // Validar horario laboral
      if (
        dateTime.hour() < 9 ||
        dateTime.hour() >= 18 ||
        dateTime.day() === 0 ||
        dateTime.day() === 6
      ) {
        await msg.reply(
          `⚠️ Solo agendamos citas de Lunes a Viernes entre 9am y 6pm.\n` +
            `Por favor elige otro horario:`
        );
        return;
      }

      conv.dateTime = dateTime;
      conv.state = 'waiting_for_confirmation';
      await msg.reply(
        `¿Confirmas la cita para el ${dateTime.format('dddd D [de] MMMM [a las] HH:mm')}?\n\n` +
          `Responde *CONFIRMAR* para agendar o *CAMBIO* para modificar.`
      );
      return;
    }

    if (conv.state === 'waiting_for_confirmation') {
      if (text.includes('confirmar') || text === 'si') {
        try {
          const event = {
            summary: `Cita con ${conv.name}`,
            description: `Contacto: ${conv.email}\nAgendado por WhatsApp`,
            start: {
              dateTime: conv.dateTime.toISOString(),
              timeZone: 'America/Mexico_City',
            },
            end: {
              dateTime: conv.dateTime.clone().add(1, 'hour').toISOString(),
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

          const eventResponse = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
          });

          await msg.reply(
            `✅ *¡CITA AGENDADA CON ÉXITO!*\n\n` +
              `📅 *Fecha:* ${conv.dateTime.format('dddd D [de] MMMM')}\n` +
              `⏰ *Hora:* ${conv.dateTime.format('HH:mm')}\n\n` +
              `📩 Recibirás un correo de confirmación con los detalles.\n` +
              `🔔 Te avisaremos 1 día y 30 minutos antes.\n\n` +
              `¿Necesitas algo más?`
          );
          delete conversationStates[phone];
        } catch (error) {
          console.error('Error al agendar cita:', error);
          await msg.reply(
            `⚠️ Hubo un error al agendar tu cita. Por favor intenta nuevamente o contáctanos directamente.`
          );
        }
      } else {
        conv.state = 'waiting_for_datetime';
        await msg.reply(`Indícame la nueva fecha y hora que prefieras:`);
      }
      return;
    }
  }

  parseDateTime(text) {
    // Implementación de parser de fecha/hora
    // ...
  }

  async showHelp(msg) {
    await msg.reply(
      `🆘 *CENTRO DE AYUDA*\n\n` +
        `Puedes usar estos comandos:\n\n` +
        `• *menu* - Ver opciones principales\n` +
        `• *presupuesto* - Solicitar cotización\n` +
        `• *agendar* - Programar una cita\n` +
        `• *cancelar* - Detener acción actual\n` +
        `• *reiniciar* - Comenzar desde cero\n\n` +
        `¿En qué más puedo ayudarte?`
    );
  }

  async cancelOperation(msg, phone) {
    delete conversationStates[phone];
    await msg.reply(
      `Operación cancelada. ¿En qué más puedo ayudarte? Escribe *MENU* para ver opciones.`
    );
  }

  async resetConversation(msg, phone) {
    delete conversationStates[phone];
    await msg.reply(`Conversación reiniciada. ¿Cómo puedo ayudarte hoy?`);
    await this.showMainMenu(msg);
  }

  async greetUser(msg) {
    await msg.reply(`¡Hola! 👋 ¿En qué puedo ayudarte hoy? Escribe *MENU* para ver opciones.`);
  }

  async getClientStatus() {
    if (this.isReady) return { status: 204 };
    if (this.lastQR) {
      const qrCodeDataURL = await QRCode.toDataURL(this.lastQR);
      return { status: 200, qr: qrCodeDataURL };
    }
    return { status: 200, qr: null, message: 'Esperando conexión' };
  }

  async sendMessage(phoneNumber, message) {
    try {
      if (!this.isReady) {
        console.error('Cliente no está listo');
        return false;
      }

      const numberId = await this.client.getNumberId(phoneNumber.replace('+', ''));
      if (!numberId) {
        console.error('Número no registrado en WhatsApp:', phoneNumber);
        return false;
      }

      await this.client.sendMessage(numberId._serialized, message);
      console.log(`Mensaje enviado a ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      return false;
    }
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
