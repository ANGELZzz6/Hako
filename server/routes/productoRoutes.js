// productoRoutes.js
// Rutas relacionadas con productos

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rutas públicas
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/destacados', productController.getDestacados);
router.get('/ofertas', productController.getOfertas);

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
router.patch('/admin/:id/destacado', productController.toggleDestacado);
router.patch('/admin/:id/oferta', productController.toggleOferta);

// Obtener todas las categorías distintas
router.get('/admin/categorias', productController.getAllCategories);

// Obtener productos por categoría
router.get('/admin/categorias/:categoria/productos', productController.getProductsByCategory);

// Subida de imágenes de producto (admin)
router.post('/admin/upload-image', productController.uploadProductImage);

// Ruta de producto por ID (debe ir al final)
router.get('/:id', productController.getProductById);

// Limitar a 3 sugerencias cada 10 minutos por usuario
const sugerenciaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 3,
  message: { error: 'Has alcanzado el límite de sugerencias. Intenta más tarde.' },
  keyGenerator: (req) => req.user ? req.user.id : req.ip
});

// Recibir sugerencias de productos (protegido)
router.post('/sugerencias', auth, sugerenciaLimiter, productController.createSuggestion);

// Obtener todas las sugerencias (admin)
router.get('/admin/sugerencias', auth, productController.getAllSuggestions);

// Eliminar una sugerencia (protegido)
router.delete('/admin/sugerencias/:id', auth, productController.deleteSuggestion);

module.exports = router;
