const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const isDev = process.env.NODE_ENV === 'development';

if (isDev) console.log('RUTA DE PAGO CARGADA');

// Rutas para Checkout Pro
router.post('/create_preference', auth, paymentController.createPreference); // Crear preferencia de pago
router.get('/status/:payment_id', paymentController.getPaymentStatus); // Obtener estado de pago

// Webhook Mercado Pago
router.post('/webhook/mercadopago', paymentController.mercadoPagoWebhook);

// Rutas para administradores
router.get('/admin/all', auth, adminAuth, paymentController.getAllPayments);
router.get('/admin/stats', auth, adminAuth, paymentController.getPaymentStats);
router.get('/admin/:paymentId', auth, adminAuth, paymentController.getPaymentById);
router.put('/admin/:paymentId/status', auth, adminAuth, paymentController.updatePaymentStatus);
router.delete('/admin/:paymentId', auth, adminAuth, paymentController.deletePayment);

router.post('/admin/:paymentId/refund', auth, adminAuth, paymentController.refundPayment);

module.exports = router;