const { Router } = require('express');
const router = Router();
const {
  getAllReviews,
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  seedReviews,
  getStats,
} = require('../controllers/reviewController');

// Listar todas
router.get('/', getAllReviews);
// Crear
router.post('/', createReview);
// Detalle por ID
router.get('/:id', getReviewById);
// Actualizar por ID
router.put('/:id', updateReview);
// Borrar por ID
router.delete('/:id', deleteReview);

// (Opcional) Sembrar reseñas IA
router.post('/seed', seedReviews);

// Estadísticas
router.get('/stats', getStats);

module.exports = router;
