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

const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Rutas para asignaciones de casilleros

// POST /api/locker-assignments - Crear nueva asignación
router.post('/', auth, adminAuth, createAssignment);

// GET /api/locker-assignments - Obtener todas las asignaciones (con filtros opcionales)
router.get('/', auth, adminAuth, getAllAssignments);

// GET /api/locker-assignments/by-datetime - Obtener asignaciones por fecha y hora
router.get('/by-datetime', auth, adminAuth, getAssignmentsByDateTime);

// GET /api/locker-assignments/by-locker/:lockerNumber - Obtener asignación por número de casillero
router.get('/by-locker/:lockerNumber', auth, adminAuth, getAssignmentByLocker);

// PUT /api/locker-assignments/:id - Actualizar asignación completa
router.put('/:id', auth, adminAuth, updateAssignment);

// PATCH /api/locker-assignments/:id/status - Actualizar solo el estado de la asignación
router.patch('/:id/status', auth, adminAuth, updateStatus);

// DELETE /api/locker-assignments/:id - Eliminar asignación
router.delete('/:id', auth, adminAuth, deleteAssignment);

// POST /api/locker-assignments/sync-from-appointments - Sincronizar desde citas existentes
router.post('/sync-from-appointments', auth, adminAuth, syncFromAppointments);

module.exports = router;
