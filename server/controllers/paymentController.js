const { MercadoPagoConfig } = require('mercadopago');

// Configuración de Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471'
});

// Función para crear preferencias de pago (Checkout Pro)
exports.createPreference = async (req, res) => {
  try {
    console.log('=== CREANDO PREFERENCIA DE PAGO (CHECKOUT PRO) ===');
    
    const { items, payer, external_reference } = req.body;
    
    // Validar datos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren items para crear la preferencia'
      });
    }
    
    if (!payer || !payer.email) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere información del pagador'
      });
    }
    
    console.log('Datos recibidos:', { items, payer, external_reference });
    
    // Crear preferencia de pago
    const preferenceData = {
      items: items.map(item => ({
        title: item.title,
        unit_price: item.unit_price,
        currency_id: 'COP',
        quantity: item.quantity || 1
      })),
      payer: {
        email: payer.email,
        name: payer.name || 'Usuario',
        surname: payer.surname || '',
        identification: {
          type: payer.identification?.type || 'CC',
          number: payer.identification?.number || '12345678'
        }
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`
      },
      notification_url: 'https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago',
      external_reference: external_reference || `PREF_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    };
    
    console.log('Datos de preferencia a enviar:', JSON.stringify(preferenceData, null, 2));
    
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    const preference = await preferenceClient.create({ body: preferenceData });
    
    console.log('✅ Preferencia creada exitosamente:', preference.id);
    console.log('URL de pago:', preference.init_point);
    
    res.json({
      success: true,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      message: 'Preferencia de pago creada correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error creando preferencia:', error);
    
    if (error.error === 'bad_request' && error.cause && error.cause[0]) {
      const errorCode = error.cause[0].code;
      const errorDesc = error.cause[0].description;
      
      console.error(`Error específico: ${errorCode} - ${errorDesc}`);
      
      res.status(400).json({
        success: false,
        message: `Error en Mercado Pago: ${errorDesc}`,
        error_code: errorCode,
        error_description: errorDesc
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
};

// Función para obtener el estado de un pago
exports.getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;
    console.log('Consultando estado del pago:', payment_id);
    
    const { Payment } = require('mercadopago');
    const paymentClient = new Payment(mp);
    
    const payment = await paymentClient.get({ id: payment_id });
    console.log('Estado del pago:', payment.status, 'Detalle:', payment.status_detail);
    
    res.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
      payment_method: payment.payment_method,
      payer: payment.payer
    });
  } catch (error) {
    console.error('Error al consultar estado del pago:', error);
    res.status(500).json({ error: error.message });
  }
};

// Función para procesar webhooks de Mercado Pago
exports.webhook = async (req, res) => {
  try {
    console.log('=== WEBHOOK RECIBIDO ===');
    console.log('Query params:', req.query);
    console.log('Body:', req.body);
    
    const { type, data } = req.query;
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log('Procesando pago ID:', paymentId);
      
      // Obtener información completa del pago
      const { Payment } = require('mercadopago');
      const paymentClient = new Payment(mp);
      const payment = await paymentClient.get({ id: paymentId });
      
      console.log('Estado del pago:', payment.status, 'Detalle:', payment.status_detail);
      
      // Aquí puedes agregar lógica adicional según el estado del pago
      if (payment.status === 'approved') {
        console.log('Pago aprobado:', paymentId);
        // Lógica para pago exitoso
      } else if (payment.status === 'pending') {
        console.log('Pago pendiente:', paymentId);
        // Lógica para pago pendiente
      } else if (payment.status === 'rejected') {
        console.log('Pago rechazado:', paymentId);
        // Lógica para pago rechazado
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).send('Error');
  }
};

