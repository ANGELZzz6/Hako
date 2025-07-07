const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require('./models/Product');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testSeparatedProducts() {
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

    // Simular reclamación de algunos productos
    console.log('\n🔄 Simulando reclamación de productos...');
    
    // Reclamar 1 producto del primer item si tiene más de 1
    if (order.items[0] && order.items[0].quantity > 1) {
      order.items[0].claimed_quantity = 1;
      order.items[0].assigned_locker = 1;
      console.log(`✅ Reclamado 1 ${order.items[0].product.nombre} al casillero 1`);
    }

    // Reclamar 2 productos del segundo item si tiene más de 2
    if (order.items[1] && order.items[1].quantity > 2) {
      order.items[1].claimed_quantity = 2;
      order.items[1].assigned_locker = 2;
      console.log(`✅ Reclamados 2 ${order.items[1].product.nombre} al casillero 2`);
    }

    await order.save();
    console.log('💾 Orden actualizada en la base de datos');

    // Ahora simular la llamada a getMyPurchasedProducts
    console.log('\n📋 Simulando getMyPurchasedProducts...');
    
    const orders = await Order.find({ 
      user: order.user,
      status: { $in: ['paid', 'ready_for_pickup'] }
    }).populate('items.product');

    const allItems = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        const claimedQuantity = item.claimed_quantity || 0;
        const remainingQuantity = item.quantity - claimedQuantity;
        
        // Si hay productos reclamados, crear un item separado para ellos
        if (claimedQuantity > 0) {
          const claimedItemData = item.toObject();
          
          if (claimedItemData.product) {
            claimedItemData.product.tieneDimensiones = item.product.tieneDimensiones();
            claimedItemData.product.volumen = item.product.getVolumen();
          }
          
          allItems.push({
            ...claimedItemData,
            orderId: order._id,
            orderCreatedAt: order.createdAt,
            quantity: claimedQuantity,
            remaining_quantity: 0,
            isClaimed: true,
            originalItemId: item._id
          });
        }
        
        // Si hay productos no reclamados, crear un item separado para ellos
        if (remainingQuantity > 0) {
          const unclaimedItemData = item.toObject();
          
          if (unclaimedItemData.product) {
            unclaimedItemData.product.tieneDimensiones = item.product.tieneDimensiones();
            unclaimedItemData.product.volumen = item.product.getVolumen();
          }
          
          allItems.push({
            ...unclaimedItemData,
            orderId: order._id,
            orderCreatedAt: order.createdAt,
            quantity: remainingQuantity,
            remaining_quantity: remainingQuantity,
            isClaimed: false,
            originalItemId: item._id
          });
        }
      });
    });

    console.log('\n📦 Productos separados:');
    allItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.product.nombre}`);
      console.log(`     Cantidad: ${item.quantity}`);
      console.log(`     Estado: ${item.isClaimed ? 'Reclamado' : 'Disponible'}`);
      console.log(`     Casillero: ${item.assigned_locker || 'Ninguno'}`);
      console.log(`     ID Original: ${item.originalItemId}`);
    });

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 Los productos ahora se muestran separados por estado');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testSeparatedProducts(); 