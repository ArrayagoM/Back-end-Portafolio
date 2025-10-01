const RaffleTicket = require('../models/RaffleTicket');
const { createPaymentPreference } = require('../services/mercadoPagoService');
const sendEmail = require('../config/nodemailer'); // Usamos tu función existente

// Obtener el estado de todos los números
const getTickets = async (req, res) => {
  try {
    // Para no sobrecargar, solo enviamos los datos esenciales
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

// Iniciar el proceso de compra
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

    // Marcamos el número como 'pendiente' para que nadie más pueda comprarlo mientras se procesa el pago
    ticket.status = 'pending';
    ticket.buyerName = name;
    ticket.buyerEmail = email;
    await ticket.save();

    // Creamos la preferencia de pago en Mercado Pago
    const preference = await createPaymentPreference(ticket, { name, email });
    res.status(201).json({ paymentUrl: preference.init_point });
  } catch (error) {
    // Si algo falla, volvemos a poner el número como disponible
    await RaffleTicket.updateOne({ number }, { $set: { status: 'available' } });
    res.status(500).json({ message: error.message });
  }
};

// Webhook para recibir notificaciones de Mercado Pago
const handleWebhook = async (req, res) => {
  const { query } = req;
  const topic = query.topic || query.type;

  if (topic === 'payment') {
    const paymentId = query.id || query['data.id'];

    try {
      // Usamos el SDK para obtener la información completa del pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      });
      const payment = await response.json();
      const ticketId = payment.external_reference;

      const ticket = await RaffleTicket.findById(ticketId);

      if (ticket && payment.status === 'approved' && ticket.status !== 'sold') {
        ticket.status = 'sold';
        ticket.paymentId = paymentId;
        await ticket.save();

        // ¡Pago aprobado! Enviamos el email de confirmación
        const emailHtml = `
          <h1>¡Compra Exitosa!</h1>
          <p>Hola <strong>${ticket.buyerName}</strong>,</p>
          <p>Tu pago ha sido aprobado y el número <strong>${ticket.number}</strong> es oficialmente tuyo.</p>
          <p>¡Mucha suerte en el sorteo de la alarma para moto!</p>
          <p>ID de tu pago: ${paymentId}</p>
        `;
        await sendEmail({
          to: ticket.buyerEmail,
          subject: `Confirmación de tu número de rifa: ${ticket.number}`,
          html: emailHtml,
        });
      } else if (ticket && payment.status !== 'approved') {
        // Si el pago falla o se cancela, el número vuelve a estar disponible
        ticket.status = 'available';
        await ticket.save();
      }
    } catch (error) {
      console.error('Error en webhook:', error);
    }
  }

  res.sendStatus(200); // Siempre respondemos 200 a Mercado Pago
};

module.exports = { getTickets, createPayment, handleWebhook };
