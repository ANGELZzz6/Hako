const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  urls: {
    type: [String],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Suggestion', suggestionSchema); 