require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const productoRoutes = require('./routes/productoRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const supportRoutes = require('./routes/supportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const { connectDB } = require('./config/db');
const path = require('path');

// Importar el modelo IndividualProduct para asegurar que esté disponible
require('./models/IndividualProduct');

const app = express();

// Configurar trust proxy para ngrok
app.set('trust proxy', 1);

// Headers específicos para Google OAuth - SIN HELMET
app.use((req, res, next) => {
  // Headers para permitir Google OAuth
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Headers adicionales de seguridad básica
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Configuración de CORS específica para Google OAuth
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting básico
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
console.log('Montando rutas de soporte en /api/support');
app.use('/api/support', supportRoutes);
console.log('Rutas de soporte montadas');
console.log('Antes de montar rutas de pago');
app.use('/api/payment', paymentRoutes);
console.log('Rutas de pago montadas en /api/payment');
app.use('/api/orders', orderRoutes);
console.log('Rutas de pedidos montadas en /api/orders');
app.use('/api/appointments', appointmentRoutes);
console.log('Rutas de citas montadas en /api/appointments');

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Hako funcionando (Modo Desarrollo - Sin Helmet)');
});

// Conectar a MongoDB
connectDB().catch(console.error);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de desarrollo escuchando en el puerto ${PORT}`);
  console.log(`🔧 Configurado para Google OAuth sin restricciones de Helmet`);
  console.log(`🌐 CORS habilitado para: http://localhost:5173`);
}); 