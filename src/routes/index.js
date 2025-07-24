const { Router } = require('express');
const citaRoutes = require('./citasRoutes');
const proyectRoutes = require('./proyectRoutes');
const reviewRoutes = require('./reviewRoutes');

const routes = Router();

routes.use('/citas', citaRoutes);
routes.use('/proyect', proyectRoutes);
routes.use('/review', reviewRoutes);

module.exports = routes;
