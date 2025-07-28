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
  
  // Calcular el total basado en los items actuales
  this.total = this.items.reduce((sum, item) => {
    return sum + (item.precio_unitario * item.cantidad);
  }, 0);
  
  next();
});

// Método para recalcular el total manualmente
carritoSchema.methods.recalculateTotal = function() {
  this.total = this.items.reduce((sum, item) => {
    return sum + (item.precio_unitario * item.cantidad);
  }, 0);
  return this.total;
};

// Método estático para limpiar carritos con totales incorrectos
carritoSchema.statics.fixIncorrectTotals = async function() {
  const carts = await this.find().populate('items.id_producto');
  
  for (const cart of carts) {
    const correctTotal = cart.items.reduce((sum, item) => {
      return sum + (item.precio_unitario * item.cantidad);
    }, 0);
    
    if (cart.total !== correctTotal) {
      cart.total = correctTotal;
      await cart.save();
      console.log(`Fixed cart ${cart._id}: ${cart.total} -> ${correctTotal}`);
    }
  }
};

module.exports = mongoose.model('Cart', carritoSchema);