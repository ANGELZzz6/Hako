const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Usuario que agenda la cita
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Orden asociada
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Fecha y hora de la cita
  scheduledDate: {
    type: Date,
    required: true
  },
  
  // Hora específica (formato: "09:00", "14:30", etc.)
  timeSlot: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validar formato HH:MM
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'El formato de hora debe ser HH:MM'
    }
  },
  
  // Estado de la cita
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  
  // Productos que se van a recoger en esta cita
  itemsToPickup: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lockerNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    }
  }],
  
  // Notas adicionales
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Información de contacto
  contactInfo: {
    phone: String,
    email: String
  },
  
  // Fechas importantes
  confirmedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: String,
    enum: ['user', 'admin', 'system']
  },
  cancellationReason: String
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
appointmentSchema.index({ user: 1 });
appointmentSchema.index({ order: 1 });
appointmentSchema.index({ scheduledDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'itemsToPickup.lockerNumber': 1 });
appointmentSchema.index({ scheduledDate: 1, timeSlot: 1 });

// Método para verificar si una cita está en el pasado
appointmentSchema.methods.isPast = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.scheduledDate);
  appointmentDateTime.setHours(
    parseInt(this.timeSlot.split(':')[0]),
    parseInt(this.timeSlot.split(':')[1]),
    0,
    0
  );
  return appointmentDateTime < now;
};

// Método para obtener la fecha y hora completa de la cita
appointmentSchema.methods.getFullDateTime = function() {
  const appointmentDateTime = new Date(this.scheduledDate);
  appointmentDateTime.setHours(
    parseInt(this.timeSlot.split(':')[0]),
    parseInt(this.timeSlot.split(':')[1]),
    0,
    0
  );
  return appointmentDateTime;
};

// Método estático para verificar disponibilidad de casilleros específicos
appointmentSchema.statics.checkLockerAvailability = async function(date, timeSlot, requestedLockers, excludeAppointmentId = null) {
  const query = {
    scheduledDate: date,
    timeSlot: timeSlot,
    status: { $in: ['scheduled', 'confirmed'] }
  };
  
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }
  
  const conflictingAppointments = await this.find(query);
  
  // Obtener todos los casilleros ocupados en este horario
  const occupiedLockers = new Set();
  conflictingAppointments.forEach(appointment => {
    appointment.itemsToPickup.forEach(item => {
      occupiedLockers.add(item.lockerNumber);
    });
  });
  
  // Verificar si los casilleros solicitados están disponibles
  const requestedLockersSet = new Set(requestedLockers);
  const conflictingLockers = [...requestedLockersSet].filter(locker => occupiedLockers.has(locker));
  
  return {
    available: conflictingLockers.length === 0,
    occupiedLockers: Array.from(occupiedLockers),
    conflictingLockers: conflictingLockers,
    requestedLockers: requestedLockers
  };
};

// Método estático para verificar disponibilidad de un horario (mantener compatibilidad)
appointmentSchema.statics.checkAvailability = async function(date, timeSlot, excludeAppointmentId = null) {
  const query = {
    scheduledDate: date,
    timeSlot: timeSlot,
    status: { $in: ['scheduled', 'confirmed'] }
  };
  
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }
  
  const conflictingAppointments = await this.find(query);
  
  // Obtener todos los casilleros que estarían ocupados en este horario
  const occupiedLockers = new Set();
  conflictingAppointments.forEach(appointment => {
    appointment.itemsToPickup.forEach(item => {
      occupiedLockers.add(item.lockerNumber);
    });
  });
  
  return {
    available: conflictingAppointments.length === 0,
    occupiedLockers: Array.from(occupiedLockers),
    conflictingAppointments: conflictingAppointments.length
  };
};

// Método estático para obtener horarios disponibles
appointmentSchema.statics.getAvailableTimeSlots = async function(date) {
  // Horarios disponibles (de 8:00 a 22:00, cada hora)
  const allTimeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];
  
  const availableSlots = [];
  
  for (const timeSlot of allTimeSlots) {
    // Obtener citas existentes en este horario
    const existingAppointments = await this.find({
      scheduledDate: date,
      timeSlot: timeSlot,
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    // Obtener todos los casilleros ocupados en este horario
    const occupiedLockers = new Set();
    existingAppointments.forEach(appointment => {
      appointment.itemsToPickup.forEach(item => {
        occupiedLockers.add(item.lockerNumber);
      });
    });
    
    // Un horario está disponible si hay al menos un casillero libre (de 12 totales)
    const totalLockers = 12;
    const availableLockers = totalLockers - occupiedLockers.size;
    
    availableSlots.push({
      time: timeSlot,
      available: availableLockers > 0,
      occupiedLockers: Array.from(occupiedLockers),
      availableLockers: availableLockers,
      totalLockers: totalLockers
    });
  }
  
  return availableSlots;
};

module.exports = mongoose.model('Appointment', appointmentSchema); 