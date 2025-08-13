const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Enviar log de debug (cualquier usuario puede enviar logs)
router.post('/log', auth, debugController.sendDebugLog);

// Enviar múltiples logs de debug
router.post('/logs/batch', auth, debugController.sendDebugLogs);

// Obtener logs de debug (solo admin)
router.get('/logs', auth, adminAuth, debugController.getDebugLogs);

// Obtener estadísticas de debug (solo admin)
router.get('/stats', auth, adminAuth, debugController.getDebugStats);

// Limpiar logs antiguos (solo admin)
router.delete('/logs/clear', auth, adminAuth, debugController.clearOldLogs);

// Obtener logs de un usuario específico (solo admin)
router.get('/logs/user/:userId', auth, adminAuth, debugController.getUserDebugLogs);

// Marcar log como resuelto (solo admin)
router.patch('/logs/:logId/resolve', auth, adminAuth, debugController.resolveDebugLog);

module.exports = router;
