const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// Obtener todos los pedidos (solo admin) - DEBE IR PRIMERO
router.get('/', auth, orderController.getAllOrders);

// Obtener casilleros disponibles (solo admin)
router.get('/admin/lockers', auth, orderController.getAvailableLockers);

// Obtener casilleros disponibles para usuarios
router.get('/lockers', auth, orderController.getAvailableLockers);

// Obtener estado detallado de casilleros (solo admin)
router.get('/admin/lockers/status', auth, orderController.getLockerStatus);

// Validar capacidad de casillero (solo admin)
router.post('/admin/validate-locker', auth, orderController.validateLockerCapacity);

// Obtener estadísticas simples de casilleros (solo admin)
router.get('/admin/lockers/stats', auth, orderController.getSimpleLockerStats);

// Encontrar mejor casillero para un producto (solo admin)
router.post('/admin/find-best-locker', auth, orderController.findBestLocker);

// Obtener el pedido activo del usuario autenticado
router.get('/mine', auth, orderController.getMyOrders);

// Obtener historial de pedidos del usuario
router.get('/history', auth, orderController.getMyOrderHistory);

// Obtener productos comprados por el usuario
router.get('/purchased-products', auth, orderController.getMyPurchasedProducts);

// Reclamar productos desde inventario
router.post('/claim-from-inventory', auth, orderController.claimProductsFromInventory);

// Reclamar productos individuales
router.post('/claim-individual-products', auth, orderController.claimIndividualProducts);

// Liberar casillero manualmente (solo admin)
router.post('/admin/orders/:orderId/release-locker', auth, orderController.releaseLocker);

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
router.patch('/:id/status', auth, orderController.updateOrderStatus);

// Borrar pedido (solo admin)
router.delete('/:id', auth, orderController.deleteOrder);

module.exports = router; 