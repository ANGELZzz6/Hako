const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuración para entorno de pruebas
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534';

const mp = new MercadoPagoConfig({
  accessToken: accessToken
});

const paymentClient = new Payment(mp);

async function testMercadoPagoConfig() {
  console.log('=== DIAGNÓSTICO DE CONFIGURACIÓN MERCADO PAGO ===');
  console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NO CONFIGURADO');
  console.log('Entorno: PRUEBAS');
  console.log('================================================');
  
  try {
    // Verificar que el access token sea válido
    if (!accessToken || !accessToken.startsWith('TEST-')) {
      console.error('❌ ERROR: Access Token no válido para pruebas');
      console.error('   Obtén un nuevo token en: https://www.mercadopago.com/developers/panel/credentials');
      console.error('   El token debe empezar con TEST-');
      return false;
    }
    
    console.log('✅ Access Token válido para pruebas');
    
    // Crear un pago PSE de prueba mínimo
    const testPaymentData = {
      transaction_amount: 1600,
      description: 'Prueba PSE',
      payment_method_id: 'pse',
      payer: {
        entity_type: 'individual',
        email: 'test_user_123456@testuser.com',
        identification: {
          type: 'CC',
          number: '12345678'
        },
        first_name: 'Test',
        last_name: 'User',
        address: {
          zip_code: '11011',
          street_name: 'Calle Principal',
          street_number: '123',
          neighborhood: 'Centro',
          city: 'Bogotá',
          federal_unit: 'Cundinamarca'
        },
        phone: {
          area_code: '300',
          number: '1234567'
        }
      },
      additional_info: {
        ip_address: '127.0.0.1'
      },
      transaction_details: {
        financial_institution: '1006' // Banco Agrario
      },
      // URLs requeridas para PSE según documentación oficial
      callback_url: 'https://httpbin.org/status/200',
      notification_url: 'https://webhook.site/your-unique-url' // Obligatoria según documentación
    };
    
    console.log('📤 Enviando pago de prueba a Mercado Pago...');
    console.log('Datos de prueba:', JSON.stringify(testPaymentData, null, 2));
    
    // Intentar crear el pago de prueba
    const payment = await paymentClient.create({ body: testPaymentData });
    
    console.log('✅ Pago PSE de prueba creado exitosamente');
    console.log('   Payment ID:', payment.id);
    console.log('   Status:', payment.status);
    console.log('   Status Detail:', payment.status_detail);
    
    if (payment.transaction_details?.external_resource_url) {
      console.log('   External Resource URL:', payment.transaction_details.external_resource_url);
    }
    
    console.log('🎉 Configuración de Mercado Pago correcta');
    return true;
    
  } catch (error) {
    console.error('❌ Error en la configuración de Mercado Pago:');
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
      } else if (errorCode === 4063) {
        console.error('🔧 SOLUCIÓN: Institución financiera no disponible');
        console.error('   Prueba con otro banco o verifica que el código sea correcto');
      } else {
        console.error('🔧 SOLUCIÓN: Error desconocido - Revisa la documentación de Mercado Pago');
      }
    }
    
    return false;
  }
}

// Ejecutar el diagnóstico
testMercadoPagoConfig()
  .then(success => {
    if (success) {
      console.log('\n✅ Diagnóstico completado exitosamente');
      process.exit(0);
    } else {
      console.log('\n❌ Diagnóstico falló - Revisa los errores arriba');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }); 