const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const syncExistingAppointments = require('../sync-existing-appointments');

// Endpoint para sincronizar todas las citas existentes
router.post('/sync-all-appointments', async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización manual de todas las citas...');
    
    // Verificar conexión a MongoDB antes de proceder
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'No hay conexión activa a la base de datos',
        error: 'MongoDB connection not available'
      });
    }
    
    // Ejecutar la sincronización
    await syncExistingAppointments();
    
    res.json({
      success: true,
      message: 'Sincronización completada exitosamente'
    });
  } catch (error) {
    console.error('Error en sincronización manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la sincronización',
      error: error.message
    });
  }
});

// Endpoint para sincronizar citas de una fecha específica
router.post('/sync-appointments-by-date', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la fecha para sincronizar'
      });
    }

    console.log(`🔄 Sincronizando citas para la fecha: ${date}`);
    
    const lockerAssignmentService = require('../services/lockerAssignmentService');
    const result = await lockerAssignmentService.syncFromAppointments(date);
    
    res.json({
      success: true,
      message: `Sincronización completada para ${date}`,
      data: result
    });
  } catch (error) {
    console.error('Error en sincronización por fecha:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la sincronización',
      error: error.message
    });
  }
});

// Endpoint para verificar el estado de sincronización
router.get('/sync-status', async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    const LockerAssignment = require('../models/LockerAssignment');
    
    // Obtener estadísticas
    const totalAppointments = await Appointment.countDocuments({
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    const totalAssignments = await LockerAssignment.countDocuments();
    
    // Obtener appointments sin assignments
    const appointmentsWithoutAssignments = await Appointment.find({
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('_id scheduledDate timeSlot status');
    
    const appointmentsWithAssignments = [];
    const appointmentsWithoutAssignmentsList = [];
    
    for (const appointment of appointmentsWithoutAssignments) {
      const assignment = await LockerAssignment.findOne({
        appointmentId: appointment._id.toString()
      });
      
      if (assignment) {
        appointmentsWithAssignments.push(appointment);
      } else {
        appointmentsWithoutAssignmentsList.push(appointment);
      }
    }
    
    res.json({
      success: true,
      data: {
        totalAppointments,
        totalAssignments,
        appointmentsWithAssignments: appointmentsWithAssignments.length,
        appointmentsWithoutAssignments: appointmentsWithoutAssignmentsList.length,
        syncPercentage: totalAppointments > 0 ? 
          Math.round((appointmentsWithAssignments.length / totalAppointments) * 100) : 0,
        unsyncedAppointments: appointmentsWithoutAssignmentsList
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado de sincronización:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado de sincronización',
      error: error.message
    });
  }
});

module.exports = router;
