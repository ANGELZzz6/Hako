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
    },
    // Productos reclamados de este item
    claimed_quantity: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Cantidad de productos reclamados de este item'
    },
    // Locker asignado para este item específico
    assigned_locker: {
      type: Number,
      min: [1, 'El número de casillero debe ser al menos 1'],
      max: [12, 'El número de casillero no puede ser mayor a 12'],
      description: 'Casillero específico asignado para este item'
    }
  }],
  
  // Estado de la orden
  status: {
    type: String,
    enum: ['pending', 'paid', 'ready_for_pickup', 'picked_up', 'cancelled'],
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
  
  // Información del casillero
  locker: {
    number: {
      type: Number,
      required: false,
      min: [1, 'El número de casillero debe ser al menos 1'],
      max: [12, 'El número de casillero no puede ser mayor a 12'],
      validate: {
        validator: function(value) {
          // Si el valor es null, es válido (para pedidos recogidos)
          if (value === null || value === undefined) return true;
          // Si tiene valor, debe estar entre 1 y 12
          return value >= 1 && value <= 12;
        },
        message: 'El número de casillero debe estar entre 1 y 12'
      },
      description: 'Número del casillero seleccionado por el usuario'
    },
    selected_at: {
      type: Date,
      default: Date.now,
      description: 'Fecha cuando el usuario seleccionó el casillero'
    },
    picked_up_at: {
      type: Date,
      description: 'Fecha cuando el usuario recogió el pedido'
    }
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

// Método para obtener productos no reclamados
orderSchema.methods.getUnclaimedItems = function() {
  return this.items.filter(item => item.claimed_quantity < item.quantity);
};

// Método para verificar si todos los productos han sido reclamados
orderSchema.methods.allItemsClaimed = function() {
  return this.items.every(item => item.claimed_quantity >= item.quantity);
};

// Método para calcular el total de productos no reclamados
orderSchema.methods.getTotalUnclaimedQuantity = function() {
  return this.items.reduce((total, item) => {
    return total + (item.quantity - item.claimed_quantity);
  }, 0);
};

module.exports = mongoose.model('Order', orderSchema); 