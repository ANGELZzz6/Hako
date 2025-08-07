require('dotenv').config();

// Configurar zona horaria para el servidor
process.env.TZ = 'America/Bogota'; // Zona horaria de Colombia
console.log('🕐 Zona horaria del servidor configurada:', process.env.TZ);
console.log('🕐 Hora actual del servidor:', new Date().toLocaleString());

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const productoRoutes = require('./routes/productoRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const supportRoutes = require('./routes/supportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

// Importar el modelo IndividualProduct para asegurar que esté disponible
require('./models/IndividualProduct');
const { connectDB } = require('./config/db');
const path = require('path');

const app = express();

// Headers específicos para Google OAuth - DEBE IR ANTES DE HELMET
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Configuración de CORS específica para Google OAuth
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
  contentSecurityPolicy: false, // Desactivar CSP temporalmente para Google OAuth
  hsts: false, // Desactivar HSTS para desarrollo
  noSniff: false, // Desactivar noSniff para desarrollo
  referrerPolicy: false, // Desactivar referrerPolicy para desarrollo
  xssFilter: false // Desactivar XSS filter para desarrollo
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/products', productoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/appointments', appointmentRoutes);

console.log('✅ Rutas de pago montadas en /api/payment');
console.log('✅ Rutas de pedidos montadas en /api/orders');
console.log('✅ Rutas de citas montadas en /api/appointments');

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Hako funcionando');
});

// Conectar a MongoDB
connectDB().catch(console.error);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  console.log(`Configurado para Google OAuth con headers de seguridad`);
}); 