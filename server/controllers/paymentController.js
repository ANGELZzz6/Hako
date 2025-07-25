const { MercadoPagoConfig } = require('mercadopago');
const transporter = require('../config/nodemailer');
const User = require('../models/User');

// Configuración de Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471'
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
    
    // Buscar si el usuario tiene un pedido activo en estado 'paid' sin casillero confirmado
    const Order = require('../models/Order');
    let activeOrder = await Order.findOne({
      user: user_id,
      status: 'paid' // Solo pedidos pagados pero sin casillero confirmado
    });

    // Si existe un pedido activo, usar su external_reference
    let finalExternalReference = external_reference;
    if (activeOrder) {
      finalExternalReference = activeOrder.external_reference;
      console.log('🔄 Usando external_reference del pedido activo:', finalExternalReference);
    } else {
      finalExternalReference = external_reference || `PREF_${Date.now()}`;
      console.log('🆕 Creando nuevo external_reference:', finalExternalReference);
    }
    
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
      notification_url: 'https://ea8d2c9a3e01.ngrok-free.app/api/payment/webhook/mercadopago',
      external_reference: finalExternalReference,
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
      notification_url: 'https://ea8d2c9a3e01.ngrok-free.app/api/payment/webhook/mercadopago',
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
// Set para rastrear webhooks en proceso
const processingWebhooks = new Set();

