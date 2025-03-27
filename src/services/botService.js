const moment = require('moment-timezone');
const Proyect = require('../models/Proyect');

class BotService {
  constructor(whatsappService) {
    this.whatsapp = whatsappService;
    this.userSessions = {};
    this.conversationStates = {};
    this.setupSessionCleanup();
  }

  async handleMessage(msg) {
    try {
      // Validación básica del mensaje
      if (!msg || !msg.from || !msg.body) {
        console.warn('Mensaje inválido recibido:', msg);
        return;
      }

      const phone = msg.from;
      const incomingText = msg.body.trim();
      const text = incomingText.toLowerCase();
      const now = new Date();

      // Actualizar última interacción
      this.userSessions[phone] = now;

      // Manejar comandos principales
      if (await this.handleMainCommands(msg, phone, text)) return;

      // Si no hay estado previo, mostrar menú
      if (!this.conversationStates[phone]) {
        await this.showMainMenu(msg);
        return;
      }

      // Procesar conversación existente
      await this.processConversation(msg, phone, text, incomingText);
    } catch (error) {
      console.error('Error en BotService.handleMessage:', error);
      await this.sendSafeReply(
        msg,
        '⚠️ Ocurrió un error al procesar tu mensaje. Por favor intenta nuevamente o escribe *MENU* para reiniciar.'
      );
    }
  }

  async processConversation(msg, phone, text, incomingText) {
    const conv = this.conversationStates[phone];
    conv.lastInteraction = new Date();

    switch (conv.type) {
      case 'presupuesto':
        await this.handleBudgetFlow(msg, conv, phone, text, incomingText);
        break;
      case 'cita':
        await this.handleAppointmentFlow(msg, conv, phone, text, incomingText);
        break;
      default:
        await this.showMainMenu(msg);
        delete this.conversationStates[phone];
    }
  }

  async sendSafeReply(msg, content, options = {}) {
    try {
      await this.whatsapp.safeReply(msg, content, options);
    } catch (error) {
      console.error('Error crítico al enviar mensaje:', error);
      // Intento alternativo sin reply (solo mensaje)
      try {
        const chat = await msg.getChat();
        await chat.sendMessage(content);
      } catch (fallbackError) {
        console.error('Error en fallback de envío:', fallbackError);
      }
    }
  }

  setupSessionCleanup() {
    // Limpiar sesiones cada hora
    setInterval(() => {
      this.cleanOldSessions();
    }, 3600000);
  }

  async cleanOldSessions() {
    const now = new Date();
    const inactiveTime = 30 * 60 * 1000; // 30 minutos

    for (const [phone, lastInteraction] of Object.entries(this.userSessions)) {
      if (now - new Date(lastInteraction) > inactiveTime) {
        delete this.userSessions[phone];
        delete this.conversationStates[phone];
        console.log(`Sesión limpiada para ${phone}`);
      }
    }
  }

