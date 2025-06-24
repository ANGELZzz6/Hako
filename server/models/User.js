const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [50, 'El nombre no puede exceder 50 caracteres'],
        validate: {
            validator: function(v) {
                return /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(v);
            },
            message: 'El nombre solo puede contener letras y espacios'
        }
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Formato de email inválido'
        }
    },
    contraseña: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
        validate: {
            validator: function(v) {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(v);
            },
            message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un símbolo'
        }
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'admin'],
            message: 'El rol debe ser "user" o "admin"'
        },
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    verificationCode: {
        type: String,
        select: false // No incluir en consultas por defecto
    },
    verificationCodeExpires: {
        type: Date,
        select: false // No incluir en consultas por defecto
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Índices para mejor rendimiento y seguridad
userSchema.index({ verificationCode: 1 });
userSchema.index({ lockUntil: 1 });

// Método para verificar si la cuenta está bloqueada
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Método para incrementar intentos de login
userSchema.methods.incLoginAttempts = function() {
    // Si ya está bloqueado y el tiempo de bloqueo ha expirado, resetear
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Bloquear cuenta si excede 5 intentos
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutos
    }
    
    return this.updateOne(updates);
};

// Método para resetear intentos de login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

// Middleware pre-save para validaciones adicionales
userSchema.pre('save', function(next) {
    // Asegurar que el email esté en minúsculas
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    
    // Asegurar que el nombre esté correctamente formateado
    if (this.nombre) {
        this.nombre = this.nombre.trim();
    }
    
    next();
});

module.exports = mongoose.model('User', userSchema, 'usuarios');