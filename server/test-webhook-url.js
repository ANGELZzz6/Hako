require('dotenv').config();
const { MercadoPagoConfig } = require('mercadopago');

console.log('🔍 VERIFICANDO URL DEL WEBHOOK EN PREFERENCIAS');
console.log('==============================================');

// Configuración de Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471'
});

const webhookUrl = 'https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago';

console.log('📋 Configuración actual:');
console.log('  - Webhook URL:', webhookUrl);
console.log('  - Access Token:', process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ NO CONFIGURADO');

async function testPreferenceWithWebhook() {
  try {
    console.log('');
    console.log('🧪 Creando preferencia de prueba con webhook...');
    
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    const testPreferenceData = {
      items: [
        {
          title: 'Test Webhook',
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
      notification_url: webhookUrl,
      external_reference: `WEBHOOK_TEST_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('📤 Datos de preferencia:');
    console.log('  - notification_url:', testPreferenceData.notification_url);
    console.log('  - external_reference:', testPreferenceData.external_reference);
    
    const preference = await preferenceClient.create({ body: testPreferenceData });
    
    console.log('');
    console.log('✅ Preferencia creada exitosamente:');
    console.log('  - ID:', preference.id);
    console.log('  - URL de pago:', preference.init_point);
    console.log('  - notification_url configurada:', preference.notification_url ? '✅' : '❌');
    
    console.log('');
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. Haz un pago usando esta URL:', preference.init_point);
    console.log('2. Completa el pago en Mercado Pago');
    console.log('3. Verifica que llegue la notificación al webhook');
    console.log('4. Revisa los logs en tu backend');
    
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

testPreferenceWithWebhook(); 