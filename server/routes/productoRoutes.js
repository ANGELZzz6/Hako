// productoRoutes.js
// Rutas relacionadas con productos

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Rutas públicas
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);

// Rutas de administración
router.get('/admin/all', productController.getAllProductsAdmin);
router.post('/admin', productController.createProduct);
router.put('/admin/:id', productController.updateProduct);
router.delete('/admin/:id', productController.deleteProduct);
router.patch('/admin/:id/toggle-status', productController.toggleProductStatus);

module.exports = router;
