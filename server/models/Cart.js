const mongoose = require('mongoose');

const item_carrito_schema = new mongoose.Schema({
  id_producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  precio_unitario: {
    type: Number,
    required: true
  },
  nombre_producto: {
    type: String,
    required: true
  },
  imagen_producto: {
    type: String,
    required: true
  },
  variants: {
    type: Map,
    of: String,
    default: undefined
  }
});

const carritoSchema = new mongoose.Schema({
  id_usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [item_carrito_schema],
  creado_en: {
    type: Date,
    default: Date.now
  },
  actualizado_en: {
    type: Date,
    default: Date.now
  },
  total: {
    type: Number,
    default: 0
  }
});

// Middleware para actualizar el timestamp y calcular el total
carritoSchema.pre('save', function(next) {
  this.actualizado_en = new Date();
  
  // Calcular el total
  this.total = this.items.reduce((sum, item) => {
    return sum + (item.precio_unitario * item.cantidad);
  }, 0);
  
  next();
});

module.exports = mongoose.model('Cart', carritoSchema);