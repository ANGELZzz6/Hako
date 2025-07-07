const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Conectar a la base de datos con la misma configuración que el servidor
mongoose.connect(process.env.MONGODB_URI, { dbName: 'HAKO' })
  .then(() => console.log('✅ Conectado a MongoDB - Base de datos HAKO'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Importar los modelos necesarios
const Order = require('./models/Order');
const Product = require('./models/Product'); // Necesario para el populate

async function cleanupDuplicateItems() {
  try {
    console.log('🧹 Iniciando limpieza de productos duplicados...');
    
    // Obtener todos los pedidos
    const orders = await Order.find().populate('items.product');
    
    let cleanedOrders = 0;
    let totalDuplicatesRemoved = 0;
    
    for (const order of orders) {
      const originalItems = [...order.items];
      const uniqueItems = [];
      const seenProducts = new Set();
      
      for (const item of order.items) {
        const productId = item.product._id.toString();
        
        if (!seenProducts.has(productId)) {
          seenProducts.add(productId);
          uniqueItems.push(item);
        } else {
          // Producto duplicado encontrado
          console.log(`🔍 Duplicado encontrado en pedido ${order._id}: ${item.product.nombre}`);
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
      }
    }
    
    console.log('\n📊 RESUMEN DE LIMPIEZA:');
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
cleanupDuplicateItems(); 