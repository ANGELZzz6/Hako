// app.js
// Configuración principal de Express

// Configurar zona horaria para el servidor
process.env.TZ = 'America/Bogota'; // Zona horaria de Colombia
console.log('🕐 Zona horaria del servidor configurada:', process.env.TZ);
console.log('🕐 Hora actual del servidor:', new Date().toLocaleString());

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
console.log('Antes de require productoRoutes');
const productoRoutes = require('./routes/productoRoutes');
console.log('Después de require productoRoutes');
const userRoutes = require('./routes/userRoutes');
console.log('Antes de require userRoutes');
const cartRoutes = require('./routes/cartRoutes');
console.log('Antes de require cartRoutes');
const cors = require('cors');
const supportRoutes = require('./routes/supportRoutes');
console.log('Antes de require soporte');
console.log('Antes de require paymentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
console.log('Después de require paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
console.log('Antes de require orderRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
console.log('Antes de require appointmentRoutes');
const debugRoutes = require('./routes/debugRoutes');
console.log('Antes de require debugRoutes');
const qrRoutes = require('./routes/qrRoutes');
console.log('Antes de require qrRoutes');
const lockerAssignmentRoutes = require('./routes/lockerAssignmentRoutes');
console.log('Antes de require lockerAssignmentRoutes');
const syncRoutes = require('./routes/syncRoutes');
console.log('Antes de require syncRoutes');
const app = express();

// Configuración de CORS más permisiva para Google OAuth
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configuración de Helmet más permisiva para Google OAuth
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

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

app.use(express.json({ limit: '10mb' })); // Limitar tamaño de requests

// Aplicar rate limiting general
app.use(limiter);

// Rutas
app.use('/api/products', productoRoutes);
app.use('/api/users', userRoutes); // Sin rate limiting específico para permitir operaciones CRUD
app.use('/api/cart', cartRoutes);
console.log('Montando rutas de soporte en /api/support');
app.use('/api/support', supportRoutes);
console.log('Rutas de soporte montadas');
console.log('Rutas de pago montadas en /api/payment');
app.use('/api/payment', paymentRoutes);
console.log('Rutas de pedidos montadas en /api/orders');
app.use('/api/orders', orderRoutes);
console.log('Rutas de citas montadas en /api/appointments');
app.use('/api/appointments', appointmentRoutes);
console.log('Rutas de debug montadas en /api/debug');
app.use('/api/debug', debugRoutes);
console.log('Rutas de QR montadas en /api/qr');
app.use('/api/qr', qrRoutes);
console.log('Rutas de locker assignments montadas en /api/locker-assignments');
app.use('/api/locker-assignments', lockerAssignmentRoutes);
console.log('Rutas de sincronización montadas en /api/sync');
app.use('/api/sync', syncRoutes);

module.exports = app;
