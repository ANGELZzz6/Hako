const { MercadoPagoConfig, Preference } = require('mercadopago');

// Configuración para entorno de pruebas
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534';

const mp = new MercadoPagoConfig({
  accessToken: accessToken
});

const preferenceClient = new Preference(mp);

async function testAccessToken() {
  console.log('=== VERIFICACIÓN DE ACCESS TOKEN ===');
  console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NO CONFIGURADO');
  console.log('Entorno: PRUEBAS');
  console.log('=====================================');
  
  try {
    // Verificar que el access token sea válido
    if (!accessToken || !accessToken.startsWith('TEST-')) {
      console.error('❌ ERROR: Access Token no válido para pruebas');
      console.error('   Obtén un nuevo token en: https://www.mercadopago.com/developers/panel/credentials');
      console.error('   El token debe empezar con TEST-');
      return false;
    }
    
    console.log('✅ Access Token válido para pruebas');
    
    // Intentar crear una preferencia simple para verificar el token
    console.log('📤 Probando Access Token con preferencia simple...');
    
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
        success: 'https://httpbin.org/status/200',
        failure: 'https://httpbin.org/status/200',
        pending: 'https://httpbin.org/status/200'
      }
    };
    
    const preference = await preferenceClient.create({ body: testPreference });
    
    console.log('✅ Access Token funciona correctamente');
    console.log('   Preference ID:', preference.id);
    console.log('   Init Point:', preference.init_point);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error verificando Access Token:');
    console.error('   Mensaje:', error.message);
    console.error('   Error:', error.error);
    
    if (error.cause && Array.isArray(error.cause)) {
      console.error('   Causas del error:');
      error.cause.forEach((cause, index) => {
        console.error(`     Causa ${index + 1}:`, JSON.stringify(cause, null, 2));
      });
    }
    
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
}

// Ejecutar la verificación
testAccessToken()
  .then(success => {
    if (success) {
      console.log('\n✅ Access Token verificado exitosamente');
      console.log('El problema puede estar en la configuración específica de PSE');
      process.exit(0);
    } else {
      console.log('\n❌ Access Token inválido - Renueva el token');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }); 