const mongoose = require('mongoose');
const Order = require('./models/Order');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkOrders() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las órdenes
    const allOrders = await Order.find().populate('items.product user');
    console.log(`📦 Total de órdenes en la base de datos: ${allOrders.length}`);

    // Mostrar detalles de cada orden
    for (const order of allOrders) {
      console.log(`\n🔄 Orden ID: ${order._id}`);
      console.log(`   Usuario: ${order.user?.email || order.user}`);
      console.log(`   Estado: ${order.status}`);
      console.log(`   Fecha: ${order.createdAt}`);
      console.log(`   Total: $${order.total_amount}`);
      console.log(`   Items: ${order.items.length}`);
      
      for (const item of order.items) {
        console.log(`     - ${item.product?.nombre || 'Producto sin nombre'} x${item.quantity} - $${item.unit_price}`);
      }
    }

    // Verificar órdenes por estado
    const paidOrders = await Order.find({ status: 'paid' });
    const readyOrders = await Order.find({ status: 'ready_for_pickup' });
    const pendingOrders = await Order.find({ status: 'pending' });
    
    console.log(`\n📊 Órdenes por estado:`);
    console.log(`   Pagadas: ${paidOrders.length}`);
    console.log(`   Listas para recoger: ${readyOrders.length}`);
    console.log(`   Pendientes: ${pendingOrders.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
checkOrders(); 