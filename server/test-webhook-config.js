require('dotenv').config();

console.log('🔍 VERIFICANDO CONFIGURACIÓN DEL WEBHOOK');
console.log('==========================================');

// Verificar variables de entorno
const { MERCADOPAGO_ACCESS_TOKEN } = process.env;

console.log('📋 Variables de entorno:');
console.log('  - MERCADOPAGO_ACCESS_TOKEN:', MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ NO CONFIGURADO');

if (MERCADOPAGO_ACCESS_TOKEN) {
  console.log('  - Token (primeros 20 chars):', MERCADOPAGO_ACCESS_TOKEN.substring(0, 20) + '...');
  console.log('  - Tipo de token:', MERCADOPAGO_ACCESS_TOKEN.startsWith('TEST-') ? '🧪 PRUEBAS' : '🚨 PRODUCCIÓN');
} else {
  console.log('❌ ERROR: MERCADOPAGO_ACCESS_TOKEN no está configurado');
  console.log('');
  console.log('🔧 SOLUCIÓN:');
  console.log('1. Ve a https://www.mercadopago.com/developers/panel');
  console.log('2. Inicia sesión con tu cuenta');
  console.log('3. Ve a "Credenciales" → "Credenciales de prueba"');
  console.log('4. Copia el Access Token');
  console.log('5. Agrega en tu archivo .env:');
  console.log('   MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx');
  console.log('');
  process.exit(1);
}

// Verificar que el token sea válido
const axios = require('axios');

async function testToken() {
  try {
    console.log('');
    console.log('🧪 Probando Access Token...');
    
    const response = await axios.get('https://api.mercadopago.com/v1/payments/search', {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
      },
      params: {
        limit: 1
      }
    });
    
    console.log('✅ Token válido - Conexión exitosa con Mercado Pago');
    console.log('📊 Respuesta de prueba:', response.status);
    
  } catch (error) {
    console.log('❌ Error probando token:', error.response?.status, error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('');
      console.log('🔧 SOLUCIÓN: Token inválido o expirado');
      console.log('1. Obtén un nuevo token en el panel de desarrolladores');
      console.log('2. Asegúrate de que sea un token de PRUEBAS (empiece con TEST-)');
    }
  }
}

// Verificar configuración del webhook
console.log('');
console.log('🔗 CONFIGURACIÓN DEL WEBHOOK:');
console.log('URL del webhook:', 'https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago');
console.log('Clave secreta:', '59e47f91f713216ea4aebf571ac7bb5ad308513bc7991a141d1815f014505efe');

console.log('');
console.log('📝 INSTRUCCIONES:');
console.log('1. Ve al panel de Mercado Pago');
console.log('2. Configura la URL del webhook con la URL de arriba');
console.log('3. Usa la clave secreta proporcionada');
console.log('4. Prueba el webhook desde el panel');

testToken(); 