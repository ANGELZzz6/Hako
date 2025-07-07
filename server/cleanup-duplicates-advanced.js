const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Conectar a la base de datos con la misma configuración que el servidor
mongoose.connect(process.env.MONGODB_URI, { dbName: 'HAKO' })
  .then(() => console.log('✅ Conectado a MongoDB - Base de datos HAKO'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Importar los modelos necesarios
const Order = require('./models/Order');
const Product = require('./models/Product');

async function cleanupDuplicateItemsAdvanced() {
  try {
    console.log('🧹 Iniciando limpieza avanzada de productos duplicados...');
    
    // Obtener todos los pedidos
    const orders = await Order.find().populate('items.product');
    
    let cleanedOrders = 0;
    let totalDuplicatesRemoved = 0;
    
    for (const order of orders) {
      const originalItems = [...order.items];
      const uniqueItems = [];
      const seenProductIds = new Set();
      const seenProductNames = new Set();
      
      for (const item of order.items) {
        const productId = item.product._id.toString();
        const productName = item.product.nombre.toLowerCase();
        
        // Verificar duplicados por ID y por nombre
        const isDuplicateById = seenProductIds.has(productId);
        const isDuplicateByName = seenProductNames.has(productName);
        
        if (!isDuplicateById && !isDuplicateByName) {
          seenProductIds.add(productId);
          seenProductNames.add(productName);
          uniqueItems.push(item);
        } else {
          // Producto duplicado encontrado
          console.log(`🔍 Duplicado encontrado en pedido ${order._id}: ${item.product.nombre} (ID: ${productId})`);
          if (isDuplicateById) console.log('   - Duplicado por ID');
          if (isDuplicateByName) console.log('   - Duplicado por nombre');
          totalDuplicatesRemoved++;
        }
      }
      
      // Si hay diferencias, actualizar el pedido
      if (uniqueItems.length !== originalItems.length) {
        const newTotal = uniqueItems.reduce((acc, item) => acc + item.total_price, 0);
        
        order.items = uniqueItems;
        order.total_amount = newTotal;
        await order.save();
        
        cleanedOrders++;
        console.log(`✅ Pedido ${order._id} limpiado: ${originalItems.length} → ${uniqueItems.length} items`);
        console.log(`   - Total actualizado: $${order.total_amount.toLocaleString('es-CO')}`);
      }
    }
    
    console.log('\n📊 RESUMEN DE LIMPIEZA AVANZADA:');
    console.log(`📦 Pedidos procesados: ${orders.length}`);
    console.log(`🧹 Pedidos limpiados: ${cleanedOrders}`);
    console.log(`🗑️ Productos duplicados removidos: ${totalDuplicatesRemoved}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar la limpieza
cleanupDuplicateItemsAdvanced(); 