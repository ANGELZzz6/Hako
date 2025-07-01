const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const internalNoteSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['abierto', 'en proceso', 'cerrado', 'cerrado por usuario'], default: 'abierto' },
  replies: [replySchema],
  internalNotes: [internalNoteSchema],
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  attachments: [String],
  rating: {
    stars: { type: Number },
    comment: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date }
  },
  hiddenForUser: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema); 