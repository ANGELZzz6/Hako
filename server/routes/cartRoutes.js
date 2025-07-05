const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Rutas para usuarios autenticados
router.get('/', auth, cartController.getCart);
router.post('/', auth, cartController.addToCart);
router.put('/item/:productId', auth, cartController.updateCartItem);
router.delete('/item/:productId', auth, cartController.removeFromCart);
router.delete('/items', auth, cartController.removeMultipleItems);
router.delete('/', auth, cartController.clearCart);

// Rutas para administradores
router.get('/admin/all', auth, adminAuth, cartController.getAllCarts);
router.get('/admin/stats', auth, adminAuth, cartController.getCartStats);

module.exports = router; 