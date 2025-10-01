const mongoose = require('mongoose');

const RaffleTicketSchema = new mongoose.Schema({
  number: {
    type: String, // Guardamos como String para mantener los ceros iniciales (ej: '0001')
    required: true,
    unique: true, // Cada número es único
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'pending', 'sold'], // Estados posibles de un número
    default: 'available',
  },
  buyerName: {
    type: String,
    default: '',
  },
  buyerEmail: {
    type: String,
    default: '',
  },
  paymentId: {
    // ID de pago de Mercado Pago
    type: String,
    default: '',
  },
  orderId: {
    // ID de la orden que generamos
    type: String,
    default: '',
  },
});

const RaffleTicket = mongoose.model('RaffleTicket', RaffleTicketSchema);
module.exports = RaffleTicket;
