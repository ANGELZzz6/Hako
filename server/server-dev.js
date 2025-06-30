require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const productoRoutes = require('./routes/productoRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const supportRoutes = require('./routes/supportRoutes');
const { connectDB } = require('./config/db');
const path = require('path');

const app = express();

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