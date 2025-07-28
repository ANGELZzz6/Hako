const mongoose = require('mongoose');

const cartHistorySchema = new mongoose.Schema({
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['add', 'remove', 'update', 'clear'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  productName: String,
  quantity: Number,
  price: Number,
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Campos adicionales para optimizar consultas
  actionType: {
    type: String,
    enum: ['product', 'cart'],
    default: 'product'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
cartHistorySchema.index({ cartId: 1, timestamp: -1 });
cartHistorySchema.index({ userId: 1, timestamp: -1 });
cartHistorySchema.index({ action: 1, timestamp: -1 });

// Método para limpiar historial antiguo (más de 30 días)
cartHistorySchema.statics.cleanOldHistory = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.deleteMany({
    timestamp: { $lt: thirtyDaysAgo }
  });
};

module.exports = mongoose.model('CartHistory', cartHistorySchema); 