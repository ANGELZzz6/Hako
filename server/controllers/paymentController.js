const mp = require('../config/mercadopago');
const { Preference } = require('mercadopago');
const notificationService = require('../services/notificationService');

const preferenceClient = new Preference(mp);

exports.createPreference = async (req, res) => {
  try {
    const { items, payer } = req.body; // items: [{title, quantity, unit_price, picture_url}]
    
    // Logs detallados para debugging
    console.log('=== DEBUG PAYMENT ===');
    console.log('Items recibidos:', JSON.stringify(items, null, 2));
    console.log('Payer recibido:', JSON.stringify(payer, null, 2));
    console.log('Email del comprador:', payer?.email);
    
    const preference = {
      items,
      payer: {
        email: payer.email,
        name: payer.name || "Nombre",
        surname: payer.surname || "Apellido",
        identification: {
          type: payer.identification?.type || "CC",
          number: payer.identification?.number || "12345678"
        }
      },
      // payment_methods: {
      //   installments: 24,
      //   default_installments: 1
      // },
      // back_urls: {
      //   success: 'http://localhost:5173/payment-success',
      //   failure: 'http://localhost:5173/payment-failure',
      //   pending: 'http://localhost:5173/payment-pending'
      // },
      // auto_return: 'approved',
      // notification_url: 'http://localhost:5000/api/payment/webhook', // Comentado para desarrollo local
      // NOTA: Mercado Pago no puede enviar notificaciones a localhost en desarrollo
      // Para pruebas con ngrok, usa: notification_url: 'https://tu-tunnel.ngrok.io/api/payment/webhook'
      // Descomenta esta línea cuando despliegues en producción con un dominio válido
      statement_descriptor: 'HAKO STORE',
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('Preferencia completa a enviar a MP:', JSON.stringify(preference, null, 2));
    console.log('Access Token usado:', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'no definido');
    
    const response = await preferenceClient.create({ body: preference });
    console.log('Preferencia creada exitosamente:', response.id);
    console.log('Init point:', response.init_point);
    console.log('Métodos de pago disponibles:', JSON.stringify(response.payment_methods, null, 2));
    console.log('=== FIN DEBUG PAYMENT ===');
    
    res.json({ id: response.id, init_point: response.init_point });
  } catch (error) {
    console.error('Error en createPreference:', error);
    console.error('Detalles del error:', error.message, error.cause);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint para procesar notificaciones de Mercado Pago
exports.webhook = async (req, res) => {
  try {
    console.log('=== WEBHOOK RECIBIDO ===');
    console.log('Query params:', req.query);
    console.log('Body:', req.body);
    
    const { type, data } = req.query;
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('Procesando pago ID:', paymentId);
      
      // Aquí puedes agregar la lógica para obtener el userId
      // Por ahora, usamos un userId de ejemplo
      // En producción, deberías obtenerlo de la preferencia o de otra forma
      const userId = req.body.user_id || 'ejemplo_user_id';
      
      try {
        await notificationService.processSuccessfulPayment(paymentId, userId);
        console.log('Pago procesado exitosamente:', paymentId);
      } catch (notificationError) {
        console.error('Error al procesar notificaciones:', notificationError);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error');
  }
};

// Endpoint de prueba para simular webhook (solo para desarrollo)
exports.testWebhook = async (req, res) => {
  try {
    console.log('=== WEBHOOK DE PRUEBA ===');
    console.log('Simulando pago exitoso...');
    
    const testPaymentId = 'TEST_' + Date.now();
    const testUserId = req.body.userId || 'test_user_id';
    
    await notificationService.processSuccessfulPayment(testPaymentId, testUserId);
    
    res.json({ 
      success: true, 
      message: 'Webhook de prueba ejecutado correctamente',
      paymentId: testPaymentId,
      userId: testUserId
    });
  } catch (error) {
    console.error('Error en webhook de prueba:', error);
    res.status(500).json({ error: error.message });
  }
}; 