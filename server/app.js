// app.js
// Configuración principal de Express

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const productoRoutes = require('./routes/productoRoutes');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const app = express();

// Middleware de seguridad
app.use(helmet());

// Rate limiting para prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana de tiempo (más permisivo)
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para login y registro
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos de login/registro por ventana de tiempo
  message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limitar tamaño de requests

// Aplicar rate limiting general
app.use(limiter);

// Rutas
app.use('/api/products', productoRoutes);
app.use('/api/users', userRoutes); // Sin rate limiting específico para permitir operaciones CRUD

module.exports = app;
