const Proyect = require('../models/Proyect');
const { analyzeNewProject } = require('../services/groqService');

// ─── Crear proyecto + análisis automático con IA ─────────────────────────────
const createProyect = async (req, res) => {
  try {
    const project = new Proyect({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await project.save();

    // 🤖 Análisis automático con IA al cargar proyecto nuevo
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeNewProject({
        title: project.title,
        type: project.type,
        description: project.description,
        technologies: project.technologies,
      });
      console.log(`[IA] Proyecto "${project.title}" analizado:`, aiAnalysis);
    } catch (aiErr) {
      console.warn('[IA] No se pudo analizar el proyecto automáticamente:', aiErr.message);
    }

    res.status(200).json({
      message: 'Proyecto creado con éxito',
      project,
      aiAnalysis, // Devuelve el análisis al frontend para mostrarlo
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el proyecto', error: error.message });
  }
};

// ─── Listar todos los proyectos ───────────────────────────────────────────────
const getProyectAll = async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { technologies: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Proyect.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ projects, total: projects.length });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyectos', error: error.message });
  }
};

// ─── Obtener proyecto por ID ──────────────────────────────────────────────────
const getProyectById = async (req, res) => {
  try {
    const project = await Proyect.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el proyecto', error: error.message });
  }
};

// ─── Actualizar proyecto ──────────────────────────────────────────────────────
const updateProyect = async (req, res) => {
  try {
    const project = await Proyect.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
    res.status(200).json({ message: 'Proyecto actualizado con éxito', project });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el proyecto', error: error.message });
  }
};

// ─── Eliminar proyecto ────────────────────────────────────────────────────────
const deleteProyect = async (req, res) => {
  try {
    const project = await Proyect.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });

    await Proyect.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Proyecto eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el proyecto', error: error.message });
  }
};

module.exports = {
  createProyect,
  getProyectAll,
  getProyectById,
  updateProyect,
  deleteProyect,
};
