const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { auth } = require('../middleware/auth');
const { requireAdmin: adminAuth } = require('../middleware/auth');

// Crear ticket (usuario autenticado)
router.post('/', auth, supportController.createTicket);

// Listar tickets (usuario ve los suyos, admin ve todos)
router.get('/', auth, supportController.getTickets);

// Responder ticket (usuario o admin)
router.post('/:id/reply', auth, supportController.replyTicket);

// Cambiar estado (solo admin)
router.patch('/:id/status', auth, adminAuth, supportController.changeStatus);

module.exports = router; 