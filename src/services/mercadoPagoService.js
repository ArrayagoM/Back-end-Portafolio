const mercadopago = require('mercadopago');

// Configura tus credenciales
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const createPaymentPreference = async (ticket, buyer) => {
  const preference = {
    items: [
      {
        title: `Número de Rifa: ${ticket.number} - Alarma de Moto`,
        quantity: 1,
        unit_price: 1500.0, // 🚨 ¡IMPORTANTE! Define aquí el precio de cada número
        currency_id: 'ARS',
      },
    ],
    payer: {
      name: buyer.name,
      email: buyer.email,
    },
    back_urls: {
      success: `${process.env.FRONTEND_URL}/success`, // URL a la que se redirige tras pago exitoso
      failure: `${process.env.FRONTEND_URL}/failure`,
      pending: `${process.env.FRONTEND_URL}/pending`,
    },
    auto_return: 'approved',
    // ¡La URL más importante! Mercado Pago nos notificará aquí sobre el estado del pago.
    notification_url: `${process.env.BACKEND_URL}/api/raffle/webhook`,
    // Asociamos el ID del ticket para saber cuál actualizar
    external_reference: ticket._id.toString(),
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    return response.body; // Contiene el init_point (el link de pago)
  } catch (error) {
    console.error('Error al crear preferencia de Mercado Pago:', error);
    throw new Error('No se pudo generar el link de pago.');
  }
};

module.exports = { createPaymentPreference };
