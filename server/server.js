require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET', 
  'MERCADOPAGO_ACCESS_TOKEN',
  'GOOGLE_CLIENT_ID',
  'FRONTEND_URL',
  'WEBHOOK_URL',
  'PORT'
];

const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ ERROR: Faltan variables de entorno:');
  missing.forEach(key => console.error(`   → ${key}`));
  console.error('Agrega estas variables al archivo .env y reinicia.');
  process.exit(1);
}

console.log('✅ Todas las variables de entorno están configuradas.');

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
const debugRoutes = require('./routes/debugRoutes');
const qrRoutes = require('./routes/qrRoutes');
const healthRoutes = require('./routes/healthRoutes');

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
  origin: process.env.FRONTEND_URL,
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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com"]
    }
  },
  hsts: true,
  noSniff: true,
  referrerPolicy: false,
  xssFilter: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
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
app.use('/api/debug', debugRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/health', healthRoutes);

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