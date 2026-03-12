require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { seedAllData } = require('./src/controllers/reviewController');

const port = process.env.PORT || 5200;

connectDB()
  .then(async () => {
    // Sembrar reviews de ejemplo solo si la DB está vacía
    const inserted = await seedAllData();
    if (inserted.length > 0) {
      console.log(`[Reviews] Sembradas ${inserted.length} reseñas iniciales`);
    }

    app.listen(port, () => {
      console.log(`\n🔥 Server running on http://localhost:${port}`);
      console.log(`\n📡 Endpoints disponibles:`);
      console.log(`   GET  / → status`);
      console.log(`   POST /api/citas/create → contacto/citas`);
      console.log(`   GET  /api/proyect → proyectos del portfolio`);
      console.log(`   POST /api/proyect → crear proyecto (activa análisis IA)`);
      console.log(`   GET  /api/review → reseñas`);
      console.log(`   POST /api/ai/chat → chat con IA`);
      console.log(`   POST /api/ai/presupuesto → estimación de presupuesto\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al conectar DB:', err);
    process.exit(1);
  });
