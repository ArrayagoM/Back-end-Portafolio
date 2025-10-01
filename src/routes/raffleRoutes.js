const { Router } = require('express');
const { getTickets, createPayment, handleWebhook } = require('../controllers/RaffleController');
const route = Router();

// Endpoint para que el frontend obtenga el estado de todos los números y el progreso
route.get('/tickets', getTickets);

// Endpoint para iniciar la compra de un número
route.post('/buy', createPayment);

// Endpoint que Mercado Pago usará para notificarnos (webhook)
route.post('/webhook', handleWebhook);

module.exports = route;
