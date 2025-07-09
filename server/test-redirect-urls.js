require('dotenv').config();
const { MercadoPagoConfig } = require('mercadopago');

console.log('🔍 VERIFICANDO URLs DE REDIRECCIÓN');
console.log('==================================');

// Configuración de Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471'
});

async function testRedirectUrls() {
  try {
    console.log('🧪 Creando preferencia con URLs de redirección corregidas...');
    
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    const testPreferenceData = {
      items: [
        {
          title: 'Test Redirección',
          unit_price: 100,
          currency_id: 'COP',
          quantity: 1
        }
      ],
      payer: {
        email: 'test@example.com',
        name: 'Test User'
      },
      back_urls: {
        success: 'http://localhost:5173/payment-result',
        failure: 'http://localhost:5173/payment-result',
        pending: 'http://localhost:5173/payment-result'
      },
      auto_return: 'all',
      notification_url: 'https://10f2b917bbd2.ngrok-free.app/api/payment/webhook/mercadopago',
      external_reference: `REDIRECT_TEST_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('📤 Datos de preferencia:');
    console.log('  - success_url:', testPreferenceData.back_urls.success);
    console.log('  - failure_url:', testPreferenceData.back_urls.failure);
    console.log('  - pending_url:', testPreferenceData.back_urls.pending);
    console.log('  - auto_return:', testPreferenceData.auto_return);
    console.log('  - notification_url:', testPreferenceData.notification_url);
    
    const preference = await preferenceClient.create({ body: testPreferenceData });
    
    console.log('');
    console.log('✅ Preferencia creada exitosamente:');
    console.log('  - ID:', preference.id);
    console.log('  - URL de pago:', preference.init_point);
    console.log('  - back_urls configuradas:', preference.back_urls ? '✅' : '❌');
    
    if (preference.back_urls) {
      console.log('  - success:', preference.back_urls.success);
      console.log('  - failure:', preference.back_urls.failure);
      console.log('  - pending:', preference.back_urls.pending);
    }
    
    console.log('');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. Haz un pago usando esta URL:', preference.init_point);
    console.log('2. Completa el pago en Mercado Pago');
    console.log('3. Deberías ser redirigido a:', testPreferenceData.back_urls.success);
    console.log('4. Verifica que llegue a tu aplicación en /payment-result');
    console.log('');
    console.log('🔧 SOLUCIÓN IMPLEMENTADA:');
    console.log('  - Todas las URLs apuntan a /payment-result');
    console.log('  - La página PaymentResultPage maneja todos los estados');
    console.log('  - Se agregaron logs de depuración');
    console.log('  - auto_return configurado como "all" para redirección automática');
    
    return preference;
    
  } catch (error) {
    console.error('❌ Error creando preferencia:', error);
    
    if (error.error === 'bad_request' && error.cause && error.cause[0]) {
      const errorCode = error.cause[0].code;
      const errorDesc = error.cause[0].description;
      
      console.error(`Error específico: ${errorCode} - ${errorDesc}`);
    }
  }
}

testRedirectUrls(); 