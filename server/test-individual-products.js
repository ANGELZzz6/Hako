const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require('./models/Product');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testIndividualProducts() {
  try {
    console.log('Conectando a la base de datos...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una orden con productos
    const order = await Order.findOne({
      'items.quantity': { $gt: 1 }
    }).populate('items.product');

    if (!order) {
      console.log('❌ No se encontró ninguna orden con múltiples productos');
      return;
    }

    console.log(`📦 Orden encontrada: ${order._id}`);
    console.log(`👤 Usuario: ${order.user}`);
    console.log(`📋 Estado: ${order.status}`);

    // Mostrar productos originales de la orden
    console.log('\n📦 Productos originales en la orden:');
    order.items.forEach((item, index) => {
      const claimed = item.claimed_quantity || 0;
      const available = item.quantity - claimed;
      console.log(`  ${index + 1}. ${item.product.nombre}`);
      console.log(`     Cantidad total: ${item.quantity}`);
      console.log(`     Reclamados: ${claimed}`);
      console.log(`     Disponibles: ${available}`);
      console.log(`     Casillero asignado: ${item.assigned_locker || 'Ninguno'}`);
    });

    // Simular la nueva lógica de productos individuales
    console.log('\n🔄 Simulando productos individuales...');
    
    const allItems = [];
    order.items.forEach(item => {
      const claimedQuantity = item.claimed_quantity || 0;
      
      // Crear un producto individual por cada unidad comprada
      for (let i = 0; i < item.quantity; i++) {
        const isClaimed = i < claimedQuantity;
        
        const itemData = {
          ...item.toObject(),
          orderId: order._id,
          orderCreatedAt: order.createdAt,
          quantity: 1, // Cada producto individual tiene cantidad 1
          remaining_quantity: isClaimed ? 0 : 1, // 1 si no está reclamado, 0 si ya está reclamado
          isClaimed: isClaimed, // Marcar si está reclamado o no
          originalItemId: item._id, // ID del item original
          individualIndex: i + 1, // Índice individual (1, 2, 3, etc.)
          totalInOrder: item.quantity // Cantidad total en la orden original
        };
        
        allItems.push(itemData);
      }
    });

    console.log('\n📦 Productos individuales generados:');
    allItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.product.nombre}`);
      console.log(`     Producto: ${item.individualIndex}/${item.totalInOrder}`);
      console.log(`     Estado: ${item.isClaimed ? 'Reclamado' : 'Disponible'}`);
      console.log(`     Casillero: ${item.assigned_locker || 'Ninguno'}`);
      console.log(`     ID Original: ${item.originalItemId}`);
    });

    // Mostrar estadísticas
    const claimedCount = allItems.filter(item => item.isClaimed).length;
    const availableCount = allItems.filter(item => !item.isClaimed).length;
    
    console.log('\n📊 Estadísticas:');
    console.log(`  Total de productos: ${allItems.length}`);
    console.log(`  Reclamados: ${claimedCount}`);
    console.log(`  Disponibles: ${availableCount}`);

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 Los productos ahora se muestran como individuales');
    console.log('💡 Cada producto individual puede ser seleccionado independientemente');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testIndividualProducts(); 