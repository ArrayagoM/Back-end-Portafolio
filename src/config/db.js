const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const dbURI = process.env.URL_DEPLOY;
    if (!dbURI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }


    await mongoose.connect(dbURI);

  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
