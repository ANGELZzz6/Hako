// validateEnv.js
// Validador de variables de entorno para producción

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'WOMPI_PRIVATE_KEY_TEST',
  'WOMPI_PUBLIC_KEY_TEST',
  'WOMPI_EVENTS_SECRET',
  'FRONTEND_URL'
];

const optionalEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'WEBHOOK_URL',
  'ALLOWED_ORIGINS',
  'LOG_LEVEL'
];

function validateEnvironment() {
  console.log('🔍 Validando configuración de entorno...');
  
  const missing = [];
  const warnings = [];
  
  // Verificar variables requeridas
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  // Verificar variables opcionales
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });
  
  // Mostrar errores críticos
  if (missing.length > 0) {
    console.error('❌ ERROR CRÍTICO: Variables de entorno faltantes:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Solución: Configura estas variables en tu archivo .env');
    process.exit(1);
  }
  
  // Mostrar advertencias
  if (warnings.length > 0) {
    console.warn('⚠️ ADVERTENCIA: Variables opcionales no configuradas:');
    warnings.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('\n💡 Estas variables son opcionales pero recomendadas para funcionalidad completa');
  }
  
  // Validaciones específicas
  validateSpecificValues();
  
  console.log('✅ Configuración de entorno validada correctamente');
}

function validateSpecificValues() {
  // Validar NODE_ENV
  if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    console.error('❌ ERROR: NODE_ENV debe ser "development", "production" o "test"');
    process.exit(1);
  }
  
  // Validar PORT
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ ERROR: PORT debe ser un número entre 1 y 65535');
    process.exit(1);
  }
  
  // Validar JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ ERROR: JWT_SECRET debe tener al menos 32 caracteres para seguridad');
    process.exit(1);
  }
  
  // Validar URLs
  try {
    new URL(process.env.FRONTEND_URL);
  } catch (error) {
    console.error('❌ ERROR: FRONTEND_URL debe ser una URL válida');
    process.exit(1);
  }
  
  // Validar MongoDB URI
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    console.error('❌ ERROR: MONGODB_URI debe ser una URI válida de MongoDB');
    process.exit(1);
  }
  
  // Validar Mercado Pago token
  if (process.env.MERCADOPAGO_ACCESS_TOKEN && !process.env.MERCADOPAGO_ACCESS_TOKEN.startsWith('APP_USR-')) {
    console.warn('⚠️ ADVERTENCIA: MERCADOPAGO_ACCESS_TOKEN no parece ser un token de producción válido');
  }
  
  // Validar CORS origins en producción
  if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',');
    origins.forEach(origin => {
      try {
        new URL(origin.trim());
      } catch (error) {
        console.error(`❌ ERROR: Origen CORS inválido: ${origin}`);
        process.exit(1);
      }
    });
  }
}

// Función para mostrar configuración actual (sin valores sensibles)
function showCurrentConfig() {
  console.log('\n📋 Configuración actual:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   PORT: ${process.env.PORT}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   MERCADOPAGO_ACCESS_TOKEN: ${process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  console.log(`   WEBHOOK_URL: ${process.env.WEBHOOK_URL || 'No configurado'}`);
  console.log(`   ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'No configurado'}`);
  console.log(`   LOG_LEVEL: ${process.env.LOG_LEVEL || 'info'}`);
}

module.exports = {
  validateEnvironment,
  showCurrentConfig,
  requiredEnvVars,
  optionalEnvVars
};