// Función de prueba para verificar configuración
exports.testConfig = async (req, res) => {
  try {
    console.log('=== PROBANDO CONFIGURACIÓN MERCADO PAGO ===');
    
    // Verificar configuración
    if (!mp.accessToken) {
      return res.status(500).json({ 
        error: 'Access Token de Mercado Pago no configurado' 
      });
    }
    
    console.log('Access Token configurado:', mp.accessToken ? 'Sí' : 'No');
    console.log('Access Token (primeros 20 chars):', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'No definido');
    
    // Crear una preferencia de prueba
    const testPreferenceData = {
      items: [
        {
          title: 'Prueba Checkout Pro',
          unit_price: 1000,
          currency_id: 'COP',
          quantity: 1
        }
      ],
      payer: {
        email: 'test@test.com',
        name: 'Usuario Test',
        identification: {
          type: 'CC',
          number: '12345678'
        }
      },
      back_urls: {
        success: 'https://httpbin.org/status/200',
        failure: 'https://httpbin.org/status/200',
        pending: 'https://httpbin.org/status/200'
      },
      notification_url: 'https://e6c7-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago',
      external_reference: `TEST_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('Datos de preferencia de prueba:', JSON.stringify(testPreferenceData, null, 2));
    
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    const preference = await preferenceClient.create({ body: testPreferenceData });
    
    console.log('✅ Preferencia de prueba creada:', preference.id);
    console.log('URL de pago:', preference.init_point);
    
    res.json({
      success: true,
      message: 'Configuración correcta',
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      test_url: preference.sandbox_init_point || preference.init_point
    });
    
  } catch (error) {
    console.error('❌ Error probando configuración:', error);
    
    if (error.error === 'bad_request' && error.cause && error.cause[0]) {
      const errorCode = error.cause[0].code;
      const errorDesc = error.cause[0].description;
      
      console.error(`Error específico: ${errorCode} - ${errorDesc}`);
      
      res.status(400).json({
        success: false,
        message: `Error en Mercado Pago: ${errorDesc}`,
        error_code: errorCode,
        error_description: errorDesc
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
};

// Webhook de Mercado Pago
exports.mercadoPagoWebhook = async (req, res) => {
  try {
    console.log('🔔 Webhook Mercado Pago recibido:', req.body, req.query);

    // Validar que tenemos el access token
    const { MERCADOPAGO_ACCESS_TOKEN } = process.env;
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ Error: MERCADOPAGO_ACCESS_TOKEN no está configurado');
      return res.status(500).send('Error de configuración');
    }

    // Mercado Pago puede enviar info en body o query
    const paymentId = req.body.data && req.body.data.id
      ? req.body.data.id
      : req.query.id;
    const topic = req.body.type || req.query.topic;

    console.log('📋 Datos del webhook:');
    console.log('  - Payment ID:', paymentId);
    console.log('  - Topic:', topic);
    console.log('  - Access Token:', MERCADOPAGO_ACCESS_TOKEN.substring(0, 20) + '...');

    // Solo procesar si es un pago
    if (topic === 'payment' && paymentId) {
      try {
        // Consultar el estado real del pago usando la API de Mercado Pago
        const axios = require('axios');
        const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
        
        console.log('🔍 Consultando pago en Mercado Pago:', url);
        
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
          }
        });
        
        const paymentInfo = response.data;
        console.log('💳 Estado del pago consultado:', paymentInfo.status);
        console.log('💰 Información del pago:', {
          id: paymentInfo.id,
          status: paymentInfo.status,
          amount: paymentInfo.transaction_amount,
          currency: paymentInfo.currency,
          payment_method: paymentInfo.payment_method?.type
        });

        // Aquí puedes actualizar tu base de datos según el estado del pago
        // Por ejemplo:
        // await Order.updateOne({ mp_payment_id: paymentId }, { status: paymentInfo.status });
        
        console.log('✅ Webhook procesado correctamente');
        
      } catch (apiError) {
        console.error('❌ Error consultando pago en Mercado Pago:', apiError.response?.data || apiError.message);
        
        // Si es un error 401, el token puede estar mal
        if (apiError.response?.status === 401) {
          console.error('🔧 SOLUCIÓN: Verifica tu MERCADOPAGO_ACCESS_TOKEN');
          console.error('   El token debe ser válido y no haber expirado');
        }
      }
    } else {
      console.log('ℹ️ Webhook recibido pero no es un pago o no tiene ID válido');
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error general en webhook Mercado Pago:', error);
    res.status(500).send('Error');
  }
};

// Exportar todas las funciones
module.exports = {
  createPreference: exports.createPreference,
  getPaymentStatus: exports.getPaymentStatus,
  webhook: exports.webhook,
  testConfig: exports.testConfig,
  mercadoPagoWebhook: exports.mercadoPagoWebhook
}; 