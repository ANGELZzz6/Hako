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

// Endpoint para probar la configuración de Mercado Pago
exports.testMercadoPagoConfig = async (req, res) => {
  try {
    console.log('=== PRUEBA DE CONFIGURACIÓN MERCADO PAGO ===');
    
    // Verificar Access Token
    if (!mp.accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Access Token no configurado'
      });
    }
    
    console.log('Access Token configurado:', mp.accessToken ? 'Sí' : 'No');
    console.log('Access Token (primeros 20 chars):', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'No definido');
    
    // Crear un pago PSE de prueba mínimo
    const testPaymentData = {
      transaction_amount: 1600, // Mínimo requerido por PSE
      description: 'Prueba PSE',
      payment_method_id: 'pse',
      payer: {
        entity_type: 'individual',
        email: 'test_user_123456@testuser.com', // Email de cuenta de pruebas
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
        ip_address: req.ip || req.connection.remoteAddress || '127.0.0.1'
      },
      transaction_details: {
        financial_institution: '1006' // Banco Agrario
      },
      // URLs requeridas para PSE según error 4058
      callback_url: 'https://httpbin.org/status/200',
      notification_url: 'https://webhook.site/your-unique-url' // Obligatoria según documentación
    };
    
    console.log('Datos de prueba a enviar:', JSON.stringify(testPaymentData, null, 2));
    
    // Intentar crear el pago de prueba
    const payment = await paymentClient.create({ body: testPaymentData });
    
    console.log('Pago PSE de prueba creado exitosamente:', payment.id);
    
    res.json({
      success: true,
      message: 'Configuración PSE correcta',
      payment_id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail
    });
    
  } catch (error) {
    console.error('Error en prueba PSE:', error);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    res.status(500).json({
      success: false,
      error: 'Error en configuración PSE',
      details: error.message,
      full_error: error
    });
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

// Endpoint para obtener métodos de pago (incluyendo bancos PSE)
exports.getPaymentMethods = async (req, res) => {
  try {
    console.log('=== OBTENIENDO MÉTODOS DE PAGO ===');
    
    // Verificar configuración
    if (!mp.accessToken) {
      return res.status(500).json({ 
        error: 'Access Token de Mercado Pago no configurado' 
      });
    }
    
    // Obtener métodos de pago desde Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods?site_id=MCO', {
      headers: {
        'Authorization': `Bearer ${mp.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener métodos de pago: ${response.status} ${response.statusText}`);
    }
    
    const paymentMethods = await response.json();
    console.log('Métodos de pago obtenidos:', paymentMethods.length);
    
    res.json(paymentMethods);
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    res.status(500).json({ 
      error: 'Error al obtener métodos de pago',
      details: error.message 
    });
  }
};

// Endpoint para probar la configuración de PSE específicamente
exports.testPSEConfig = async (req, res) => {
  try {
    console.log('=== PROBANDO CONFIGURACIÓN PSE ===');
    
    // Verificar configuración
    if (!mp.accessToken) {
      return res.status(500).json({ 
        error: 'Access Token de Mercado Pago no configurado' 
      });
    }
    
    console.log('Access Token configurado:', mp.accessToken ? 'Sí' : 'No');
    console.log('Access Token (primeros 20 chars):', mp.accessToken ? mp.accessToken.substring(0, 20) + '...' : 'No definido');
    
    // Crear un pago PSE de prueba mínimo
    const testPaymentData = {
      transaction_amount: 1600, // Mínimo requerido por PSE
      description: 'Prueba PSE',
      payment_method_id: 'pse',
      payer: {
        entity_type: 'individual',
        email: 'test_user_123456@testuser.com', // Email de cuenta de pruebas
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
        ip_address: req.ip || req.connection.remoteAddress || '127.0.0.1'
      },
      transaction_details: {
        financial_institution: '1006' // Banco Agrario
      },
      // URLs requeridas para PSE según error 4058
      callback_url: 'https://httpbin.org/status/200',
      notification_url: 'https://webhook.site/your-unique-url' // Obligatoria según documentación
    };
    
    console.log('Datos de prueba a enviar:', JSON.stringify(testPaymentData, null, 2));
    
    // Intentar crear el pago de prueba
    const payment = await paymentClient.create({ body: testPaymentData });
    
    console.log('Pago PSE de prueba creado exitosamente:', payment.id);
    
    res.json({
      success: true,
      message: 'Configuración PSE correcta',
      payment_id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail
    });
    
  } catch (error) {
    console.error('Error en prueba PSE:', error);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    res.status(500).json({
      success: false,
      error: 'Error en configuración PSE',
      details: error.message,
      full_error: error
    });
  }
};

