const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

console.log('RUTA DE PAGO CARGADA');

router.post('/create_preference', paymentController.createPreference);
router.post('/webhook', paymentController.webhook);
router.post('/test-webhook', paymentController.testWebhook); // Solo para desarrollo

module.exports = router; 