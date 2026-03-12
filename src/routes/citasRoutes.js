const { Router } = require('express');
const { crearCita } = require('../controllers/ClientsController');

const router = Router();

router.post('/create', crearCita);

module.exports = router;
