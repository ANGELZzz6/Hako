const mongoose = require('mongoose');

const detalle_compra_schema = new mongoose.Schema({
  id_producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precio_unitario: {
    type: Number,
    required: true,
    min: 0
  }
});

const compraSchema = new mongoose.Schema({
  id_usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  detalles: [detalle_compra_schema],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  fecha_compra: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', compraSchema); 