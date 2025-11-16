const RaffleTicket = require('../models/RaffleTicket');
const { createPaymentPreference } = require('../services/mercadoPagoService');
const sendEmail = require('../config/nodemailer');

// Obtener todos los tickets
const getTickets = async (req, res) => {
  try {
    const tickets = await RaffleTicket.find().select('number status -_id');
    const soldCount = await RaffleTicket.countDocuments({ status: 'sold' });
    res.status(200).json({
      tickets,
      soldCount,
      totalCount: 10000,
      progress: (soldCount / 10000) * 100,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los números.' });
  }
};

// Crear la preferencia de pago
const createPayment = async (req, res) => {
  const { number, name, email } = req.body;

  if (!number || !name || !email) {
    return res.status(400).json({ message: 'Faltan datos para la compra.' });
  }

  try {
    const ticket = await RaffleTicket.findOne({ number });

    if (!ticket || ticket.status !== 'available') {
      return res.status(404).json({ message: 'Este número no está disponible.' });
    }

    // Lógica mejorada: Marcar como pendiente para evitar doble venta
    ticket.status = 'pending';
    ticket.buyerName = name;
    ticket.buyerEmail = email;
    await ticket.save();
    console.log(`[Controller] Ticket ${number} marcado como 'pending' para ${email}.`);

    const preference = await createPaymentPreference(ticket, { name, email });
    res.status(201).json({ paymentUrl: preference.init_point });
  } catch (error) {
    // Si la creación de la preferencia falla, revertir el estado del ticket
    await RaffleTicket.updateOne(
      { number },
      { $set: { status: 'available', buyerName: '', buyerEmail: '' } }
    );
    console.error(
      `[Controller] Error creando pago para el ticket ${number}. Revertido a 'available'.`
    );
    res.status(500).json({ message: error.message });
  }
};

// Webhook con lógica mejorada para manejar notificaciones de Mercado Pago
const handleWebhook = async (req, res) => {
  console.log('--- 🔔 WEBHOOK RECIBIDO ---');
  console.log('Query:', req.query);

  const paymentId = req.query['data.id'];

  if (!paymentId) {
    console.log('[Webhook] No se recibió un ID de pago. Ignorando.');
    return res.sendStatus(200);
  }

  console.log(`[Webhook] Procesando notificación para Payment ID: ${paymentId}`);

  try {
    const payment = await mercadopago.payment.findById(paymentId);
    if (!payment) {
      console.log(`[Webhook] No se encontró información para el Payment ID: ${paymentId}`);
      return res.sendStatus(200);
    }

    console.log('[Webhook] Detalles del pago:', {
      status: payment.body.status,
      external_reference: payment.body.external_reference,
    });

    const ticketId = payment.body.external_reference;
    if (!ticketId) {
      console.log('[Webhook] Error: El pago no tiene una `external_reference`.');
      return res.sendStatus(200);
    }

    const ticket = await RaffleTicket.findById(ticketId);
    if (!ticket) {
      console.log(`[Webhook] Error: No se encontró el ticket con ID: ${ticketId}`);
      return res.sendStatus(200);
    }

    // LÓGICA MEJORADA: Manejo de estados para evitar duplicados
    if (ticket.status === 'sold') {
      console.log(
        `[Webhook] El ticket ${ticket.number} ya estaba vendido. No se realizan cambios.`
      );
      return res.sendStatus(200);
    }

    if (payment.body.status === 'approved') {
      console.log(
        `[Webhook] ✅ Pago APROBADO para el ticket ${ticket.number}. Actualizando a 'sold'.`
      );
      ticket.status = 'sold';
      ticket.paymentId = paymentId;
      await ticket.save();

      const emailHtml = `...`; // Tu HTML de correo
      await sendEmail({
        to: ticket.buyerEmail,
        subject: `Confirmación de tu número de rifa: ${ticket.number}`,
        html: emailHtml,
      });
      console.log(`[Webhook] Correo de confirmación enviado a ${ticket.buyerEmail}.`);
    } else if (
      ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.body.status)
    ) {
      console.log(
        `[Webhook] ❌ Pago RECHAZADO o CANCELADO (${payment.body.status}) para el ticket ${ticket.number}. Devolviendo a 'available'.`
      );
      ticket.status = 'available';
      ticket.buyerName = '';
      ticket.buyerEmail = '';
      ticket.paymentId = '';
      await ticket.save();
    } else {
      console.log(
        `[Webhook] ⏳ Estado del pago no manejado: ${payment.body.status}. No se realizan cambios.`
      );
    }
  } catch (error) {
    console.error('[Webhook] ❌ Error procesando la notificación:', error);
  }

  res.sendStatus(200);
};

module.exports = { getTickets, createPayment, handleWebhook };