exports.mercadoPagoWebhook = async (req, res) => {
  // Declarar paymentId al inicio para que esté disponible en todo el scope
  let paymentId = null;
  
  try {
    console.log('🔔 Webhook Mercado Pago recibido:', req.body, req.query);

    // Validar que tenemos el access token
    const { MERCADOPAGO_ACCESS_TOKEN } = process.env;
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ Error: MERCADOPAGO_ACCESS_TOKEN no está configurado');
      return res.status(500).send('Error de configuración');
    }

    // Mercado Pago puede enviar info en body o query
    paymentId = req.body.data && req.body.data.id
      ? req.body.data.id
      : req.query.id;
    const topic = req.body.type || req.query.topic;

    console.log('📋 Datos del webhook:');
    console.log('  - Payment ID:', paymentId);
    console.log('  - Topic:', topic);
    console.log('  - Access Token:', MERCADOPAGO_ACCESS_TOKEN.substring(0, 20) + '...');

    // Solo procesar si es un pago
    if (topic === 'payment' && paymentId) {
      // Verificar si este webhook ya está siendo procesado
      if (processingWebhooks.has(paymentId)) {
        console.log(`⏳ Webhook para pago ${paymentId} ya está siendo procesado. Saltando.`);
        return res.status(200).send('OK');
      }
      
      // Marcar este webhook como en proceso
      processingWebhooks.add(paymentId);
      
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
        const Order = require('../models/Order');

        try {
          // Extraer información del usuario y productos desde metadata
          const user_id = paymentInfo.metadata?.user_id;
          const selected_items = paymentInfo.metadata?.selected_items || [];
          
                  console.log('📦 Productos comprados:', selected_items);
        console.log('👤 Usuario:', user_id);
        console.log('🔍 Metadata completo:', paymentInfo.metadata);
        
        // Verificar si el pago ya fue procesado y usar findOneAndUpdate para evitar condiciones de carrera
        const Payment = require('../models/Payment');
        
        const paymentData = {
          user_id: user_id,
          mp_payment_id: paymentInfo.id.toString(),
          amount: paymentInfo.transaction_amount,
          status: paymentInfo.status,
          payment_method: {
            type: paymentInfo.payment_method?.type || '',
            id: paymentInfo.payment_method?.id || ''
          },
          currency: paymentInfo.currency || 'COP',
          external_reference: paymentInfo.external_reference,
          date_created: new Date(paymentInfo.date_created),
          date_approved: paymentInfo.status === 'approved' ? new Date(paymentInfo.date_approved || Date.now()) : null,
          // Agregar información del pagador
          payer: {
            email: paymentInfo.payer?.email || '',
            name: paymentInfo.payer?.name || '',
            surname: paymentInfo.payer?.surname || ''
          },
          // Agregar productos comprados específicos de este pago
          purchased_items: selected_items.map(item => ({
            product_id: item.id || item.product_id || item._id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            product_name: item.title || item.name
          }))
        };

        // Usar findOneAndUpdate con upsert para evitar condiciones de carrera
        const payment = await Payment.findOneAndUpdate(
          { mp_payment_id: paymentInfo.id.toString() },
          paymentData,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true 
          }
        );
        
        // Verificar si el pago es nuevo o ya existía
        if (payment.createdAt.getTime() === payment.updatedAt.getTime()) {
          console.log('💾 Pago nuevo guardado en la base de datos');
        } else {
          console.log(`ℹ️ Pago ${paymentInfo.id} ya existía. Verificando productos individuales...`);
          
          // Si el pago está aprobado, siempre intentar crear productos individuales
          // (la función maneja internamente la verificación de duplicados)
          if (paymentInfo.status === 'approved') {
            console.log('🔄 Verificando y creando productos individuales faltantes...');
            await createIndividualProductsForPayment(paymentInfo, payment);
          }
          
          return res.status(200).send('OK');
        }

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
            // Buscar pedido activo en estado 'paid' (que no esté en ready_for_pickup)
            let activeOrder = await Order.findOne({
              user: user_id,
              status: 'paid' // Solo pedidos pagados pero sin casillero confirmado
            });

            if (activeOrder) {
              // Verificar si los productos ya están en el pedido para evitar duplicados
              const existingProductIds = activeOrder.items.map(item => item.product.toString());
              console.log('🔍 Productos existentes en el pedido:', existingProductIds);
              console.log('🆕 Productos a agregar:', selected_items.map(item => (item.id || item.product_id || item._id).toString()));
              
              // Procesar cada producto nuevo
              for (const newItem of selected_items) {
                const productId = (newItem.id || newItem.product_id || newItem._id).toString();
                const existingItemIndex = activeOrder.items.findIndex(item => item.product.toString() === productId);
                
                if (existingItemIndex !== -1) {
                  // Producto ya existe, sumar cantidad
                  const existingItem = activeOrder.items[existingItemIndex];
                  const oldTotalPrice = existingItem.total_price; // Guardar el precio anterior
                  const newQuantity = existingItem.quantity + newItem.quantity;
                  const newTotalPrice = existingItem.unit_price * newQuantity;
                  
                  console.log(`🔢 Sumando cantidad para ${newItem.title}: ${existingItem.quantity} + ${newItem.quantity} = ${newQuantity}`);
                  console.log(`💰 Actualizando precio: ${oldTotalPrice} → ${newTotalPrice} (diferencia: ${newTotalPrice - oldTotalPrice})`);
                  
                  // Actualizar cantidad y precio total del item existente
                  activeOrder.items[existingItemIndex].quantity = newQuantity;
                  activeOrder.items[existingItemIndex].total_price = newTotalPrice;
                  
                  // Actualizar total del pedido (restar el precio anterior y sumar el nuevo)
                  activeOrder.total_amount = activeOrder.total_amount - oldTotalPrice + newTotalPrice;
                  
                } else {
                  // Producto nuevo, agregarlo
                  console.log(`🆕 Agregando producto nuevo: ${newItem.title}`);
                  const newItemToAdd = {
                    product: newItem.id || newItem.product_id || newItem._id,
                    quantity: newItem.quantity,
                    unit_price: newItem.unit_price,
                    total_price: newItem.unit_price * newItem.quantity
                  };
                  activeOrder.items.push(newItemToAdd);
                  activeOrder.total_amount += newItemToAdd.total_price;
                }
              }
              
              // Actualizar información de pago
              activeOrder.paid_at = new Date();
              activeOrder.payment = {
                mp_payment_id: paymentInfo.id.toString(),
                status: paymentInfo.status,
                method: paymentInfo.payment_method?.type || '',
                amount: paymentInfo.transaction_amount,
                currency: paymentInfo.currency || 'COP'
              };
              
              await activeOrder.save();
              
              // Verificar el cálculo del total
              const calculatedTotal = activeOrder.items.reduce((acc, item) => acc + item.total_price, 0);
              console.log('✅ Pedido activo actualizado:', activeOrder._id);
              console.log(`💰 Total guardado: ${activeOrder.total_amount}, Total calculado: ${calculatedTotal}`);
              console.log('📦 Items en el pedido:', activeOrder.items.map(item => `${item.quantity}x $${item.unit_price} = $${item.total_price}`));
              
              // Crear productos individuales para el pedido actualizado
              await createIndividualProductsForPayment(paymentInfo, payment);
            } else {
              // Si no hay pedido activo, buscar si existe una orden con este external_reference
              let existingOrder = await Order.findOne({ 
                external_reference: paymentInfo.external_reference 
              });

              if (existingOrder) {
                // Actualizar la orden existente
                const orderUpdate = {
                  status: 'paid',
                  paid_at: new Date(),
                  'payment.mp_payment_id': paymentInfo.id.toString(),
                  'payment.status': paymentInfo.status,
                  'payment.method': paymentInfo.payment_method?.type || '',
                  'payment.amount': paymentInfo.transaction_amount,
                  'payment.currency': paymentInfo.currency || 'COP'
                };

                let updatedOrder = await Order.findOneAndUpdate(
                  { external_reference: paymentInfo.external_reference },
                  orderUpdate,
                  { new: true }
                );

                console.log('✅ Orden actualizada como pagada:', updatedOrder._id);
                
                // Crear productos individuales para la orden actualizada
                await createIndividualProductsForPayment(paymentInfo, payment);
              } else {
                // Si no existe la orden, la creamos
                try {
                  // Calcular el total de la orden
                  const total_amount = selected_items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
                  const items = selected_items.map(item => ({
                    product: item.id || item.product_id || item._id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.unit_price * item.quantity
                  }));

                  const newOrder = new Order({
                    user: user_id,
                    items,
                    status: 'paid', // Estado inicial: pagado - productos disponibles para reclamar
                    paid_at: new Date(),
                    payment: {
                      mp_payment_id: paymentInfo.id.toString(),
                      status: paymentInfo.status,
                      method: paymentInfo.payment_method?.type || '',
                      amount: paymentInfo.transaction_amount,
                      currency: paymentInfo.currency || 'COP'
                    },
                    external_reference: paymentInfo.external_reference,
                    total_amount
                    // No se asigna casillero automáticamente - el usuario lo hará al reclamar productos
                  });
                  await newOrder.save();
                  console.log('✅ Orden creada:', newOrder._id, 'Productos disponibles para reclamar');

                  // Crear productos individuales usando la función auxiliar
                  await createIndividualProductsForPayment(paymentInfo, payment);

                  if (newOrder) {
                    try {
                      const user = await User.findById(user_id);
                      if (user) {
                        // Correo de confirmación de compra
                        await transporter.sendMail({
                          to: user.email,
                          subject: '¡Gracias por tu compra en Hako! 🎉',
                          html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
                              <div style="text-align: center; margin-bottom: 24px;">
                                <img src="https://i.imgur.com/0y0y0y0.png" alt="Hako Logo" style="height: 48px; margin-bottom: 8px;"/>
                                <h2 style="color: #d32f2f; margin: 0;">¡Gracias por tu compra!</h2>
                              </div>
                              <p style="font-size: 17px; color: #222;">Hola <b>${user.nombre}</b>,</p>
                              <p style="font-size: 16px; color: #444;">Tu compra ha sido procesada exitosamente. Pronto podrás reservar tu casillero para recoger tus productos.</p>
                              <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;">
                                <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Número de pedido:</b> ${newOrder._id}</p>
                                <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Total pagado:</b> $${newOrder.total_amount.toLocaleString('es-CO')}</p>
                                <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Estado:</b> Pagado</p>
                              </div>
                              <p style="font-size: 15px; color: #444;">Te avisaremos por correo cuando puedas reservar tu casillero.</p>
                              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;"/>
                              <footer style="font-size: 13px; color: #888; text-align: center;">
                                <p>¿Tienes dudas? Contáctanos en <a href="mailto:soporte@hako.com" style="color: #d32f2f; text-decoration: none;">soporte@hako.com</a></p>
                                <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
                              </footer>
                            </div>
                          `
                        });
                        console.log('📧 Correo de confirmación de compra enviado a', user.email);
                        // Correo de aviso de reserva (unos segundos después)
                        setTimeout(async () => {
                          try {
                            await transporter.sendMail({
                              to: user.email,
                              subject: '¡Ya puedes reservar tu casillero en Hako! 📦',
                              html: `
                                <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;\">
                                  <div style=\"text-align: center; margin-bottom: 24px;\">
                                    <img src=\"https://i.imgur.com/0y0y0y0.png\" alt=\"Hako Logo\" style=\"height: 48px; margin-bottom: 8px;\"/>
                                    <h2 style=\"color: #d32f2f; margin: 0;\">¡Ya puedes reservar tu casillero!</h2>
                                  </div>
                                  <p style=\"font-size: 17px; color: #222;\">Hola <b>${user.nombre}</b>,</p>
                                  <p style=\"font-size: 16px; color: #444;\">Tu pedido ya está listo para que reserves tu casillero y programes la recogida de tus productos.</p>
                                  <div style=\"background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;\">
                                    <p style=\"margin: 0 0 8px 0; font-size: 15px;\"><b>Número de pedido:</b> ${newOrder._id}</p>
                                    <p style=\"margin: 0 0 8px 0; font-size: 15px;\"><b>Total pagado:</b> $${newOrder.total_amount.toLocaleString('es-CO')}</p>
                                    <p style=\"margin: 0 0 8px 0; font-size: 15px;\"><b>Estado:</b> Listo para reservar casillero</p>
                                  </div>
                                  <p style=\"font-size: 15px; color: #444;\">Ingresa a tu cuenta en Hako y selecciona el casillero para tu pedido.</p>
                                  <hr style=\"border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;\"/>
                                  <footer style=\"font-size: 13px; color: #888; text-align: center;\">
                                    <p>¿Tienes dudas? Contáctanos en <a href=\"mailto:soporte@hako.com\" style=\"color: #d32f2f; text-decoration: none;\">soporte@hako.com</a></p>
                                    <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
                                  </footer>
                                </div>
                              `
                            });
                            console.log('📧 Correo de aviso de reserva enviado a', user.email);
                          } catch (mailErr2) {
                            console.error('❌ Error enviando correo de aviso de reserva:', mailErr2);
                          }
                        }, 10000); // 10 segundos después (ajustable)
                      }
                    } catch (mailErr) {
                      console.error('❌ Error enviando correo post compra:', mailErr);
                    }
                  }
                } catch (orderCreateError) {
                  console.error('❌ Error creando la orden:', orderCreateError);
                }
              }
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
  } finally {
    // Siempre remover el pago del set de procesamiento, incluso si hay error
    if (paymentId && processingWebhooks.has(paymentId)) {
      processingWebhooks.delete(paymentId);
    }
  }
};

// Obtener todos los pagos (para admin)
exports.getAllPayments = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    
    console.log('📊 Calculando estadísticas de pagos...');
    
    // Obtener todos los pagos para debug
    const payments = await Payment.find()
      .populate('user_id', 'nombre email')
      .populate('purchased_items.product_id', 'title picture_url')
      .sort({ date_created: -1 })
      .exec();
    
    // Para cada pago, usar los purchased_items del modelo Payment
    const paymentsWithProducts = payments.map((payment) => {
      const paymentObj = payment.toObject();
      
      // Usar los purchased_items del modelo Payment
      if (payment.purchased_items && payment.purchased_items.length > 0) {
        paymentObj.purchased_items = payment.purchased_items
          .filter(item => item.product_id) // Filtrar items sin product_id
          .map(item => ({
            id: item.product_id._id || item.product_id,
            title: item.product_id?.title || item.product_name || 'Producto desconocido',
            picture_url: item.product_id?.picture_url || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price
          }));
      } else {
        paymentObj.purchased_items = [];
      }
      
      return paymentObj;
    });
    
    res.json(paymentsWithProducts);
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
      .populate('purchased_items.product_id', 'title picture_url')
      .exec();
    
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }
    
    const paymentObj = payment.toObject();
    
    // Usar los purchased_items del modelo Payment
    if (payment.purchased_items && payment.purchased_items.length > 0) {
      paymentObj.purchased_items = payment.purchased_items
        .filter(item => item.product_id) // Filtrar items sin product_id
        .map(item => ({
          id: item.product_id._id || item.product_id,
          title: item.product_id?.title || item.product_name || 'Producto desconocido',
          picture_url: item.product_id?.picture_url || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        }));
    } else {
      paymentObj.purchased_items = [];
    }
    
    res.json(paymentObj);
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
    } else if (status !== 'approved') {
      payment.date_approved = null;
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

// Eliminar todos los pagos (para admin)
exports.deleteAllPayments = async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    
    // Contar cuántos pagos se van a eliminar
    const count = await Payment.countDocuments();
    
    if (count === 0) {
      return res.status(404).json({ message: 'No hay pagos para eliminar' });
    }
    
    // Eliminar todos los pagos
    await Payment.deleteMany({});
    
    console.log(`🗑️ Eliminados ${count} pagos del sistema`);
    
    res.json({ 
      message: `${count} pagos eliminados correctamente`,
      deletedCount: count
    });
  } catch (error) {
    console.error('Error al eliminar todos los pagos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Función auxiliar para crear productos individuales para un pago
// Set para rastrear pagos en proceso
const processingPayments = new Set();

async function createIndividualProductsForPayment(paymentInfo, payment) {
  const paymentId = paymentInfo.id.toString();
  
  // Verificar si este pago ya está siendo procesado
  if (processingPayments.has(paymentId)) {
    console.log(`⏳ Pago ${paymentId} ya está siendo procesado. Saltando creación duplicada.`);
    return;
  }
  
  // Marcar este pago como en proceso
  processingPayments.add(paymentId);
  
  try {
    const Order = require('../models/Order');
    const IndividualProduct = require('../models/IndividualProduct');
    
    // Extraer información del usuario y productos desde metadata
    const user_id = paymentInfo.metadata?.user_id;
    const selected_items = paymentInfo.metadata?.selected_items || [];
    
    if (!user_id || selected_items.length === 0) {
      console.log('⚠️ No se pueden crear productos individuales: faltan datos del usuario o productos');
      return;
    }
    
    // Buscar la orden asociada al pago
    const order = await Order.findOne({
      'payment.mp_payment_id': paymentId
    });
    
    if (!order) {
      console.log('⚠️ No se encontró orden asociada al pago:', paymentId);
      return;
    }
    
    // Crear productos individuales SOLO para los productos recién comprados (selected_items)
    let nuevosCreados = 0;
    
    for (const selectedItem of selected_items) {
      const productId = selectedItem.id || selectedItem.product_id;
      
      // Obtener el producto original para copiar las dimensiones
      const Product = require('../models/Product');
      const originalProduct = await Product.findById(productId);
      
      if (!originalProduct) {
        console.log('⚠️ Producto original no encontrado:', productId);
        continue;
      }
      
      // Contar cuántos productos individuales ya existen para este producto específico en esta orden
      // (sin importar el mp_payment_id para evitar duplicados en compras múltiples)
      const existingCount = await IndividualProduct.countDocuments({
        order: order._id,
        product: productId
      });
      
      // Calcular cuántos productos individuales deberían existir según la orden
      const orderItem = order.items.find(item => item.product.toString() === productId);
      const expectedCount = orderItem ? orderItem.quantity : 0;
      
      // Calcular cuántos productos individuales faltan por crear
      const missingCount = expectedCount - existingCount;
      
      console.log(`🔍 Verificación para "${originalProduct.nombre}":`);
      console.log(`   - Producto ID: ${productId}`);
      console.log(`   - Orden ID: ${order._id}`);
      console.log(`   - Cantidad en orden: ${expectedCount}`);
      console.log(`   - Productos individuales existentes: ${existingCount}`);
      console.log(`   - Productos individuales faltantes: ${missingCount}`);
      
      if (missingCount <= 0) {
        console.log(`ℹ️ Ya existen ${existingCount} productos individuales para "${originalProduct.nombre}" (esperados: ${expectedCount}). Saltando.`);
        continue;
      }
      
      console.log(`📦 Creando ${missingCount} productos individuales para "${originalProduct.nombre}" (existen: ${existingCount}, esperados: ${expectedCount})`);
      
      for (let i = 0; i < missingCount; i++) {
        const individualProduct = new IndividualProduct({
          user: user_id,
          order: order._id,
          product: productId,
          individualIndex: existingCount + i + 1, // Continuar desde donde se quedó
          status: 'available',
          unitPrice: selectedItem.unit_price,
          dimensiones: originalProduct.dimensiones,
          payment: {
            mp_payment_id: paymentId,
            status: paymentInfo.status
          }
        });
        await individualProduct.save();
        nuevosCreados++;
      }
      console.log(`✅ Creados ${missingCount} productos individuales para "${originalProduct.nombre}"`);
    }
    
    if (nuevosCreados === 0) {
      console.log('ℹ️ No había productos individuales por crear.');
    } else {
      console.log(`🎉 Total de productos individuales nuevos creados: ${nuevosCreados}`);
    }
    
    console.log('✅ Productos individuales creados exitosamente para el pago:', paymentId);
    
  } catch (error) {
    console.error('❌ Error creando productos individuales:', error);
  } finally {
    // Siempre remover el pago del set de procesamiento, incluso si hay error
    processingPayments.delete(paymentId);
  }
}

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
  deletePayment: exports.deletePayment,
  deleteAllPayments: exports.deleteAllPayments
}; 