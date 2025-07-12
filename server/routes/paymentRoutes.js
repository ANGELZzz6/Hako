const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

console.log('RUTA DE PAGO CARGADA');

// Rutas para Checkout Pro
router.post('/create_preference', paymentController.createPreference); // Crear preferencia de pago
router.get('/status/:payment_id', paymentController.getPaymentStatus); // Obtener estado de pago
router.post('/webhook', paymentController.webhook); // Webhook de Mercado Pago
router.get('/test-config', paymentController.testConfig); // Probar configuración

// Webhook Mercado Pago
router.post('/webhook/mercadopago', paymentController.mercadoPagoWebhook);

// Rutas para administradores
router.get('/admin/all', auth, adminAuth, paymentController.getAllPayments);
router.get('/admin/stats', auth, adminAuth, paymentController.getPaymentStats);
router.delete('/admin/all', auth, adminAuth, paymentController.deleteAllPayments);
router.get('/admin/:paymentId', auth, adminAuth, paymentController.getPaymentById);
router.put('/admin/:paymentId/status', auth, adminAuth, paymentController.updatePaymentStatus);
router.delete('/admin/:paymentId', auth, adminAuth, paymentController.deletePayment);

module.exports = router; 