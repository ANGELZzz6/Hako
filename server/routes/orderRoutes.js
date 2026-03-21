const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Obtener todos los pedidos (solo admin) - DEBE IR PRIMERO
router.get('/', auth, adminAuth, orderController.getAllOrders);

// Obtener casilleros disponibles (solo admin)
router.get('/admin/lockers', auth, adminAuth, orderController.getAvailableLockers);

// Obtener casilleros disponibles para usuarios
router.get('/lockers', auth, orderController.getAvailableLockers);

// Obtener estado detallado de casilleros (solo admin)
router.get('/admin/lockers/status', auth, adminAuth, orderController.getLockerStatus);

// Validar capacidad de casillero (solo admin)
router.post('/admin/validate-locker', auth, adminAuth, orderController.validateLockerCapacity);

// Obtener estadísticas simples de casilleros (solo admin)
router.get('/admin/lockers/stats', auth, adminAuth, orderController.getSimpleLockerStats);

// Encontrar mejor casillero para un producto (solo admin)
router.post('/admin/find-best-locker', auth, adminAuth, orderController.findBestLocker);

// Obtener el pedido activo del usuario autenticado
router.get('/mine', auth, orderController.getMyOrders);

// Obtener historial de pedidos del usuario
router.get('/history', auth, orderController.getMyOrderHistory);

// Obtener productos comprados por el usuario
router.get('/purchased-products', auth, orderController.getMyPurchasedProducts);

// Obtener productos de un usuario específico (solo admin)
router.get('/admin/user/:userId/products', auth, adminAuth, orderController.getUserProducts);

// Obtener todos los productos individuales (solo admin)
router.get('/admin/all-individual-products', auth, adminAuth, orderController.getAllIndividualProducts);

// Cambiar estado de un producto individual (solo admin)
router.patch('/admin/individual-product/:productId/status', auth, adminAuth, orderController.changeIndividualProductStatus);

// Reclamar productos desde inventario
router.post('/claim-from-inventory', auth, orderController.claimProductsFromInventory);

// Reclamar productos individuales
router.post('/claim-individual-products', auth, orderController.claimIndividualProducts);

// Liberar casillero manualmente (solo admin)
router.post('/admin/orders/:orderId/release-locker', auth, adminAuth, orderController.releaseLocker);

// Seleccionar casillero para un pedido
router.post('/:orderId/select-locker', auth, orderController.selectLocker);

// Marcar pedido como recogido
router.post('/:orderId/pickup', auth, orderController.markAsPickedUp);

// Reclamar productos específicos de un pedido
router.post('/:orderId/claim-products', auth, orderController.claimProducts);

// Obtener productos disponibles para reclamar
router.get('/:orderId/available-products', auth, orderController.getAvailableProducts);

// Obtener un pedido por id
router.get('/:id', auth, orderController.getOrderById);

// Cambiar estado de un pedido (solo admin)
router.patch('/:id/status', auth, adminAuth, orderController.updateOrderStatus);

// Borrar pedido (solo admin)
router.delete('/:id', auth, adminAuth, orderController.deleteOrder);

module.exports = router; 