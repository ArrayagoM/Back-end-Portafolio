const axios = require('axios');
const Review = require('../models/Review');
const realisticReviews = require('../data/realisticReviews');

/**
 * Mezcla un array y devuelve hasta `limit` reviews para semilla
 */
async function seedRealisticReviews(limit = 5) {
  try {
    const shuffled = [...realisticReviews].sort(() => 0.5 - Math.random());
    const toInsert = shuffled.slice(0, limit).map((review) => ({
      ...review,
      createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 180),
    }));
    return await Review.insertMany(toInsert);
  } catch (error) {
    console.error('Error seeding realistic reviews:', error);
    throw error;
  }
}

// ─── Controladores CRUD ─────────────────────────────────

/** Listar todas las reseñas con filtros opcionales */
async function getAllReviews(req, res) {
  try {
    const { type, minRating, verified } = req.query;
    const filter = {};
    if (type) filter.projectType = type;
    if (minRating) filter.rating = { $gte: parseInt(minRating) };
    if (verified) filter.verified = verified === 'true';

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

// ─── Sembrado automático y estadísticas ─────────────────

/** Sembrar reseñas ficticias (endpoint protegido) */
async function seedReviews(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const inserted = await seedRealisticReviews(limit);
    res.status(201).json({ success: true, inserted: inserted.length, reviews: inserted });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'Error al sembrar reseñas', error: err.message });
  }
}

async function seedAllData() {
  // Prepara el array
  const toInsert = realisticReviews.map((r) => ({
    ...r,
    createdAt: r.createdAt || new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 180),
  }));
  // Borra antiguo y guarda todo
  await Review.deleteMany({});
  const inserted = await Review.insertMany(toInsert);
  return inserted;
}

/** Auto-sembrado al iniciar la app si hay menos de `minCount` */
async function autoSeedIfNeeded(minCount = 10) {
  try {
    const count = await Review.countDocuments();
    if (count < minCount) {
      console.log(`[Reviews] Auto-sembrando ${minCount - count} reseñas...`);
      await seedRealisticReviews(minCount - count);
    }
  } catch (err) {
    console.error('[Reviews] Error en auto-sembrado:', err);
  }
}

/** Obtener estadísticas globales */
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
    res.json(stats[0] || {});
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
  }
}

async function loadAllReviews(req, res) {
  try {
    const inserted = await seedAllData();
    return res.status(201).json({
      success: true,
      inserted: inserted.length,
      reviews: inserted,
    });
  } catch (err) {
    console.error('Error cargando todas las reseñas:', err);
    return res
      .status(500)
      .json({ success: false, message: 'No se pudo cargar todas las reseñas', error: err.message });
  }
}

module.exports = {
  getAllReviews,
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  seedReviews,
  autoSeedIfNeeded,
  getStats,
  loadAllReviews,
  seedAllData,
};
