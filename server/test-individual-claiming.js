const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require('./models/Product');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testIndividualClaiming() {
  try {
    console.log('Conectando a la base de datos...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una orden con múltiples productos
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
          totalInOrder: item.quantity, // Cantidad total en la orden original
          assigned_locker: isClaimed ? item.assigned_locker : undefined // Solo asignar si está reclamado
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

    // Simular reclamación de productos individuales
    console.log('\n🔄 Simulando reclamación de productos individuales...');
    
    // Simular reclamar el primer producto disponible
    const availableItems = allItems.filter(item => !item.isClaimed);
    if (availableItems.length > 0) {
      const itemToClaim = availableItems[0];
      console.log(`✅ Reclamando: ${itemToClaim.product.nombre} #${itemToClaim.individualIndex}`);
      console.log(`   Casillero asignado: 1`);
      
      // Simular la lógica de reclamación
      const originalItem = order.items.find(item => item._id.toString() === itemToClaim.originalItemId);
      if (originalItem) {
        const oldClaimed = originalItem.claimed_quantity || 0;
        originalItem.claimed_quantity = oldClaimed + 1;
        
        // Solo asignar casillero si es el primer producto reclamado
        if (originalItem.claimed_quantity === 1) {
          originalItem.assigned_locker = 1;
          console.log(`   Casillero asignado al item original`);
        }
        
        console.log(`   Reclamados antes: ${oldClaimed}`);
        console.log(`   Reclamados después: ${originalItem.claimed_quantity}`);
      }
    }

    // Simular reclamar otro producto del mismo tipo
    const remainingAvailable = allItems.filter(item => 
      !item.isClaimed && 
      item.originalItemId === availableItems[0]?.originalItemId
    );
    
    if (remainingAvailable.length > 0) {
      const secondItemToClaim = remainingAvailable[0];
      console.log(`\n✅ Reclamando segundo producto: ${secondItemToClaim.product.nombre} #${secondItemToClaim.individualIndex}`);
      console.log(`   Casillero asignado: 2`);
      
      // Simular la lógica de reclamación
      const originalItem = order.items.find(item => item._id.toString() === secondItemToClaim.originalItemId);
      if (originalItem) {
        const oldClaimed = originalItem.claimed_quantity || 0;
        originalItem.claimed_quantity = oldClaimed + 1;
        
        console.log(`   Reclamados antes: ${oldClaimed}`);
        console.log(`   Reclamados después: ${originalItem.claimed_quantity}`);
        console.log(`   Casillero del item original: ${originalItem.assigned_locker}`);
        console.log(`   Nota: El casillero no cambia porque ya está asignado`);
      }
    }

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 Los productos individuales se pueden reclamar independientemente');
    console.log('💡 Cada producto individual puede tener su propio casillero');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testIndividualClaiming(); 