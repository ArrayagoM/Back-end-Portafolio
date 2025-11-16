const mercadopago = require('mercadopago');

// Configura tus credenciales
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const createPaymentPreference = async (ticket, buyer) => {
  const frontendUrl = 'http://localhost:3000';
  const backendUrl = 'http://localhost:5200';

  console.log(`[MercadoPago Service] Creando preferencia de pago para el número ${ticket.number}`);

  const preference = {
    items: [
      {
        title: `Número Rifa: ${ticket.number} - Alarma Moto`,
        description: 'Ticket para la rifa de una alarma de última generación para motocicleta',
        quantity: 1,
        unit_price: 1500.0,
        currency_id: 'ARS',
      },
    ],
    payer: {
      name: buyer.name,
      email: buyer.email,
    },
    back_urls: {
      success: `${frontendUrl}/success`,
      failure: `${frontendUrl}/failure`,
      pending: `${frontendUrl}/pending`,
    },
    // auto_return: 'approved', // <-- LÍNEA ELIMINADA: Esta era la causa del problema.
    notification_url: `${backendUrl}/api/raffle/webhook`,
    external_reference: ticket._id.toString(),
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    console.log(`[MercadoPago Service] Preferencia creada con éxito. ID: ${response.body.id}`);
    return response.body;
  } catch (error) {
    console.error('--- ❌ ERROR AL CREAR PREFERENCIA DE PAGO ❌ ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    console.error('----------------------------------------------------');
    throw new Error('No se pudo generar el link de pago con Mercado Pago.');
  }
};

module.exports = { createPaymentPreference };
