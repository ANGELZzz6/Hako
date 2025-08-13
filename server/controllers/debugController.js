const DebugLog = require('../models/DebugLog');

// Enviar log de debug
exports.sendDebugLog = async (req, res) => {
  try {
    const { message, severity, details, userAgent, url } = req.body;
    const userId = req.user.id;

    // Validar campos requeridos
    if (!message || !severity) {
      return res.status(400).json({ error: 'Mensaje y severidad son requeridos' });
    }

    // Crear nuevo log de debug
    const debugLog = new DebugLog({
      message,
      severity,
      details,
      userId,
      userAgent: userAgent || req.headers['user-agent'],
      url: url || req.headers.referer,
      timestamp: new Date()
    });

    await debugLog.save();

    // Log en consola del servidor para debugging
    console.log(`[DEBUG] ${severity.toUpperCase()}: ${message}`, {
      userId,
      timestamp: debugLog.timestamp,
      details
    });

    res.status(201).json({ message: 'Log de debug enviado correctamente', id: debugLog._id });
  } catch (error) {
    console.error('Error enviando log de debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Enviar múltiples logs de debug
exports.sendDebugLogs = async (req, res) => {
  try {
    const { logs } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de logs válido' });
    }

    // Procesar cada log
    const debugLogs = logs.map(log => ({
      message: log.message,
      severity: log.severity || 'info',
      details: log.details,
      userId,
      userAgent: log.userAgent || req.headers['user-agent'],
      url: log.url || req.headers.referer,
      timestamp: new Date()
    }));

    // Insertar logs en lote
    const insertedLogs = await DebugLog.insertMany(debugLogs);

    console.log(`[DEBUG] ${insertedLogs.length} logs de debug insertados para usuario ${userId}`);

    res.status(201).json({ 
      message: `${insertedLogs.length} logs de debug enviados correctamente`,
      count: insertedLogs.length
    });
  } catch (error) {
    console.error('Error enviando logs de debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener logs de debug (solo admin)
exports.getDebugLogs = async (req, res) => {
  try {
    const { page = 1, limit = 100, severity, userId, startDate, endDate } = req.query;
    
    // Construir filtros
    const filters = {};
    if (severity) filters.severity = severity;
    if (userId) filters.userId = userId;
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      DebugLog.find(filters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'nombre email'),
      DebugLog.countDocuments(filters)
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo logs de debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de debug
exports.getDebugStats = async (req, res) => {
  try {
    const [totalLogs, errorCount, warningCount, infoCount, lastError] = await Promise.all([
      DebugLog.countDocuments(),
      DebugLog.countDocuments({ severity: 'error' }),
      DebugLog.countDocuments({ severity: 'warning' }),
      DebugLog.countDocuments({ severity: 'info' }),
      DebugLog.findOne({ severity: 'error' }).sort({ timestamp: -1 })
    ]);

    res.json({
      totalLogs,
      errorCount,
      warningCount,
      infoCount,
      lastError: lastError ? {
        message: lastError.message,
        timestamp: lastError.timestamp
      } : null
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Limpiar logs antiguos
exports.clearOldLogs = async (req, res) => {
  try {
    const { daysOld = 7 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));

    const result = await DebugLog.deleteMany({ timestamp: { $lt: cutoffDate } });

    console.log(`[DEBUG] ${result.deletedCount} logs antiguos eliminados (más de ${daysOld} días)`);

    res.json({ 
      message: `${result.deletedCount} logs antiguos eliminados`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error limpiando logs antiguos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener logs de un usuario específico
exports.getUserDebugLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      DebugLog.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DebugLog.countDocuments({ userId })
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error obteniendo logs de usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Marcar log como resuelto
exports.resolveDebugLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { resolved, adminNote } = req.body;

    const log = await DebugLog.findByIdAndUpdate(
      logId,
      { 
        resolved: resolved || true,
        adminNote,
        resolvedAt: new Date(),
        resolvedBy: req.user.id
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ error: 'Log de debug no encontrado' });
    }

    res.json({ 
      message: 'Log marcado como resuelto',
      log
    });
  } catch (error) {
    console.error('Error resolviendo log de debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
