const { MercadoPagoConfig } = require('mercadopago');

// Configuración
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534';
const mp = new MercadoPagoConfig({ accessToken });

console.log('=== PRUEBA DE PREFERENCIAS PSE ===');
console.log('Access Token:', accessToken.substring(0, 20) + '...');
console.log('Entorno: PRUEBAS');
console.log('==================================');

async function testPSEPreference() {
  try {
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    console.log('🔍 Creando preferencia PSE...\n');
    
    // Datos de preferencia PSE
    const preferenceData = {
      items: [
        {
          title: 'Prueba PSE desde Hako Store',
          unit_price: 1600,
          currency_id: 'COP',
          quantity: 1
        }
      ],
      payer: {
        email: 'test_user_123456@testuser.com',
        name: 'Test User',
        identification: {
          type: 'CC',
          number: '12345678'
        }
      },
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' },
          { id: 'cash' }
        ],
        installments: 1
      },
      back_urls: {
        success: 'http://localhost:5173/payment-result',
        failure: 'http://localhost:5173/payment-result',
        pending: 'http://localhost:5173/payment-result'
      },
      notification_url: 'https://webhook.site/your-unique-url',
      external_reference: `PSE_TEST_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    };
    
    console.log('Datos de preferencia a enviar:');
    console.log(JSON.stringify(preferenceData, null, 2));
    console.log('\n📤 Enviando preferencia a Mercado Pago...');
    
    const preference = await preferenceClient.create({ body: preferenceData });
    
    console.log('\n✅ PREFERENCIA CREADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('ID de preferencia:', preference.id);
    console.log('URL de pago:', preference.init_point);
    console.log('URL de sandbox:', preference.sandbox_init_point);
    console.log('Estado:', preference.status);
    console.log('Referencia externa:', preference.external_reference);
    console.log('Fecha de expiración:', preference.expiration_date_to);
    
    console.log('\n🔗 ENLACES PARA PROBAR:');
    console.log('URL de producción:', preference.init_point);
    console.log('URL de sandbox:', preference.sandbox_init_point);
    
    console.log('\n📋 INFORMACIÓN ADICIONAL:');
    console.log('Payer:', preference.payer);
    console.log('Items:', preference.items);
    console.log('Payment Methods:', preference.payment_methods);
    console.log('Back URLs:', preference.back_urls);
    
    return preference;
    
  } catch (error) {
    console.error('\n❌ ERROR CREANDO PREFERENCIA PSE');
    console.error('==================================');
    console.error('Mensaje:', error.message);
    console.error('Error:', error.error);
    console.error('Status:', error.status);
    
    if (error.cause && Array.isArray(error.cause)) {
      console.error('\nCausas del error:');
      error.cause.forEach((cause, index) => {
        console.error(`  Causa ${index + 1}:`, JSON.stringify(cause, null, 2));
      });
    }
    
    if (error.error === 'bad_request' && error.cause && error.cause[0]) {
      const errorCode = error.cause[0].code;
      const errorDesc = error.cause[0].description;
      
      console.error(`\nError específico de MP:`);
      console.error(`  Código: ${errorCode}`);
      console.error(`  Descripción: ${errorDesc}`);
      
      if (errorCode === '2034') {
        console.error('\n🔧 SOLUCIÓN PARA ERROR 2034:');
        console.error('   Este error indica que PSE no está habilitado en la cuenta');
        console.error('   1. Ve a https://www.mercadopago.com/developers/panel');
        console.error('   2. Verifica que PSE esté habilitado en "Métodos de pago"');
        console.error('   3. Si no está habilitado, contacta a soporte de Mercado Pago');
      }
    }
    
    throw error;
  }
}

// Ejecutar prueba
testPSEPreference()
  .then(preference => {
    console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('La preferencia PSE se creó correctamente');
  })
  .catch(error => {
    console.log('\n💥 PRUEBA FALLÓ');
    console.log('No se pudo crear la preferencia PSE');
    process.exit(1);
  }); 