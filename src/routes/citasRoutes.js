const { Router } = require('express');
const { crearCita } = require('../controllers/ClientsController');

const route = Router();

route.post('/create', crearCita);

module.exports = route;
