const Review = require('../models/Review');
const realisticReviews = require('../data/realisticReviews');

// ─── Controladores CRUD ──────────────────────────────────────────────────────

/** Listar todas las reseñas con filtros opcionales */
async function getAllReviews(req, res) {
  try {
    const { type, minRating, verified } = req.query;
    const filter = {};
    if (type) filter.projectType = type;
    if (minRating) filter.rating = { $gte: parseInt(minRating) };
    if (verified !== undefined) filter.verified = verified === 'true';

    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener reseñas', error: err.message });
  }
}

/** Crear reseña nueva (clientes reales) */
async function createReview(req, res) {
  try {
    const { author, content, rating, projectType } = req.body;
    const newReview = new Review({
      author,
      content,
      rating: Math.min(Math.max(1, rating), 5),
      projectType,
      verified: true,
      isFiction: false,
    });
    const saved = await newReview.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Error al crear reseña', error: err.errors || err.message });
  }
}

/** Obtener reseña por ID */
async function getReviewById(req, res) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Reseña no encontrada' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: 'Error al buscar reseña', error: err.message });
  }
}

/** Actualizar reseña por ID */
async function updateReview(req, res) {
  try {
    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Reseña no encontrada' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar reseña', error: err.message });
  }
}

/** Borrar reseña por ID */
async function deleteReview(req, res) {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Reseña no encontrada' });
    res.json({ message: 'Reseña eliminada', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar reseña', error: err.message });
  }
}

// ─── Sembrado y estadísticas ──────────────────────────────────────────────────

/** 
 * Sembrar reviews ficticias solo si la colección está vacía.
 * Ya NO borra las reviews reales en cada arranque.
 */
async function seedAllData() {
  const existingCount = await Review.countDocuments();

  if (existingCount > 0) {
    console.log(`[Reviews] Ya existen ${existingCount} reseñas. No se sobrescriben.`);
    return [];
  }

  const toInsert = realisticReviews.map((r) => ({
    ...r,
    createdAt: r.createdAt || new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 180),
  }));

  const inserted = await Review.insertMany(toInsert);
  return inserted;
}

/** Sembrar desde endpoint (protegido, uso manual) */
async function seedReviews(req, res) {
  try {
    const force = req.query.force === 'true';
    if (force) await Review.deleteMany({});

    const inserted = await seedAllData();
    res.status(201).json({
      success: true,
      inserted: inserted.length,
      message: inserted.length === 0 ? 'Ya había reviews. Usá ?force=true para forzar.' : 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al sembrar reseñas', error: err.message });
  }
}

/** Estadísticas globales */
async function getStats(req, res) {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          verified: { $sum: { $cond: ['$verified', 1, 0] } },
          types: { $addToSet: '$projectType' },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          averageRating: { $round: ['$averageRating', 1] },
          verified: 1,
          types: { $filter: { input: '$types', as: 't', cond: { $ne: ['$$t', null] } } },
        },
      },
    ]);
    res.json(stats[0] || { total: 0, averageRating: 0, verified: 0, types: [] });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
  }
}

module.exports = {
  getAllReviews,
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  seedReviews,
  getStats,
  seedAllData,
};
