const mongoose = require('mongoose');

const debugLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error'],
    default: 'info'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNote: {
    type: String,
    trim: true
  },
  // Campos adicionales para análisis
  browser: {
    type: String,
    trim: true
  },
  os: {
    type: String,
    trim: true
  },
  device: {
    type: String,
    trim: true
  },
  // Metadatos del error
  stackTrace: {
    type: String
  },
  errorType: {
    type: String,
    trim: true
  },
  // Información del contexto
  pageContext: {
    type: String,
    trim: true
  },
  userAction: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
debugLogSchema.index({ userId: 1, timestamp: -1 });
debugLogSchema.index({ severity: 1, timestamp: -1 });
debugLogSchema.index({ resolved: 1, timestamp: -1 });
debugLogSchema.index({ timestamp: -1 });

// Método para obtener logs no resueltos
debugLogSchema.statics.getUnresolvedLogs = function() {
  return this.find({ resolved: false }).sort({ timestamp: -1 });
};

// Método para obtener logs por severidad
debugLogSchema.statics.getLogsBySeverity = function(severity) {
  return this.find({ severity }).sort({ timestamp: -1 });
};

// Método para obtener logs de un usuario específico
debugLogSchema.statics.getUserLogs = function(userId, limit = 100) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit);
};

// Método para limpiar logs antiguos
debugLogSchema.statics.cleanOldLogs = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({ timestamp: { $lt: cutoffDate } });
};

// Método para obtener estadísticas
debugLogSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'error'] }, 1, 0] }
        },
        warningCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] }
        },
        infoCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'info'] }, 1, 0] }
        },
        unresolvedCount: {
          $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
        }
      }
    }
  ]);
};

// Pre-save middleware para extraer información del user agent
debugLogSchema.pre('save', function(next) {
  if (this.userAgent) {
    // Extraer información básica del user agent
    const ua = this.userAgent.toLowerCase();
    
    // Detectar navegador
    if (ua.includes('chrome')) this.browser = 'Chrome';
    else if (ua.includes('firefox')) this.browser = 'Firefox';
    else if (ua.includes('safari')) this.browser = 'Safari';
    else if (ua.includes('edge')) this.browser = 'Edge';
    else this.browser = 'Otro';
    
    // Detectar sistema operativo
    if (ua.includes('windows')) this.os = 'Windows';
    else if (ua.includes('mac')) this.os = 'macOS';
    else if (ua.includes('linux')) this.os = 'Linux';
    else if (ua.includes('android')) this.os = 'Android';
    else if (ua.includes('ios')) this.os = 'iOS';
    else this.os = 'Otro';
    
    // Detectar dispositivo
    if (ua.includes('mobile')) this.device = 'Mobile';
    else if (ua.includes('tablet')) this.device = 'Tablet';
    else this.device = 'Desktop';
  }
  
  next();
});

// Método virtual para obtener la edad del log
debugLogSchema.virtual('age').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.timestamp.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Configurar virtuals para JSON
debugLogSchema.set('toJSON', { virtuals: true });
debugLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DebugLog', debugLogSchema);