// Nueva función para crear preferencias de pago PSE
const createPSEPreference = async (req, res) => {
  try {
    console.log('=== CREANDO PREFERENCIA PSE ===');
    
    const { amount, description, payerEmail, payerName } = req.body;
    
    // Validar datos requeridos
    if (!amount || !description || !payerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: amount, description, payerEmail'
      });
    }
    
    // Validar monto mínimo para PSE
    if (amount < 1600) {
      return res.status(400).json({
        success: false,
        message: 'El monto mínimo para PSE es $1,600 pesos colombianos'
      });
    }
    
    console.log('Datos recibidos:', { amount, description, payerEmail, payerName });
    
    // Crear preferencia de pago PSE
    const preferenceData = {
      items: [
        {
          title: description,
          unit_price: amount,
          currency_id: 'COP',
          quantity: 1
        }
      ],
      payer: {
        email: payerEmail,
        name: payerName || 'Usuario',
        identification: {
          type: 'CC',
          number: '12345678'
        }
      },
      // Configuración específica para PSE en Colombia
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' },
          { id: 'cash' },
          { id: 'ticket' },
          { id: 'atm' }
        ]
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`
      },
      notification_url: 'https://webhook.site/your-unique-url',
      external_reference: `PSE_${Date.now()}`,
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
      message: 'Preferencia de pago PSE creada correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error creando preferencia PSE:', error);
    
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

// Función para probar disponibilidad de PSE
exports.testPSEAvailability = async (req, res) => {
  try {
    console.log('=== PROBANDO DISPONIBILIDAD PSE ===');
    
    // Verificar configuración
    if (!mp.accessToken) {
      return res.status(500).json({ 
        error: 'Access Token de Mercado Pago no configurado' 
      });
    }
    
    // Crear una preferencia de prueba específica para PSE
    const testPreferenceData = {
      items: [
        {
          title: 'Prueba PSE',
          unit_price: 1600,
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
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' },
          { id: 'cash' },
          { id: 'ticket' },
          { id: 'atm' }
        ]
      },
      back_urls: {
        success: 'https://httpbin.org/status/200',
        failure: 'https://httpbin.org/status/200',
        pending: 'https://httpbin.org/status/200'
      },
      notification_url: 'https://webhook.site/your-unique-url',
      external_reference: `TEST_PSE_${Date.now()}`,
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
      message: 'Preferencia PSE de prueba creada correctamente',
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      test_url: preference.sandbox_init_point || preference.init_point
    });
    
  } catch (error) {
    console.error('❌ Error probando disponibilidad PSE:', error);
    
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

// Función alternativa para PSE con configuración más simple
exports.createSimplePSEPreference = async (req, res) => {
  try {
    console.log('=== CREANDO PREFERENCIA PSE SIMPLE ===');
    
    const { amount, description, payerEmail, payerName } = req.body;
    
    // Validar datos requeridos
    if (!amount || !description || !payerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: amount, description, payerEmail'
      });
    }
    
    // Validar monto mínimo para PSE
    if (amount < 1600) {
      return res.status(400).json({
        success: false,
        message: 'El monto mínimo para PSE es $1,600 pesos colombianos'
      });
    }
    
    console.log('Datos recibidos:', { amount, description, payerEmail, payerName });
    
    // Crear preferencia de pago PSE con configuración más simple
    const preferenceData = {
      items: [
        {
          title: description,
          unit_price: amount,
          currency_id: 'COP',
          quantity: 1
        }
      ],
      payer: {
        email: payerEmail,
        name: payerName || 'Usuario',
        identification: {
          type: 'CC',
          number: '12345678'
        }
      },
      // Configuración más simple - solo excluir tarjetas
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' }
        ]
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`
      },
      notification_url: 'https://webhook.site/your-unique-url',
      external_reference: `PSE_SIMPLE_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('Datos de preferencia simple a enviar:', JSON.stringify(preferenceData, null, 2));
    
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    const preference = await preferenceClient.create({ body: preferenceData });
    
    console.log('✅ Preferencia PSE simple creada exitosamente:', preference.id);
    console.log('URL de pago:', preference.init_point);
    
    res.json({
      success: true,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      message: 'Preferencia de pago PSE simple creada correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error creando preferencia PSE simple:', error);
    
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

// Función para verificar métodos de pago disponibles
exports.checkAvailablePaymentMethods = async (req, res) => {
  try {
    console.log('=== VERIFICANDO MÉTODOS DE PAGO DISPONIBLES ===');
    
    // Verificar configuración
    if (!mp.accessToken) {
      return res.status(500).json({ 
        error: 'Access Token de Mercado Pago no configurado' 
      });
    }
    
    // Obtener métodos de pago disponibles
    const { PaymentMethod } = require('mercadopago');
    const paymentMethodClient = new PaymentMethod(mp);
    
    const paymentMethods = await paymentMethodClient.list();
    
    console.log('Métodos de pago disponibles:', paymentMethods.length);
    
    // Filtrar solo métodos de Colombia
    const colombianMethods = paymentMethods.filter(method => 
      method.country_id === 'CO' || method.country_id === 'CO'
    );
    
    console.log('Métodos de Colombia:', colombianMethods.length);
    
    // Buscar específicamente PSE
    const pseMethod = paymentMethods.find(method => 
      method.id === 'pse' || method.payment_type_id === 'bank_transfer'
    );
    
    res.json({
      success: true,
      total_methods: paymentMethods.length,
      colombian_methods: colombianMethods.length,
      pse_available: !!pseMethod,
      pse_method: pseMethod,
      all_methods: paymentMethods.map(method => ({
        id: method.id,
        name: method.name,
        payment_type_id: method.payment_type_id,
        country_id: method.country_id,
        status: method.status
      }))
    });
    
  } catch (error) {
    console.error('❌ Error verificando métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Función para forzar PSE específicamente
exports.createForcedPSEPreference = async (req, res) => {
  try {
    console.log('=== CREANDO PREFERENCIA PSE FORZADA ===');
    
    const { amount, description, payerEmail, payerName } = req.body;
    
    // Validar datos requeridos
    if (!amount || !description || !payerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: amount, description, payerEmail'
      });
    }
    
    // Validar monto mínimo para PSE
    if (amount < 1600) {
      return res.status(400).json({
        success: false,
        message: 'El monto mínimo para PSE es $1,600 pesos colombianos'
      });
    }
    
    console.log('Datos recibidos:', { amount, description, payerEmail, payerName });
    
    // Crear preferencia de pago PSE forzada
    const preferenceData = {
      items: [
        {
          title: description,
          unit_price: amount,
          currency_id: 'COP',
          quantity: 1
        }
      ],
      payer: {
        email: payerEmail,
        name: payerName || 'Usuario',
        identification: {
          type: 'CC',
          number: '12345678'
        }
      },
      // Configuración específica para forzar PSE
      payment_methods: {
        installments: 1,
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' },
          { id: 'cash' },
          { id: 'ticket' },
          { id: 'atm' }
        ],
        excluded_payment_methods: [
          { id: 'visa' },
          { id: 'master' },
          { id: 'amex' },
          { id: 'elo' },
          { id: 'hipercard' },
          { id: 'diners' }
        ]
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result`
      },
      notification_url: 'https://webhook.site/your-unique-url',
      external_reference: `PSE_FORCED_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log('Datos de preferencia forzada a enviar:', JSON.stringify(preferenceData, null, 2));
    
    const { Preference } = require('mercadopago');
    const preferenceClient = new Preference(mp);
    
    const preference = await preferenceClient.create({ body: preferenceData });
    
    console.log('✅ Preferencia PSE forzada creada exitosamente:', preference.id);
    console.log('URL de pago:', preference.init_point);
    
    res.json({
      success: true,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      message: 'Preferencia de pago PSE forzada creada correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error creando preferencia PSE forzada:', error);
    
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

// Exportar todas las funciones
module.exports = {
  createPSEPreference,
  createSimplePSEPreference: exports.createSimplePSEPreference,
  createForcedPSEPreference: exports.createForcedPSEPreference,
  createPreference: exports.createPreference,
  getPaymentStatus: exports.getPaymentStatus,
  processPayment: exports.processPayment,
  payWithSavedCard: exports.payWithSavedCard,
  getPaymentMethods: exports.getPaymentMethods,
  checkAvailablePaymentMethods: exports.checkAvailablePaymentMethods,
  testPaymentStatus: exports.testPaymentStatus,
  testMercadoPagoConfig: exports.testMercadoPagoConfig,
  testProcessPayment: exports.testProcessPayment,
  testPSEConfig: exports.testPSEConfig,
  testPSEAvailability: exports.testPSEAvailability,
  webhook: exports.webhook,
  testWebhook: exports.testWebhook
}; 