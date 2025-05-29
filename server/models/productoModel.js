// productoModel.js
// Esquema de producto para MongoDB usando Mongoose

const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Box Premium', 'Box Gamer', 'Box Anime', 'Box Kawaii', 'Box Retro', 'Box Sorpresa', 'Box Deluxe', 'Box Coleccionista', 'Box Manga', 'Box Arte', 'Box Limited', 'Box Popular']
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt antes de cada guardado
productoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Producto', productoSchema);
