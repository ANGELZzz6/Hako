const mongoose = require('mongoose');

const qrSchema = new mongoose.Schema({
  // ID único del QR (se generará automáticamente)
  qr_id: {
    type: String,
    required: true,
    unique: true
  },
  
  // Orden asociada
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Cita asociada
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  
  // Usuario que generó el QR
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Estado del QR
  status: {
    type: String,
    enum: ['disponible', 'vencido', 'recogido'],
    default: 'disponible'
  },
  
  // URL del código QR generado
  qr_url: {
    type: String,
    required: true
  },
  
  // Fecha de generación
  generado_en: {
    type: Date,
    default: Date.now
  },
  
  // Fecha de vencimiento (cuando vence la cita)
  vencimiento: {
    type: Date,
    required: true
  },
  
  // Fecha de recogida
  recogido_en: {
    type: Date
  },
  
  // Productos asociados al QR
  productos: [{
    individualProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IndividualProduct',
      required: true
    },
    lockerNumber: {
      type: Number,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
qrSchema.index({ qr_id: 1 });
qrSchema.index({ order: 1 });
qrSchema.index({ appointment: 1 });
qrSchema.index({ user: 1 });
qrSchema.index({ status: 1 });
qrSchema.index({ vencimiento: 1 });

// Método para verificar si el QR está vencido
qrSchema.methods.isExpired = function() {
  return new Date() > this.vencimiento;
};

// Método para marcar como recogido
qrSchema.methods.markAsPickedUp = function() {
  this.status = 'recogido';
  this.recogido_en = new Date();
  return this.save();
};

// Método para verificar si puede ser usado
qrSchema.methods.canBeUsed = function() {
  return this.status === 'disponible' && !this.isExpired();
};

module.exports = mongoose.model('Qr', qrSchema); 