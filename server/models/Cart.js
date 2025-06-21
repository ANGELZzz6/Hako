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
  }
});

module.exports = mongoose.model('Cart', carritoSchema);