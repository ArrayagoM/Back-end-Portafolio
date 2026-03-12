const { chat, estimateBudget, analyzeNewProject } = require('../services/groqService');
const Conversation = require('../models/Conversation');
const { v4: uuidv4 } = require('uuid');

// ─── Chat general con el asistente ───────────────────────────────────────────
const chatWithAI = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    // Crear o recuperar sesión
    const sid = sessionId || uuidv4();
    let conversation = await Conversation.findOne({ sessionId: sid });

    if (!conversation) {
      conversation = new Conversation({ sessionId: sid, messages: [] });
    }

    // Construir historial para el contexto (últimos 10 mensajes para no exceder tokens)
    const recentHistory = conversation.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Agregar el mensaje nuevo al historial para la llamada a la API
    const messagesForAPI = [...recentHistory, { role: 'user', content: message }];

    console.log(`[AI Chat] Session: ${sid} | Historial: ${recentHistory.length} msgs`);

    const response = await chat(messagesForAPI);

    // Guardar en DB
    conversation.messages.push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: response, timestamp: new Date() }
    );
    conversation.updatedAt = new Date();
    await conversation.save();

    return res.status(200).json({
      success: true,
      response,
      sessionId: sid,
    });
  } catch (error) {
    console.error('[AIController] Error en chatWithAI:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la consulta',
      error: error.message,
    });
  }
};

// ─── Endpoint especializado de presupuesto ────────────────────────────────────
const getPresupuesto = async (req, res) => {
  try {
    const { description, requirements = [] } = req.body;

    if (!description || description.trim().length < 20) {
      return res.status(400).json({
        message: 'Describí el proyecto con más detalle (mínimo 20 caracteres)',
      });
    }

    console.log('[AI Presupuesto] Generando estimación para:', description.substring(0, 60) + '...');

    const estimate = await estimateBudget(description, requirements);

    return res.status(200).json({
      success: true,
      estimate,
      disclaimer:
        'Esta es una estimación orientativa basada en el portfolio actual. El presupuesto final se define tras una reunión de relevamiento.',
    });
  } catch (error) {
    console.error('[AIController] Error en getPresupuesto:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al generar el presupuesto',
      error: error.message,
    });
  }
};

// ─── Analizar proyecto nuevo al subirlo ──────────────────────────────────────
const analyzeProject = async (req, res) => {
  try {
    const projectData = req.body;

    if (!projectData.title || !projectData.description || !projectData.technologies) {
      return res.status(400).json({ message: 'Faltan datos del proyecto para analizar' });
    }

    const analysis = await analyzeNewProject(projectData);

    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('[AIController] Error en analyzeProject:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al analizar el proyecto',
      error: error.message,
    });
  }
};

// ─── Obtener historial de conversación ───────────────────────────────────────
const getConversation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversation = await Conversation.findOne({ sessionId }).lean();

    if (!conversation) {
      return res.status(404).json({ message: 'Conversación no encontrada' });
    }

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la conversación',
      error: error.message,
    });
  }
};

// ─── Eliminar conversación ────────────────────────────────────────────────────
const deleteConversation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Conversation.deleteOne({ sessionId });
    return res.status(200).json({ success: true, message: 'Conversación eliminada' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la conversación',
      error: error.message,
    });
  }
};

module.exports = {
  chatWithAI,
  getPresupuesto,
  analyzeProject,
  getConversation,
  deleteConversation,
};
