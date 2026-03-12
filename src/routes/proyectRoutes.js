const { Router } = require('express');
const {
  createProyect,
  getProyectAll,
  getProyectById,
  updateProyect,
  deleteProyect,
} = require('../controllers/ProyectController');

const route = Router();

route.get('/', getProyectAll);
route.get('/:id', getProyectById);
route.post('/', createProyect);
route.put('/update/:id', updateProyect);
route.delete('/delete/:id', deleteProyect);

module.exports = route;
