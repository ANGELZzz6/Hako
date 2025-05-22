// productoModel.js
// Esquema de producto para MongoDB usando Mongoose

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: String,
  precio: Number,
  descripcion: String
});

module.exports = mongoose.model('Producto', productoSchema);
