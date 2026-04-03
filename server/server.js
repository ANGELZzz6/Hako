const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const isDev = process.env.NODE_ENV === 'development';

// Importar y ejecutar validateEnv para verificar NODE_ENV, URLs, JWT length, etc.
const { validateEnvironment } = require('./config/validateEnv');
validateEnvironment();

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

if (isDev) console.log('✅ Todas las variables de entorno están configuradas.');

// Configurar zona horaria para el servidor
process.env.TZ = 'America/Bogota'; // Zona horaria de Colombia
if (isDev) console.log('🕐 Zona horaria del servidor configurada:', process.env.TZ);
if (isDev) console.log('🕐 Hora actual del servidor:', new Date().toLocaleString());

const express = require('express');
const mongoSanitize = require('express-mongo-sanitize');
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
const lockerAssignmentRoutes = require('./routes/lockerAssignmentRoutes');
const debugRoutes = require('./routes/debugRoutes');
const qrRoutes = require('./routes/qrRoutes');
const healthRoutes = require('./routes/healthRoutes');
const siteSettingsRoutes = require('./routes/siteSettingsRoutes');
const { scheduleTasks } = require('./scheduledTasks');

// Importar el modelo IndividualProduct para asegurar que esté disponible
require('./models/IndividualProduct');
const { connectDB } = require('./config/db');

const app = express();

// Confiar en el primer proxy (requerido para ngrok y reverse proxies en producción)
app.set('trust proxy', 1);

// Headers específicos para Google OAuth - DEBE IR ANTES DE HELMET
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Configuración de CORS específica para Google OAuth
app.use(cors({
  origin: true,
  credentials: true
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

// Rate limiting específico para login y registro (max 10 cada 15 min, excepto en test)
const authLimitMax = process.env.NODE_ENV === 'test' ? 1000 : 10;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authLimitMax,
  message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize()); // Prevenir inyección NoSQL / operadores $where, $gt, etc.

// Rutas
app.use('/api/products', productoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/locker-assignments', lockerAssignmentRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/settings', siteSettingsRoutes);

if (isDev) {
  console.log('✅ Rutas de pago montadas en /api/payment');
  console.log('✅ Rutas de pedidos montadas en /api/orders');
  console.log('✅ Rutas de citas montadas en /api/appointments');
  console.log('✅ Rutas de casilleros montadas en /api/locker-assignments');
}

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Hako funcionando');
});

// Conectar a MongoDB
connectDB().catch(console.error);

// Manejador global de errores — captura cualquier next(err) de controllers
// Debe estar ANTES de app.listen y DESPUÉS de todas las rutas
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[GlobalErrorHandler]', err);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  console.log(`Configurado para Google OAuth con headers de seguridad`);

  // Iniciar tareas programadas después de que el servidor esté funcionando
  try {
    scheduleTasks();
    console.log('✅ Tareas programadas iniciadas correctamente');
  } catch (error) {
    console.error('❌ Error al iniciar tareas programadas:', error);
  }
});