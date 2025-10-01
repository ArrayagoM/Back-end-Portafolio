require('dotenv').config();
const mongoose = require('mongoose');
const RaffleTicket = require('../models/RaffleTicket');

const seedTickets = async () => {
  try {
    console.log('Conectando a la base de datos...');
    await mongoose.connect(process.env.URL_DEPLOY);

    console.log('Borrando números antiguos...');
    await RaffleTicket.deleteMany({});

    const tickets = [];
    for (let i = 0; i < 9999; i++) {
      // Formateamos el número para que tenga 4 dígitos con ceros a la izquierda
      const number = i.toString().padStart(4, '0');
      tickets.push({ number, status: 'available' });
    }

    console.log('Creando 9999 números de rifa...');
    await RaffleTicket.insertMany(tickets);

    console.log('✅ ¡Proceso completado! La base de datos está lista para la rifa.');
  } catch (error) {
    console.error('❌ Error durante el sembrado de números:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedTickets();
