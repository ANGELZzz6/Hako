const mp = require('../config/mercadopago');
const { Preference, Payment } = require('mercadopago');
const notificationService = require('../services/notificationService');

const preferenceClient = new Preference(mp);
const paymentClient = new Payment(mp);

// Función para mapear códigos de error de Mercado Pago a status_detail
const mapErrorCodeToStatusDetail = (errorCode) => {
  const errorMap = {
    // Fondos insuficientes
    '326': 'FUND',
    '325': 'FUND',
    '322': 'FUND',
    
    // Código de seguridad inválido
    'E301': 'SECU',
    '301': 'SECU',
    
    // Fecha de vencimiento
    'E302': 'EXPI',
    '302': 'EXPI',
    
    // Error de formulario
    'E303': 'FORM',
    '303': 'FORM',
    
    // Requiere validación
    'E304': 'CALL',
    '304': 'CALL',
    
    // Tarjeta no autorizada
    'E305': 'CALL',
    '305': 'CALL',
    
    // Tarjeta bloqueada
    'E306': 'CALL',
    '306': 'CALL',
    
    // Tarjeta vencida
    'E307': 'EXPI',
    '307': 'EXPI',
    
    // Tarjeta no válida
    'E308': 'FORM',
    '308': 'FORM',
    
    // Tarjeta no encontrada
    'E309': 'FORM',
    '309': 'FORM',
    
    // Tarjeta no autorizada para el comercio
    'E310': 'CALL',
    '310': 'CALL',
    
    // Tarjeta no autorizada para el tipo de operación
    'E311': 'CALL',
    '311': 'CALL',
    
    // Tarjeta no autorizada para el monto
    'E312': 'CALL',
    '312': 'CALL',
    
    // Tarjeta no autorizada para la moneda
    'E313': 'CALL',
    '313': 'CALL',
    
    // Tarjeta no autorizada para el país
    'E314': 'CALL',
    '314': 'CALL',
    
    // Tarjeta no autorizada para el comercio
    'E315': 'CALL',
    '315': 'CALL',
    
    // Tarjeta no autorizada para el tipo de operación
    'E316': 'CALL',
    '316': 'CALL',
    
    // Tarjeta no autorizada para el monto
    'E317': 'CALL',
    '317': 'CALL',
    
    // Tarjeta no autorizada para la moneda
    'E318': 'CALL',
    '318': 'CALL',
    
    // Tarjeta no autorizada para el país
    'E319': 'CALL',
    '319': 'CALL',
    
    // Tarjeta no autorizada para el comercio
    'E320': 'CALL',
    '320': 'CALL'
  };
  
  return errorMap[errorCode] || 'OTHE';
};

