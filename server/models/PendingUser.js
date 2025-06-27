const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    contraseña: {
        type: String,
        required: true
    },
    verificationCode: {
        type: String,
        required: true
    },
    verificationCodeExpires: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // 10 minutos
    }
});

module.exports = mongoose.model('PendingUser', pendingUserSchema, 'pending_users'); 