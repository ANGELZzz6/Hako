// productoRoutes.js
// Rutas relacionadas con productos

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth } = require('../middleware/auth');

// Rutas públicas
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Rutas de reseñas (deben ir ANTES que las rutas de admin)
router.post('/:id/reviews', auth, productController.addOrEditReview);
router.put('/:id/reviews', auth, productController.addOrEditReview);
router.delete('/:id/reviews', auth, productController.deleteReview);

// Rutas de administración
router.get('/admin/all', productController.getAllProductsAdmin);
router.post('/admin', productController.createProduct);
router.put('/admin/:id', productController.updateProduct);
router.delete('/admin/:id', productController.deleteProduct);
router.patch('/admin/:id/toggle-status', productController.toggleProductStatus);

module.exports = router;