exports.createPreference = async (req, res) => {
  try {
    const { items, payer, saveCardData, userId } = req.body;
    
    // Logs detallados para debugging
    console.log('=== DEBUG PAYMENT ===');
    console.log('Items recibidos:', JSON.stringify(items, null, 2));
    console.log('Payer recibido:', JSON.stringify(payer, null, 2));
    console.log('Email del comprador:', payer?.email);
    
    const preference = {
      items,
      payer: {
        email: payer.email,
        first_name: payer.name || "Nombre",
        last_name: payer.surname || "Apellido",
        identification: {
          type: payer.identification?.type || "CC",
          number: payer.identification?.number || "12345678"
        }
      },
      statement_descriptor: 'HAKO STORE',
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      back_urls: {
        success: 'http://localhost:5173/payment-result',
        failure: 'http://localhost:5173/payment-result',
        pending: 'http://localhost:5173/payment-result'
      },
      // NO usar notification_url en desarrollo local
      // Solo usar cuando tengas ngrok o dominio público
      metadata: {
        saveCardData: saveCardData || null,
        userId: userId || null
      }
    };
    
    console.log('Preferencia completa a enviar a MP:', JSON.stringify(preference, null, 2));
    console.log('Access Token usado:', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'no definido');
    
    const response = await preferenceClient.create({ body: preference });
    console.log('Preferencia creada exitosamente:', response.id);
    console.log('Init point:', response.init_point);
    console.log('=== FIN DEBUG PAYMENT ===');
    
    res.json({ id: response.id, init_point: response.init_point });
  } catch (error) {
    console.error('Error en createPreference:', error);
    console.error('Detalles del error:', error.message, error.cause);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint para obtener el estado de un pago
exports.getPaymentStatus = async (req, res) => {
  try {
    const { payment_id } = req.params;
    console.log('Consultando estado del pago:', payment_id);
    
    // Si es un pago de prueba, devolver error 404
    if (payment_id.startsWith('TEST_')) {
      console.log('Pago de prueba detectado, no consultando Mercado Pago');
      return res.status(404).json({ 
        error: 'Pago de prueba no encontrado en Mercado Pago',
        message: 'Los pagos de prueba no existen en la API de Mercado Pago'
      });
    }
    
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
      
      // Obtener información completa del pago
      const payment = await paymentClient.get({ id: paymentId });
      console.log('Estado del pago:', payment.status, 'Detalle:', payment.status_detail);
      
      const userId = req.body.user_id || (req.body.metadata && req.body.metadata.userId) || 'ejemplo_user_id';
      const saveCardData = req.body.metadata && req.body.metadata.saveCardData;
      
      // Solo procesar pagos aprobados
      if (payment.status === 'approved') {
        if (saveCardData && userId) {
          const User = require('../models/User');
          const user = await User.findById(userId);
          if (user && !user.savedCards.some(card => card.cardId === saveCardData.cardId)) {
            user.savedCards.push(saveCardData);
            await user.save();
            console.log('Tarjeta guardada para usuario:', userId);
          }
        }
        
        try {
          await notificationService.processSuccessfulPayment(paymentId, userId);
          console.log('Pago procesado exitosamente:', paymentId);
        } catch (notificationError) {
          console.error('Error al procesar notificaciones:', notificationError);
        }
      } else {
        console.log('Pago no aprobado, estado:', payment.status, 'detalle:', payment.status_detail);
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

// Procesar pago con token de tarjeta
exports.processPayment = async (req, res) => {
  try {
    const { token, issuer_id, payment_method_id, installments, transaction_amount, description, payer } = req.body;
    
    console.log('=== PROCESANDO PAGO ===');
    console.log('Token:', token);
    console.log('Issuer ID:', issuer_id);
    console.log('Payment Method ID:', payment_method_id);
    console.log('Installments:', installments);
    console.log('Amount:', transaction_amount);
    console.log('Description:', description);
    console.log('Payer:', payer);
    
    // Validaciones básicas
    if (!token) {
      return res.status(400).json({ error: 'Token de tarjeta requerido' });
    }
    
    if (!transaction_amount || transaction_amount <= 0) {
      return res.status(400).json({ error: 'Monto de transacción inválido' });
    }
    
    if (!payer || !payer.email) {
      return res.status(400).json({ error: 'Datos del pagador requeridos' });
    }
    
    const paymentData = {
      transaction_amount: parseFloat(transaction_amount),
      token: token,
      description: description || 'Pago desde Hako',
      installments: parseInt(installments) || 1,
      payment_method_id: payment_method_id,
      issuer_id: issuer_id,
      payer: {
        email: payer.email,
        first_name: payer.name || "Nombre",
        last_name: payer.surname || "Apellido",
        identification: {
          type: payer.identification?.type || "CC",
          number: payer.identification?.number || "12345678"
        }
      }
    };
    
    console.log('Datos del pago a enviar a MP:', JSON.stringify(paymentData, null, 2));
    console.log('Access Token usado:', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'no definido');
    
    const payment = await paymentClient.create({ body: paymentData });
    
    console.log('Pago procesado exitosamente:', payment.id);
    console.log('Estado:', payment.status);
    console.log('Detalle:', payment.status_detail);
    console.log('=== FIN PROCESAMIENTO ===');
    
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
    console.error('Error al procesar el pago:', error);
    
    // Manejo específico de errores de Mercado Pago
    if (error.error && error.error === 'bad_request') {
      // Error específico de configuración (Access Token inválido)
      if (error.cause && Array.isArray(error.cause) && error.cause[0] && error.cause[0].code === 2034) {
        console.error('❌ Error de configuración de Mercado Pago - Access Token inválido');
        return res.status(400).json({ 
          error: 'Error de configuración de Mercado Pago',
          status: 'rejected',
          status_detail: 'OTHE',
          details: 'El Access Token no es válido o ha expirado. Contacta al administrador.',
          code: 2034
        });
      }
      
      return res.status(400).json({ 
        error: 'Error en los datos del pago', 
        details: error.message,
        cause: error.cause 
      });
    }
    
    // Manejo de errores específicos de tarjeta
    if (error.cause && Array.isArray(error.cause)) {
      const cardErrors = error.cause.filter(cause => cause.code && cause.description);
      if (cardErrors.length > 0) {
        const mainError = cardErrors[0];
        console.log('Error de tarjeta detectado:', mainError);
        
        // Usar la función de mapeo para obtener el status_detail correcto
        const statusDetail = mapErrorCodeToStatusDetail(mainError.code);
        
        return res.status(400).json({
          error: 'Error en el pago',
          status: 'rejected',
          status_detail: statusDetail,
          details: mainError.description,
          code: mainError.code
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor al procesar el pago',
      details: error.message 
    });
  }
};

// Pago con tarjeta guardada (token)
exports.payWithSavedCard = async (req, res) => {
  try {
    const { cardId, amount, payer } = req.body;
    // Aquí deberías usar la API de Mercado Pago para crear un pago directo con el token de la tarjeta
    // Ejemplo básico (ajustar según la SDK y el flujo real):
    const paymentData = {
      transaction_amount: amount,
      token: cardId, // token de la tarjeta guardada
      description: 'Pago con tarjeta guardada',
      installments: 1,
      payment_method_id: 'visa', // O el tipo real de la tarjeta
      payer: {
        email: payer.email,
        identification: payer.identification
      }
    };
    // Aquí deberías usar la SDK de Mercado Pago para crear el pago
    // const payment = await mp.payment.create({ body: paymentData });
    // Simulación de éxito:
    res.json({ success: true, paymentId: 'SIMULADO_' + Date.now() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Endpoint de prueba para simular diferentes estados de pago
exports.testPaymentStatus = async (req, res) => {
  try {
    const { status, status_detail } = req.body;
    console.log('=== PRUEBA DE ESTADO DE PAGO ===');
    console.log('Status recibido:', status);
    console.log('Status Detail recibido:', status_detail);
    console.log('Body completo:', JSON.stringify(req.body, null, 2));
    
    const testPayment = {
      id: 'TEST_' + Date.now(),
      status: status || 'approved',
      status_detail: status_detail || 'APRO',
      external_reference: 'test_reference',
      transaction_amount: 1000,
      payment_method: {
        id: 'visa',
        type: 'credit_card'
      },
      payer: {
        email: 'test@example.com',
        identification: {
          type: 'CC',
          number: '12345678'
        }
      }
    };
    
    console.log('Pago de prueba creado:', JSON.stringify(testPayment, null, 2));
    console.log('=== FIN PRUEBA DE ESTADO ===');
    
    res.json(testPayment);
  } catch (error) {
    console.error('Error en testPaymentStatus:', error);
    res.status(500).json({ error: error.message });
  }
};

// Endpoint para verificar la configuración de Mercado Pago
exports.testMercadoPagoConfig = async (req, res) => {
  try {
    console.log('=== VERIFICANDO CONFIGURACIÓN MP ===');
    console.log('Access Token:', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'no definido');
    
    // Verificar que el access token sea válido
    if (!mp.accessToken || !mp.accessToken.startsWith('TEST-')) {
      return res.status(400).json({
        success: false,
        error: 'Access Token no válido para pruebas',
        message: 'Obtén un nuevo token en: https://www.mercadopago.com/developers/panel/credentials',
        accessToken: 'No válido'
      });
    }
    
    // Intentar crear una preferencia de prueba
    const testPreference = {
      items: [
        {
          title: 'Producto de prueba',
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
    
    res.json({
      success: true,
      message: 'Configuración de Mercado Pago correcta',
      accessToken: 'Válido para pruebas',
      preferenceId: preference.id,
      initPoint: preference.init_point,
      testPreference: testPreference
    });
  } catch (error) {
    console.error('Error verificando configuración MP:', error);
    
    let errorDetails = {
      success: false,
      error: 'Error en la configuración de Mercado Pago',
      details: error.message,
      accessToken: mp.accessToken ? 'Configurado pero con error' : 'No configurado'
    };
    
    // Agregar detalles específicos del error
    if (error.error === 'bad_request' && error.cause && error.cause[0]) {
      const errorCode = error.cause[0].code;
      const errorDesc = error.cause[0].description;
      
      errorDetails.errorCode = errorCode;
      errorDetails.errorDescription = errorDesc;
      
      if (errorCode === 2034) {
        errorDetails.suggestion = 'El Access Token no es válido o ha expirado. Obtén uno nuevo en el panel de desarrolladores.';
      } else if (errorCode === 401) {
        errorDetails.suggestion = 'Error de autenticación. Verifica que el token sea correcto.';
      } else {
        errorDetails.suggestion = 'Error desconocido. Revisa la documentación de Mercado Pago.';
      }
    }
    
    res.status(500).json(errorDetails);
  }
};

// Endpoint de prueba para simular el procesamiento de pago
exports.testProcessPayment = async (req, res) => {
  try {
    console.log('=== PRUEBA DE PROCESAMIENTO DE PAGO ===');
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));
    
    const { token, issuer_id, payment_method_id, installments, transaction_amount, description, payer } = req.body;
    
    // Validaciones básicas
    if (!token) {
      return res.status(400).json({ error: 'Token de tarjeta requerido' });
    }
    
    if (!transaction_amount || transaction_amount <= 0) {
      return res.status(400).json({ error: 'Monto de transacción inválido' });
    }
    
    if (!payer || !payer.email) {
      return res.status(400).json({ error: 'Datos del pagador requeridos' });
    }
    
    // Simular un pago exitoso
    const simulatedPayment = {
      id: 'TEST_' + Date.now(),
      status: 'approved',
      status_detail: 'APRO',
      external_reference: 'test_reference',
      transaction_amount: parseFloat(transaction_amount),
      payment_method: {
        id: payment_method_id || 'visa',
        type: 'credit_card'
      },
      payer: {
        email: payer.email,
        identification: {
          type: payer.identification?.type || 'CC',
          number: payer.identification?.number || '12345678'
        }
      }
    };
    
    console.log('Pago simulado exitoso:', simulatedPayment);
    console.log('=== FIN PRUEBA ===');
    
    res.json(simulatedPayment);
  } catch (error) {
    console.error('Error en testProcessPayment:', error);
    res.status(500).json({ error: error.message });
  }
}; 