const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde el directorio padre
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Payment = require('./models/Payment');
const Order = require('./models/Order');

async function checkPayments() {
  try {
    console.log('🔍 Verificando pagos en la base de datos...');
    
    // Verificar si tenemos la URI de MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI no está configurado');
      console.log('💡 URI actual:', mongoUri);
      return;
    }
    
    console.log('🔗 URI de MongoDB:', mongoUri.substring(0, 50) + '...');
    
    // Conectar a la base de datos
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Verificar pagos
    const payments = await Payment.find({});
    console.log(`📊 Pagos encontrados: ${payments.length}`);
    
    if (payments.length > 0) {
      console.log('\n📋 Lista de pagos:');
      payments.forEach((payment, index) => {
        console.log(`${index + 1}. ID: ${payment.mp_payment_id} | Estado: ${payment.status} | Monto: $${payment.amount}`);
      });
    }
    
    // Verificar órdenes
    const orders = await Order.find({});
    console.log(`📊 Órdenes encontradas: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log('\n📋 Lista de órdenes:');
      orders.forEach((order, index) => {
        console.log(`${index + 1}. ID: ${order._id} | Estado: ${order.status} | Total: $${order.total_amount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar la función
checkPayments(); 