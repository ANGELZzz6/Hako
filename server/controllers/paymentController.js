const { MercadoPagoConfig } = require('mercadopago');

// Configuración de Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471'
});

// Función para crear preferencias de pago (Checkout Pro)
exports.createPreference = async (req, res) => {
  try {
    console.log('=== CREANDO PREFERENCIA DE PAGO (CHECKOUT PRO) ===');
    
    const { items, payer, external_reference, user_id, selected_items } = req.body;
    
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
    
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID del usuario'
      });
    }
    
    console.log('Datos recibidos:', { items, payer, external_reference, user_id, selected_items });
    
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
        success: `${process.env.FRONTEND_URL}/payment-result`,
        failure: `${process.env.FRONTEND_URL}/payment-result`,
        pending: `${process.env.FRONTEND_URL}/payment-result`
      },
      // auto_return: 'all', // Comentado para pruebas de webhook - habilitar en producción
      notification_url: 'https://620e-190-24-30-135.ngrok-free.app/api/payment/webhook/mercadopago',
      external_reference: external_reference || `PREF_${Date.now()}`,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      metadata: {
        user_id: user_id,
        selected_items: selected_items || items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.title
        }))
      }
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

        // Guardar información del pago en la base de datos
        const Payment = require('../models/Payment');
        const Order = require('../models/Order');

        try {
          // Extraer información del usuario y productos desde metadata
          const user_id = paymentInfo.metadata?.user_id;
          const selected_items = paymentInfo.metadata?.selected_items || [];
          
          console.log('📦 Productos comprados:', selected_items);
          console.log('👤 Usuario:', user_id);
          console.log('🔍 Metadata completo:', paymentInfo.metadata);
          
          // Guardar o actualizar el pago
          const paymentData = {
            mp_payment_id: paymentInfo.id.toString(),
            status: paymentInfo.status,
            status_detail: paymentInfo.status_detail || '',
            amount: paymentInfo.transaction_amount,
            currency: paymentInfo.currency || 'COP',
            payment_method: {
              type: paymentInfo.payment_method?.type || '',
              id: paymentInfo.payment_method?.id || ''
            },
            payer: {
              email: paymentInfo.payer?.email || '',
              name: paymentInfo.payer?.first_name || '',
              surname: paymentInfo.payer?.last_name || ''
            },
            external_reference: paymentInfo.external_reference || '',
            user_id: user_id,
            purchased_items: selected_items,
            date_created: new Date(paymentInfo.date_created),
            date_approved: paymentInfo.status === 'approved' ? new Date(paymentInfo.date_approved || Date.now()) : null,
            description: paymentInfo.description || '',
            live_mode: paymentInfo.live_mode || false
          };

          // Upsert: crear si no existe, actualizar si existe
          await Payment.findOneAndUpdate(
            { mp_payment_id: paymentData.mp_payment_id },
            paymentData,
            { upsert: true, new: true }
          );

          console.log('💾 Pago guardado en la base de datos');

          // Si el pago fue aprobado, limpiar productos del carrito
          if (paymentInfo.status === 'approved' && user_id && selected_items.length > 0) {
            console.log('✅ Pago aprobado, limpiando carrito...');
            
            try {
              const Cart = require('../models/Cart');
              
                                  // Obtener IDs de productos comprados
          const purchasedProductIds = selected_items.map(item => {
            console.log('🔍 Procesando item:', item);
            return item.id || item.product_id || item._id;
          }).filter(id => id);
          
          console.log('🗑️ Eliminando productos del carrito:', purchasedProductIds);
              
              // Eliminar productos comprados del carrito del usuario
              const result = await Cart.updateMany(
                { 
                  id_usuario: user_id,
                  'items.id_producto': { $in: purchasedProductIds }
                },
                { 
                  $pull: { 
                    items: { 
                      id_producto: { $in: purchasedProductIds } 
                    } 
                  } 
                }
              );
              
              console.log(`🧹 Carrito limpiado: ${result.modifiedCount} carritos actualizados`);
              
            } catch (cartError) {
              console.error('❌ Error limpiando carrito:', cartError);
            }
          }

          // Si el pago fue aprobado, actualizar la orden
          if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
            const orderUpdate = {
              status: 'paid',
              paid_at: new Date(),
              'payment.mp_payment_id': paymentInfo.id.toString(),
              'payment.status': paymentInfo.status,
              'payment.method': paymentInfo.payment_method?.type || '',
              'payment.amount': paymentInfo.transaction_amount,
              'payment.currency': paymentInfo.currency || 'COP'
            };

            const updatedOrder = await Order.findOneAndUpdate(
              { external_reference: paymentInfo.external_reference },
              orderUpdate,
              { new: true }
            );

            if (updatedOrder) {
              console.log('✅ Orden actualizada como pagada:', updatedOrder._id);
            } else {
              console.log('⚠️ Orden no encontrada con external_reference:', paymentInfo.external_reference);
            }
          }

        } catch (dbError) {
          console.error('❌ Error guardando en base de datos:', dbError);
        }
        
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

