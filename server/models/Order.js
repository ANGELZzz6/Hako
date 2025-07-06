const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Usuario que hizo la orden
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Productos en la orden
  items: [{
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
    unit_price: {
      type: Number,
      required: true
    },
    total_price: {
      type: Number,
      required: true
    }
  }],
  
  // Estado de la orden
  status: {
    type: String,
    enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Información de pago
  payment: {
    mp_payment_id: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    method: String,
    amount: Number,
    currency: {
      type: String,
      default: 'COP'
    }
  },
  
  // Referencia externa para Mercado Pago
  external_reference: {
    type: String,
    required: true,
    unique: true
  },
  
  // Total de la orden
  total_amount: {
    type: Number,
    required: true
  },
  
  // Información de envío
  shipping: {
    address: String,
    city: String,
    postal_code: String,
    phone: String
  },
  
  // Fechas importantes
  paid_at: Date,
  shipped_at: Date,
  delivered_at: Date,
  
  // Notas
  notes: String
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ external_reference: 1 });
orderSchema.index({ 'payment.mp_payment_id': 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema); 