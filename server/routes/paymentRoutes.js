const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

console.log('RUTA DE PAGO CARGADA');

// Rutas para Checkout Pro
router.post('/create_preference', paymentController.createPreference); // Crear preferencia de pago
router.get('/status/:payment_id', paymentController.getPaymentStatus); // Obtener estado de pago
router.post('/webhook', paymentController.webhook); // Webhook de Mercado Pago
router.get('/test-config', paymentController.testConfig); // Probar configuración

// Webhook Mercado Pago
router.post('/webhook/mercadopago', paymentController.mercadoPagoWebhook);

module.exports = router; 