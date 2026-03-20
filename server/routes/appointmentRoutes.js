const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// ===== RUTAS PÚBLICAS (requieren autenticación) =====

// Obtener horarios disponibles para una fecha
router.get('/available-slots/:date', auth, appointmentController.getAvailableTimeSlots);

// Crear una nueva cita
router.post('/', auth, appointmentController.createAppointment);

// Crear múltiples reservas (una por casillero)
router.post('/multiple', auth, appointmentController.createMultipleAppointments);

// Obtener citas del usuario
router.get('/my-appointments', auth, appointmentController.getMyAppointments);

// Obtener una cita específica del usuario
router.get('/my-appointments/:appointmentId', auth, appointmentController.getMyAppointment);

// Actualizar una cita del usuario
router.put('/my-appointments/:appointmentId', auth, appointmentController.updateMyAppointment);

// Cancelar una cita del usuario
router.post('/my-appointments/:appointmentId/cancel', auth, appointmentController.cancelAppointment);

// Marcar una cita como completada (recogida)
router.put('/:appointmentId/complete', auth, appointmentController.markAppointmentAsCompleted);

// Agregar productos a una reserva existente
router.post('/my-appointments/:appointmentId/add-products', auth, appointmentController.addProductsToAppointment);

// Obtener casilleros disponibles para una fecha y hora específica
router.get('/available-lockers/:date/:timeSlot', auth, appointmentController.getAvailableLockersForDateTime);

// ===== RUTAS DE ADMIN =====

// Obtener todas las citas (admin)
router.get('/admin', auth, adminAuth, appointmentController.getAllAppointments);

// Actualizar estado de una cita (admin)
router.patch('/admin/:appointmentId/status', auth, adminAuth, appointmentController.updateAppointmentStatus);

// Obtener estadísticas de citas (admin)
router.get('/admin/stats', auth, adminAuth, appointmentController.getAppointmentStats);

// Eliminar una cita (admin)
router.delete('/admin/:appointmentId', auth, adminAuth, appointmentController.deleteAppointment);

// Limpiar penalizaciones expiradas (admin)
router.post('/admin/clean-penalties', auth, adminAuth, appointmentController.cleanExpiredPenalties);

module.exports = router; 