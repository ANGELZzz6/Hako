const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

console.log('RUTA DE PAGO CARGADA');

router.post('/create_preference', paymentController.createPreference);
router.post('/process_payment', paymentController.processPayment);
router.post('/test-process-payment', paymentController.testProcessPayment); // Endpoint de prueba
router.get('/status/:payment_id', paymentController.getPaymentStatus);
router.post('/test-status', paymentController.testPaymentStatus);
router.get('/test-config', paymentController.testMercadoPagoConfig); // Para verificar configuración
router.post('/webhook', paymentController.webhook);
router.post('/test-webhook', paymentController.testWebhook); // Solo para desarrollo

module.exports = router; 