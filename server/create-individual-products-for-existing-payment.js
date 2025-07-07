const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HAKO')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const Payment = require('./models/Payment');
const Order = require('./models/Order');
const IndividualProduct = require('./models/IndividualProduct');

async function createIndividualProductsForExistingPayment(paymentId) {
  try {
    console.log('🔍 Buscando pago:', paymentId);
    
    // Buscar el pago
    const payment = await Payment.findOne({ mp_payment_id: paymentId });
    if (!payment) {
      console.log('❌ Pago no encontrado:', paymentId);
      return;
    }
    
    console.log('✅ Pago encontrado:', {
      id: payment._id,
      mp_payment_id: payment.mp_payment_id,
      status: payment.status,
      amount: payment.amount,
      user_id: payment.user_id
    });
    
    // Buscar la orden asociada
    const order = await Order.findOne({
      'payment.mp_payment_id': paymentId
    }).populate('items.product');
    
    if (!order) {
      console.log('❌ Orden no encontrada para el pago:', paymentId);
      return;
    }
    
    console.log('✅ Orden encontrada:', {
      id: order._id,
      status: order.status,
      total_amount: order.total_amount,
      items_count: order.items.length
    });
    
    // Verificar si ya existen productos individuales
    const existingIndividualProducts = await IndividualProduct.find({
      order: order._id
    });
    
    if (existingIndividualProducts.length > 0) {
      console.log('ℹ️ Ya existen productos individuales para esta orden:', existingIndividualProducts.length);
      console.log('📋 Estados de productos existentes:');
      const statusCount = {};
      existingIndividualProducts.forEach(ip => {
        statusCount[ip.status] = (statusCount[ip.status] || 0) + 1;
      });
      console.log(statusCount);
      return;
    }
    
    // Crear productos individuales
    console.log('🆕 Creando productos individuales...');
    
    const createdProducts = [];
    for (const item of order.items) {
      console.log(`📦 Procesando item: ${item.product.title} (cantidad: ${item.quantity})`);
      
      for (let i = 0; i < item.quantity; i++) {
        const individualProduct = new IndividualProduct({
          user: payment.user_id,
          order: order._id,
          product: item.product._id,
          individualIndex: i + 1,
          status: 'available',
          unitPrice: item.unit_price,
          payment: {
            mp_payment_id: paymentId,
            status: payment.status
          }
        });
        
        await individualProduct.save();
        createdProducts.push(individualProduct);
        
        console.log(`✅ Creado producto individual ${i + 1}/${item.quantity} para ${item.product.title}`);
      }
    }
    
    console.log('🎉 Productos individuales creados exitosamente!');
    console.log(`📊 Total creados: ${createdProducts.length}`);
    
    // Mostrar resumen
    const productSummary = {};
    for (const item of order.items) {
      productSummary[item.product.title] = item.quantity;
    }
    console.log('📋 Resumen de productos creados:', productSummary);
    
  } catch (error) {
    console.error('❌ Error creando productos individuales:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Obtener el payment ID desde los argumentos de línea de comandos
const paymentId = process.argv[2];

if (!paymentId) {
  console.log('❌ Uso: node create-individual-products-for-existing-payment.js <payment_id>');
  console.log('Ejemplo: node create-individual-products-for-existing-payment.js 117164220669');
  process.exit(1);
}

createIndividualProductsForExistingPayment(paymentId); 