  async handleMainCommands(msg, phone, text) {
    const commandMap = {
      menu: () => this.showMainMenu(msg),
      ayuda: () => this.showHelp(msg),
      cancelar: () => this.cancelOperation(msg, phone),
      reiniciar: () => this.resetConversation(msg, phone),
      hola: () => this.greetUser(msg),
      servicios: () => this.showServices(msg),
      contacto: () => this.showContact(msg),
    };

    if (commandMap[text]) {
      await commandMap[text]();
      return true;
    }

    if (!this.conversationStates[phone]) {
      const intent = this.detectIntent(text);
      if (intent === 'presupuesto') {
        this.conversationStates[phone] = {
          state: 'project_selection',
          type: 'presupuesto',
          lastInteraction: new Date(),
        };
        await this.startBudgetConversation(msg);
        return true;
      }
      if (intent === 'cita') {
        this.conversationStates[phone] = {
          state: 'waiting_for_name',
          type: 'cita',
          lastInteraction: new Date(),
        };
        await this.sendSafeReply(
          msg,
          '📅 ¡Vamos a agendar tu cita! Por favor, dime tu nombre completo:'
        );
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
    const menu =
      `¡Hola! 👋 Soy tu asistente digital. ¿En qué puedo ayudarte?\n\n` +
      `🔹 *Menú Principal*:\n\n` +
      `1. 📅 *Agendar cita* - Escribe "agendar"\n` +
      `2. 💰 *Presupuesto* - Escribe "presupuesto"\n` +
      `3. 📋 *Nuestros servicios* - Escribe "servicios"\n` +
      `4. 📞 *Contacto directo* - Escribe "contacto"\n\n` +
      `💡 También puedes decirme directamente qué necesitas.`;

    await this.sendSafeReply(msg, menu);
  }

  async startBudgetConversation(msg) {
    await this.whatsapp.safeReply(
      msg,
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

    const projectOptions = {
      1: 'ecommerce',
      ecommerce: 'ecommerce',
      tienda: 'ecommerce',
      online: 'ecommerce',
      comercio: 'ecommerce',
      venta: 'ecommerce',
      2: 'app_movil',
      app: 'app_movil',
      móvil: 'app_movil',
      movil: 'app_movil',
      aplicacion: 'app_movil',
      celular: 'app_movil',
      3: 'iot',
      robotica: 'iot',
      robótica: 'iot',
      arduino: 'iot',
      sensores: 'iot',
      raspberry: 'iot',
      4: 'web',
      sitio: 'web',
      página: 'web',
      pagina: 'web',
      landing: 'web',
      corporativo: 'web',
      5: 'sistema',
      personalizado: 'sistema',
      software: 'sistema',
      programa: 'sistema',
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

        const projectMessages = {
          ecommerce:
            `🛍️ *TIENDA ONLINE* - ¡Excelente elección! 💻\n\n` +
            `Nuestros paquetes incluyen:\n` +
            `• Catálogo de productos\n` +
            `• Carrito de compras\n` +
            `• Pasarela de pagos\n` +
            `• Panel administrativo\n\n` +
            `💰 *Desde $350 USD*\n\n` +
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

        await this.whatsapp.safeReply(
          msg,
          projectMessages[selectedProject] ||
            `🔧 *PROYECTO PERSONALIZADO* - ¡Vamos a crearlo juntos! 🛠️\n\n` +
              `Por favor describe:\n` +
              `• 3 funcionalidades principales\n` +
              `• Público objetivo\n` +
              `• Plazo estimado\n\n` +
              `✏️ *Ejemplo:* "Sistema de reservas con calendario, pagos online y notificaciones SMS para hoteles pequeños"`
        );
      } else {
        await this.whatsapp.safeReply(
          msg,
          `⚠️ No reconocí tu respuesta. Por favor elige:\n\n` +
            `1. E-commerce\n2. App móvil\n3. IoT/Robótica\n4. Sitio web\n5. Sistema personalizado\n6. No estoy seguro\n\n` +
            `O dime "ayuda" si necesitas orientación.`
        );
      }
      return;
    }

    // Resto de los estados del flujo de presupuesto...
    // [Implementar según necesidad]
  }

  async handleAppointmentFlow(msg, conv, phone, text, incomingText) {
    conv.lastInteraction = new Date();

    if (conv.state === 'waiting_for_name') {
      if (incomingText.length < 3) {
        await this.whatsapp.safeReply(
          msg,
          'El nombre parece muy corto. Por favor ingresa tu nombre completo:'
        );
        return;
      }
      conv.name = incomingText;
      conv.state = 'waiting_for_email';
      await this.whatsapp.safeReply(
        msg,
        `Gracias ${incomingText}. Ahora necesito tu email para la confirmación:`
      );
      return;
    }

    if (conv.state === 'waiting_for_email') {
      if (!incomingText.includes('@') || !incomingText.includes('.')) {
        await this.whatsapp.safeReply(
          msg,
          'El email no parece válido. Por favor ingresa un email correcto:'
        );
        return;
      }
      conv.email = incomingText;
      conv.state = 'waiting_for_datetime';
      await this.whatsapp.safeReply(
        msg,
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
        await this.whatsapp.safeReply(
          msg,
          `No pude entender la fecha/hora. Por favor usa formatos como:\n` +
            `• "15/03 a las 3pm"\n` +
            `• "2025-03-15 15:00"\n` +
            `• "próximo lunes a las 10"`
        );
        return;
      }

      if (
        dateTime.hour() < 9 ||
        dateTime.hour() >= 18 ||
        dateTime.day() === 0 ||
        dateTime.day() === 6
      ) {
        await this.whatsapp.safeReply(
          msg,
          `⚠️ Solo agendamos citas de Lunes a Viernes entre 9am y 6pm.\n` +
            `Por favor elige otro horario:`
        );
        return;
      }

      conv.dateTime = dateTime;
      conv.state = 'waiting_for_confirmation';
      await this.whatsapp.safeReply(
        msg,
        `¿Confirmas la cita para el ${dateTime.format('dddd D [de] MMMM [a las] HH:mm')}?\n\n` +
          `Responde *CONFIRMAR* para agendar o *CAMBIO* para modificar.`
      );
      return;
    }

    if (conv.state === 'waiting_for_confirmation') {
      if (text.includes('confirmar') || text === 'si') {
        try {
          const eventDetails = {
            summary: `Cita con ${conv.name}`,
            description: `Contacto: ${conv.email}\nAgendado por WhatsApp`,
            startDateTime: conv.dateTime.toISOString(),
            endDateTime: conv.dateTime.clone().add(1, 'hour').toISOString(),
          };

          await this.whatsapp.handleCalendarEvent(eventDetails);

          await this.whatsapp.safeReply(
            msg,
            `✅ *¡CITA AGENDADA CON ÉXITO!*\n\n` +
              `📅 *Fecha:* ${conv.dateTime.format('dddd D [de] MMMM')}\n` +
              `⏰ *Hora:* ${conv.dateTime.format('HH:mm')}\n\n` +
              `📩 Recibirás un correo de confirmación con los detalles.\n` +
              `🔔 Te avisaremos 1 día y 30 minutos antes.\n\n` +
              `¿Necesitas algo más?`
          );
          delete this.conversationStates[phone];
        } catch (error) {
          console.error('Error al agendar cita:', error);
          await this.whatsapp.safeReply(
            msg,
            `⚠️ Hubo un error al agendar tu cita. Por favor intenta nuevamente o contáctanos directamente.`
          );
        }
      } else {
        conv.state = 'waiting_for_datetime';
        await this.whatsapp.safeReply(msg, `Indícame la nueva fecha y hora que prefieras:`);
      }
      return;
    }
  }

  parseDateTime(text) {
    try {
      const formats = [
        'DD/MM [a las] HH:mm',
        'DD/MM [a las] h:mm a',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD h:mm a',
        'dddd [a las] HH:mm',
        'dddd [a las] h:mm a',
      ];

      const date = moment(text, formats, 'es');
      if (date.isValid()) return date;

      if (text.includes('próximo') || text.includes('proximo')) {
        const cleanText = text.replace('próximo', '').replace('proximo', '').trim();
        return moment().add(1, 'week').startOf('week').day(cleanText);
      }

      return null;
    } catch (error) {
      console.error('Error parseando fecha:', error);
      return null;
    }
  }

  async showHelp(msg) {
    await this.whatsapp.safeReply(
      msg,
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
    delete this.conversationStates[phone];
    await this.whatsapp.safeReply(
      msg,
      `Operación cancelada. ¿En qué más puedo ayudarte? Escribe *MENU* para ver opciones.`
    );
  }

  async resetConversation(msg, phone) {
    delete this.conversationStates[phone];
    await this.whatsapp.safeReply(msg, `Conversación reiniciada. ¿Cómo puedo ayudarte hoy?`);
    await this.showMainMenu(msg);
  }

  async greetUser(msg) {
    await this.whatsapp.safeReply(
      msg,
      `¡Hola! 👋 ¿En qué puedo ayudarte hoy? Escribe *MENU* para ver opciones.`
    );
  }
}

module.exports = BotService;
