require('dotenv').config();
const os = require('os');
const app = require('./src/app');
const port = process.env.PORT || 5200;
const { connectDB } = require('./src/config/db');

// function getLocalIP() {
//   const interfaces = os.networkInterfaces();
//   for (const iface of Object.values(interfaces)) {
//     for (const config of iface) {
//       if (config.family === 'IPv4' && !config.internal) {
//         return config.address;
//       }
//     }
//   }
//   return '127.0.0.1';
// }

connectDB()
  .then(() => {
    // const localIP = getLocalIP();
    app.listen(port, async () => {
      // Inicializar el servicio de WhatsApp y asignarlo a app.locals
      console.log(`Servidor escuchando en:`);
      console.log(`→ http://localhost:${port}`);
      console.log(`→ http://${localIP}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1);
  });
