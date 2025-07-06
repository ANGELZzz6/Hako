const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

console.log('RUTA DE PAGO CARGADA');

router.post('/create_preference', paymentController.createPreference);
router.post('/create_pse_preference', paymentController.createPSEPreference); // Nueva ruta para preferencias PSE
router.post('/create_simple_pse_preference', paymentController.createSimplePSEPreference); // Ruta para preferencias PSE simples
router.post('/create_forced_pse_preference', paymentController.createForcedPSEPreference); // Ruta para preferencias PSE forzadas
router.get('/check_payment_methods', paymentController.checkAvailablePaymentMethods); // Para verificar métodos disponibles
router.post('/process_payment', paymentController.processPayment);
router.post('/test-process-payment', paymentController.testProcessPayment); // Endpoint de prueba
router.get('/status/:payment_id', paymentController.getPaymentStatus);
router.post('/test-status', paymentController.testPaymentStatus);
router.get('/test-config', paymentController.testMercadoPagoConfig); // Para verificar configuración
router.post('/webhook', paymentController.webhook);
router.post('/test-webhook', paymentController.testWebhook); // Solo para desarrollo
router.get('/payment_methods', paymentController.getPaymentMethods); // Para obtener métodos de pago (PSE)
router.get('/test-pse-config', paymentController.testPSEConfig); // Para probar configuración PSE
router.get('/test-pse-availability', paymentController.testPSEAvailability); // Para probar disponibilidad PSE

module.exports = router; 