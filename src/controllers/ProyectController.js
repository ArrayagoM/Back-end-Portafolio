const Proyect = require('../models/Proyect');

const createProyect = async (req, res) => {
  try {
    const project = new Proyect({ ...req.body, createdAt: new Date(), updatedAt: new Date() });
    await project.save();
    res.status(200).json({ message: 'Proyecto creado con éxito', project });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el proyecto', error });
  }
};

const getProyectAll = async (req, res) => {
  try {
    const projects = await Proyect.find();
    res.status(200).json({ projects });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyectos', error });
  }
};

const updateProyect = async (req, res) => {
  try {
    const project = await Proyect.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.status(200).json({ message: 'Proyecto actualizado con éxito', project });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el proyecto', error });
  }
};

const deleteProyect = async (req, res) => {
  try {
    await Proyect.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Proyecto eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el proyecto', error });
  }
};

module.exports = {
  createProyect,
  getProyectAll,
  updateProyect,
  deleteProyect,
};
