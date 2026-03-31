const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { auth } = require('../middleware/auth');
const { requireAdmin: adminAuth } = require('../middleware/auth');

// --- RUTAS DE SOPORTE ---

// Crear ticket (usuario autenticado)
router.post('/', auth, supportController.createTicket);

// Listar tickets (usuario ve los suyos, admin ve todos)
router.get('/', auth, supportController.getTickets);

// Cerrar ticket por usuario - Precedencia alta para evitar conflictos
router.patch('/:id/close-by-user', auth, supportController.closeByUser);

// Responder ticket (usuario o admin)
router.post('/:id/reply', auth, supportController.replyTicket);

// Cambiar estado (solo admin)
router.patch('/:id/status', auth, adminAuth, supportController.changeStatus);

// Eliminar ticket (solo admin)
router.delete('/:id', auth, adminAuth, supportController.deleteTicket);

// Nota interna (solo admin)
router.post('/:id/internal-note', auth, adminAuth, supportController.addInternalNote);

// Asignar responsable (solo admin)
router.patch('/:id/responsable', auth, adminAuth, supportController.assignResponsable);

// Agregar producto a usuario (solo admin)
router.post('/add-product-to-user', auth, adminAuth, supportController.addProductToUser);

// Guardar valoración
router.patch('/:id/rating', auth, supportController.rateTicket);

module.exports = router;