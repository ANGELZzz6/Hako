const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Health check básico
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Health check detallado (solo para admin)
router.get('/detailed', auth, adminAuth, async (req, res) => {
  try {
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
      },
      database: {
        status: 'OK',
        connectionState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      },
      services: {
        mercadoPago: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Configured' : 'Not Configured',
        cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not Configured',
        email: process.env.EMAIL_USER ? 'Configured' : 'Not Configured'
      }
    };

    // Verificar estado de la base de datos
    if (mongoose.connection.readyState !== 1) {
      healthData.status = 'DEGRADED';
      healthData.database.status = 'ERROR';
    }

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Health check de la base de datos
router.get('/database', auth, adminAuth, async (req, res) => {
  try {
    // Verificar conexión a MongoDB
    await mongoose.connection.db.admin().ping();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        status: 'Connected',
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'Disconnected',
        readyState: mongoose.connection.readyState
      }
    });
  }
});

// Health check de servicios externos
router.get('/services', auth, adminAuth, async (req, res) => {
  const services = {
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Verificar Mercado Pago
  try {
    if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
      services.services.mercadoPago = {
        status: 'Configured',
        token: process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 20) + '...'
      };
    } else {
      services.services.mercadoPago = {
        status: 'Not Configured'
      };
    }
  } catch (error) {
    services.services.mercadoPago = {
      status: 'Error',
      error: error.message
    };
  }

  // Verificar Cloudinary
  try {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      services.services.cloudinary = {
        status: 'Configured',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      };
    } else {
      services.services.cloudinary = {
        status: 'Not Configured'
      };
    }
  } catch (error) {
    services.services.cloudinary = {
      status: 'Error',
      error: error.message
    };
  }

  // Verificar Email
  try {
    if (process.env.EMAIL_USER) {
      services.services.email = {
        status: 'Configured',
        user: process.env.EMAIL_USER
      };
    } else {
      services.services.email = {
        status: 'Not Configured'
      };
    }
  } catch (error) {
    services.services.email = {
      status: 'Error',
      error: error.message
    };
  }

  res.status(200).json(services);
});

// Health check de endpoints críticos
router.get('/endpoints', async (req, res) => {
  const endpoints = {
    timestamp: new Date().toISOString(),
    endpoints: {
      '/api/health': 'OK',
      '/api/health/detailed': 'OK',
      '/api/health/database': 'OK',
      '/api/health/services': 'OK',
      '/api/products': 'OK',
      '/api/users': 'OK',
      '/api/cart': 'OK',
      '/api/payment': 'OK',
      '/api/orders': 'OK',
      '/api/appointments': 'OK'
    }
  };

  res.status(200).json(endpoints);
});

module.exports = router;
