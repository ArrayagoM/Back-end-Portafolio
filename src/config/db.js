const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const dbURI = process.env.URL_DEPLOY;
    if (!dbURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    console.log('Intentando conectar a MongoDB en:', dbURI);

    await mongoose.connect(dbURI);

    console.log('MongoDB conectado');
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
