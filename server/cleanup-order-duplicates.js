const { connectDB } = require('./config/db');
const Order = require('./models/Order');
const Product = require('./models/Product');

async function cleanupOrderDuplicates() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();
    
    console.log('🧹 Iniciando limpieza de productos duplicados en órdenes...');
    
    // Obtener todas las órdenes
    const orders = await Order.find().populate('items.product');
    console.log(`📊 Encontradas ${orders.length} órdenes`);
    
    let cleanedOrders = 0;
    let totalDuplicatesRemoved = 0;
    
    for (const order of orders) {
      console.log(`\n🔍 Procesando orden: ${order._id}`);
      console.log(`   Usuario: ${order.user}`);
      console.log(`   Estado: ${order.status}`);
      console.log(`   Items originales: ${order.items.length}`);
      
      // Agrupar items por producto
      const groupedItems = {};
      for (const item of order.items) {
        const productId = item.product._id.toString();
        if (!groupedItems[productId]) {
          groupedItems[productId] = [];
        }
        groupedItems[productId].push(item);
      }
      
      // Consolidar items duplicados
      const consolidatedItems = [];
      let duplicatesInOrder = 0;
      
      for (const [productId, items] of Object.entries(groupedItems)) {
        if (items.length > 1) {
          console.log(`   ⚠️ Producto duplicado: ${items[0].product.nombre} (${items.length} veces)`);
          
          // Sumar cantidades y precios
          const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
          const unitPrice = items[0].unit_price; // Usar el precio unitario del primer item
          const totalPrice = unitPrice * totalQuantity;
          
          // Crear item consolidado
          const consolidatedItem = {
            product: items[0].product._id,
            quantity: totalQuantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            claimed_quantity: items.reduce((sum, item) => sum + (item.claimed_quantity || 0), 0),
            assigned_locker: items.find(item => item.assigned_locker)?.assigned_locker
          };
          
          consolidatedItems.push(consolidatedItem);
          duplicatesInOrder += items.length - 1;
          
          console.log(`   ✅ Consolidado: ${totalQuantity} unidades por $${unitPrice} = $${totalPrice}`);
        } else {
          // Item único, mantenerlo tal como está
          consolidatedItems.push(items[0]);
        }
      }
      
      // Si hay duplicados, actualizar la orden
      if (duplicatesInOrder > 0) {
        const newTotal = consolidatedItems.reduce((acc, item) => acc + item.total_price, 0);
        
        order.items = consolidatedItems;
        order.total_amount = newTotal;
        await order.save();
        
        cleanedOrders++;
        totalDuplicatesRemoved += duplicatesInOrder;
        
        console.log(`   ✅ Orden limpiada: ${order.items.length} → ${consolidatedItems.length} items`);
        console.log(`   💰 Total actualizado: $${newTotal.toLocaleString('es-CO')}`);
      } else {
        console.log(`   ℹ️ Sin duplicados`);
      }
    }
    
    console.log(`\n🎉 LIMPIEZA COMPLETADA:`);
    console.log(`📦 Órdenes procesadas: ${orders.length}`);
    console.log(`🧹 Órdenes limpiadas: ${cleanedOrders}`);
    console.log(`🗑️ Productos duplicados removidos: ${totalDuplicatesRemoved}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la limpieza
cleanupOrderDuplicates(); 