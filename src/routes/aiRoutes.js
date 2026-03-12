const { Router } = require('express');
const {
  chatWithAI,
  getPresupuesto,
  analyzeProject,
  getConversation,
  deleteConversation,
} = require('../controllers/AIController');

const router = Router();

// Chat general con el asistente
router.post('/chat', chatWithAI);

// Estimación de presupuesto detallada
router.post('/presupuesto', getPresupuesto);

// Analizar un proyecto nuevo (se puede llamar tras crear un proyecto)
router.post('/analyze-project', analyzeProject);

// Historial de conversación por sesión
router.get('/conversation/:sessionId', getConversation);

// Eliminar conversación
router.delete('/conversation/:sessionId', deleteConversation);

module.exports = router;
