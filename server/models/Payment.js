const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // ID del pago en Mercado Pago
  mp_payment_id: {
    type: String,
    required: true,
    unique: true
  },
  
  // Estado del pago
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    required: true
  },
  
  // Detalle del estado
  status_detail: {
    type: String,
    default: ''
  },
  
  // Monto del pago
  amount: {
    type: Number,
    required: true
  },
  
  // Moneda
  currency: {
    type: String,
    default: 'COP'
  },
  
  // Método de pago
  payment_method: {
    type: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: ''
    }
  },
  
  // Información del pagador
  payer: {
    email: String,
    name: String,
    surname: String
  },
  
  // Referencia externa (para vincular con orden)
  external_reference: {
    type: String,
    required: true
  },
  
  // ID del usuario que hizo el pago
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Productos comprados en este pago
  purchased_items: [{
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unit_price: {
      type: Number,
      required: true
    },
    product_name: String
  }],
  
  // Fecha de creación del pago
  date_created: {
    type: Date,
    default: Date.now
  },
  
  // Fecha de aprobación
  date_approved: {
    type: Date
  },
  
  // Información adicional
  description: String,
  
  // Modo de pago (test o live)
  live_mode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
paymentSchema.index({ mp_payment_id: 1 });
paymentSchema.index({ external_reference: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ date_created: -1 });

module.exports = mongoose.model('Payment', paymentSchema); 