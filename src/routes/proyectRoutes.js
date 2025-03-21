const { Router } = require('express');
const {
  createProyect,
  getProyectAll,
  updateProyect,
  deleteProyect,
} = require('../controllers/ProyectController');
const route = Router();

route.get('/', getProyectAll);
route.post('/', createProyect);
route.put('/update/:id', updateProyect);
route.delete('/delete/:id', deleteProyect);

module.exports = route;