// Obtener todos los pagos (para admin)
exports.getAllPayments = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    
    const payments = await Payment.find()
      .populate('user_id', 'nombre email')
      .sort({ date_created: -1 })
      .exec();
    
    res.json(payments);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener pago por ID (para admin)
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Verificar que no sea "stats"
    if (paymentId === 'stats') {
      return res.status(400).json({ message: 'ID de pago inválido' });
    }
    
    const Payment = require('../models/Payment');
    
    const payment = await Payment.findById(paymentId)
      .populate('user_id', 'nombre email')
      .exec();
    
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de pagos (para admin)
exports.getPaymentStats = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    
    console.log('📊 Calculando estadísticas de pagos...');
    
    // Obtener todos los pagos para debug
    const allPayments = await Payment.find({}, 'status amount');
    console.log('🔍 Todos los pagos encontrados:', allPayments.length);
    console.log('📋 Estados de pagos:', allPayments.map(p => ({ status: p.status, amount: p.amount })));
    
    const totalPayments = await Payment.countDocuments();
    const approvedPayments = await Payment.countDocuments({ status: 'approved' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const rejectedPayments = await Payment.countDocuments({ status: 'rejected' });
    
    console.log('📈 Conteos:', {
      total: totalPayments,
      approved: approvedPayments,
      pending: pendingPayments,
      rejected: rejectedPayments
    });
    
    const totalAmount = await Payment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const averageAmount = await Payment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, average: { $avg: '$amount' } } }
    ]);
    
    const stats = {
      totalPayments,
      approvedPayments,
      pendingPayments,
      rejectedPayments,
      totalAmount: totalAmount[0]?.total || 0,
      averageAmount: averageAmount[0]?.average || 0
    };
    
    console.log('💰 Estadísticas calculadas:', stats);
    
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar estado de pago (para admin)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;
    
    const Payment = require('../models/Payment');
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    
    payment.status = status;
    if (status === 'approved' && !payment.date_approved) {
      payment.date_approved = new Date();
    }
    
    await payment.save();
    
    // Poblar datos del usuario para la respuesta
    await payment.populate('user_id', 'nombre email');
    
    res.json(payment);
  } catch (error) {
    console.error('Error al actualizar estado del pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar pago (para admin)
exports.deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const Payment = require('../models/Payment');
    
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    
    await Payment.findByIdAndDelete(paymentId);
    
    res.json({ message: 'Pago eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Exportar todas las funciones
module.exports = {
  createPreference: exports.createPreference,
  getPaymentStatus: exports.getPaymentStatus,
  webhook: exports.webhook,
  testConfig: exports.testConfig,
  mercadoPagoWebhook: exports.mercadoPagoWebhook,
  getAllPayments: exports.getAllPayments,
  getPaymentById: exports.getPaymentById,
  getPaymentStats: exports.getPaymentStats,
  updatePaymentStatus: exports.updatePaymentStatus,
  deletePayment: exports.deletePayment
}; 