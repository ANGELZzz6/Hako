const mongoose = require('mongoose');

const qrSchema = new mongoose.Schema({
  id_compra: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  qr_url: {
    type: String,
    required: true
  },
  generado_en: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Qr', qrSchema); 