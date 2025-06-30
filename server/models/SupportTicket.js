const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['abierto', 'en proceso', 'cerrado'], default: 'abierto' },
  replies: [replySchema],
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema); 