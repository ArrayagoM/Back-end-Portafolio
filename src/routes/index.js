const { Router } = require('express');
const citaRoutes = require('./citasRoutes');
const ProyectRoutes = require('./proyectRoutes');

const routes = Router();

// Usar la ruta correctamente
routes.use('/citas', citaRoutes);
routes.use('/proyect', ProyectRoutes);

module.exports = routes;
