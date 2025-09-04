const mongoose = require('mongoose');

const LockerProductSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  individualProductId: {
    type: String,
    default: null
  },
  originalProductId: {
    type: String,
    default: null
  },
  variants: {
    type: Map,
    of: String,
    default: {}
  },
  variantDimensions: {
    largo: {
      type: Number,
      required: false,
      min: 0
    },
    ancho: {
      type: Number,
      required: false,
      min: 0
    },
    alto: {
      type: Number,
      required: false,
      min: 0
    },
    peso: {
      type: Number,
      required: false,
      min: 0
    }
  },
  dimensions: {
    largo: {
      type: Number,
      required: true,
      min: 0
    },
    ancho: {
      type: Number,
      required: true,
      min: 0
    },
    alto: {
      type: Number,
      required: true,
      min: 0
    },
    peso: {
      type: Number,
      required: true,
      min: 0
    }
  },
  calculatedSlots: {
    type: Number,
    required: true,
    min: 1
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  volume: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const LockerAssignmentSchema = new mongoose.Schema({
  lockerNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 100 // Asumiendo máximo 100 casilleros
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  appointmentId: {
    type: String,
    required: true
  },
  scheduledDate: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validar formato de fecha YYYY-MM-DD
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'La fecha debe estar en formato YYYY-MM-DD'
    }
  },
  timeSlot: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validar formato de hora HH:MM
        return /^\d{2}:\d{2}$/.test(v);
      },
      message: 'La hora debe estar en formato HH:MM'
    }
  },
  status: {
    type: String,
    enum: ['reserved', 'active', 'completed', 'cancelled'],
    default: 'reserved'
  },
  products: {
    type: [LockerProductSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Debe haber al menos un producto en la asignación'
    }
  },
  totalSlotsUsed: {
    type: Number,
    required: true,
    min: 1,
    max: 27 // Máximo 27 slots por casillero (3x3x3)
  }
}, {
  timestamps: true,
  collection: 'locker_assignments'
});

// Índices para optimizar consultas
LockerAssignmentSchema.index({ scheduledDate: 1, timeSlot: 1 });
LockerAssignmentSchema.index({ lockerNumber: 1, scheduledDate: 1, timeSlot: 1 }, { unique: true });
LockerAssignmentSchema.index({ userId: 1 });
LockerAssignmentSchema.index({ appointmentId: 1 });
LockerAssignmentSchema.index({ status: 1 });

// Middleware para calcular totalSlotsUsed automáticamente
LockerAssignmentSchema.pre('save', function(next) {
  if (this.products && this.products.length > 0) {
    this.totalSlotsUsed = this.products.reduce((total, product) => {
      return total + (product.calculatedSlots * product.quantity);
    }, 0);
  }
  next();
});

// Método para verificar si el casillero puede acomodar los productos
LockerAssignmentSchema.methods.canFitInLocker = function() {
  return this.totalSlotsUsed <= 27;
};

// Método estático para obtener asignaciones por fecha y hora
LockerAssignmentSchema.statics.getByDateTime = function(date, timeSlot) {
  return this.find({ scheduledDate: date, timeSlot: timeSlot });
};

// Método estático para obtener asignación por casillero, fecha y hora
LockerAssignmentSchema.statics.getByLocker = function(lockerNumber, date, timeSlot) {
  return this.findOne({ 
    lockerNumber: lockerNumber, 
    scheduledDate: date, 
    timeSlot: timeSlot 
  });
};

// Método estático para verificar disponibilidad de casillero
LockerAssignmentSchema.statics.isLockerAvailable = function(lockerNumber, date, timeSlot) {
  return this.findOne({ 
    lockerNumber: lockerNumber, 
    scheduledDate: date, 
    timeSlot: timeSlot,
    status: { $in: ['reserved', 'active'] }
  }).then(assignment => !assignment);
};

module.exports = mongoose.model('LockerAssignment', LockerAssignmentSchema);
