const { Router } = require('express');
const citaRoutes = require('./citasRoutes');

const routes = Router();

// Usar la ruta correctamente
routes.use('/citas', citaRoutes);

module.exports = routes;
