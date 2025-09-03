const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignmentsByDateTime,
  getAssignmentByLocker,
  updateAssignment,
  updateStatus,
  deleteAssignment,
  getAllAssignments,
  syncFromAppointments
} = require('../controllers/lockerAssignmentController');

// Middleware de autenticación (asumiendo que existe)
// const auth = require('../middleware/auth');

// Rutas para asignaciones de casilleros

// POST /api/locker-assignments - Crear nueva asignación
router.post('/', createAssignment);

// GET /api/locker-assignments - Obtener todas las asignaciones (con filtros opcionales)
router.get('/', getAllAssignments);

// GET /api/locker-assignments/by-datetime - Obtener asignaciones por fecha y hora
router.get('/by-datetime', getAssignmentsByDateTime);

// GET /api/locker-assignments/by-locker/:lockerNumber - Obtener asignación por número de casillero
router.get('/by-locker/:lockerNumber', getAssignmentByLocker);

// PUT /api/locker-assignments/:id - Actualizar asignación completa
router.put('/:id', updateAssignment);

// PATCH /api/locker-assignments/:id/status - Actualizar solo el estado de la asignación
router.patch('/:id/status', updateStatus);

// DELETE /api/locker-assignments/:id - Eliminar asignación
router.delete('/:id', deleteAssignment);

// POST /api/locker-assignments/sync-from-appointments - Sincronizar desde citas existentes
router.post('/sync-from-appointments', syncFromAppointments);

module.exports = router;
