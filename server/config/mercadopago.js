const { MercadoPagoConfig } = require('mercadopago');

// Configuración para entorno de pruebas
// IMPORTANTE: Usar un access token válido de tu cuenta de Mercado Pago
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

const mp = new MercadoPagoConfig({
  accessToken: accessToken
});

console.log('=== CONFIGURACIÓN MERCADO PAGO ===');
console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NO CONFIGURADO');
console.log('Entorno: PRUEBAS');
console.log('=====================================');

// Verificar que el access token sea válido
if (!accessToken || !accessToken.startsWith('TEST-')) {
  console.error('⚠️  ADVERTENCIA: Access Token no válido para pruebas');
  console.error('   Obtén un nuevo token en: https://www.mercadopago.com/developers/panel/credentials');
  console.error('   El token debe empezar con TEST-');
}

// Función para validar la configuración
const validateConfig = async () => {
  try {
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    console.log('🔍 Validando configuración de Mercado Pago...');
    console.log('Token usado:', accessToken.substring(0, 20) + '...');
    
    // Intentar crear una preferencia de prueba
    const testPreference = {
      items: [
        {
          title: 'Test Product',
          quantity: 1,
          unit_price: 100
        }
      ],
      payer: {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      },
      back_urls: {
        success: 'http://localhost:5173/payment-result',
        failure: 'http://localhost:5173/payment-result',
        pending: 'http://localhost:5173/payment-result'
      }
    };
    
    const preference = await preferenceClient.create({ body: testPreference });
    console.log('✅ Configuración válida - Preferencia de prueba creada:', preference.id);
    console.log('✅ Token de acceso válido y funcionando correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en la configuración de Mercado Pago:');
    console.error('   Mensaje:', error.message);
    console.error('   Código de error:', error.error);
    console.error('   Causa:', error.cause);
    
    if (error.error === 'bad_request' && error.cause && error.cause[0]) {
      const errorCode = error.cause[0].code;
      const errorDesc = error.cause[0].description;
      
      console.error(`   Código específico: ${errorCode} - ${errorDesc}`);
      
      if (errorCode === 2034) {
        console.error('🔧 SOLUCIÓN: El Access Token no es válido o ha expirado');
        console.error('   1. Ve a https://www.mercadopago.com/developers/panel');
        console.error('   2. Inicia sesión con tu cuenta');
        console.error('   3. Ve a "Credenciales" → "Credenciales de prueba"');
        console.error('   4. Copia el nuevo Access Token');
        console.error('   5. Actualiza la variable de entorno MERCADOPAGO_ACCESS_TOKEN');
      } else if (errorCode === 401) {
        console.error('🔧 SOLUCIÓN: Error de autenticación - Verifica el token');
      } else {
        console.error('🔧 SOLUCIÓN: Error desconocido - Revisa la documentación de Mercado Pago');
      }
    }
    return false;
  }
};

// Validar configuración al cargar el módulo
validateConfig();

module.exports = mp; 