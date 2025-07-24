require('dotenv').config();
const routes  = require('./src/routes');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
// Importamos la función standalone
const { seedAllData } = require('./src/controllers/reviewController');

const port = process.env.PORT || 5200;


connectDB()
  .then(async () => {
    // 1) Sembramos TODAS las reviews antes de levantar el server:
    const inserted = await seedAllData();
    console.log(`[Reviews] Sembradas ${inserted.length} reseñas desde realisticReviews`);

    // 2) Arrancamos el servidor
    app.listen(port, () => {
      console.log(`🔥 Server up en http://localhost:${port}`);
      console.log(`→ GET /api/review → ahora devuelve las reviews del array`);
    });
  })
  .catch(err => {
    console.error('Error al conectar DB:', err);
    process.exit(1);
  });
