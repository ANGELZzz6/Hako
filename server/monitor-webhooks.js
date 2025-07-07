const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, { dbName: 'HAKO' })
  .then(() => console.log('✅ Conectado a MongoDB - Base de datos HAKO'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Importar los modelos
const Order = require('./models/Order');

async function monitorWebhooks() {
  try {
    console.log('🔍 Monitoreando webhooks y pedidos...');
    
    // Obtener todos los pedidos ordenados por fecha de creación
    const orders = await Order.find()
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    console.log(`📦 Total de pedidos encontrados: ${orders.length}`);
    
    orders.forEach((order, index) => {
      console.log(`\n--- Pedido ${index + 1} ---`);
      console.log(`ID: ${order._id}`);
      console.log(`Usuario: ${order.user}`);
      console.log(`Estado: ${order.status}`);
      console.log(`External Reference: ${order.external_reference}`);
      console.log(`Total: $${order.total_amount.toLocaleString('es-CO')}`);
      console.log(`Fecha: ${new Date(order.createdAt).toLocaleString('es-CO')}`);
      console.log(`Items (${order.items.length}):`);
      
      const productCounts = {};
      order.items.forEach(item => {
        const productName = item.product.nombre;
        const productId = item.product._id.toString();
        if (!productCounts[productName]) {
          productCounts[productName] = { count: 0, ids: [] };
        }
        productCounts[productName].count++;
        productCounts[productName].ids.push(productId);
      });
      
      Object.entries(productCounts).forEach(([name, data]) => {
        console.log(`  - ${name}: ${data.count} veces (IDs: ${data.ids.join(', ')})`);
        if (data.count > 1) {
          console.log(`    ⚠️  DUPLICADO DETECTADO!`);
        }
      });
      
      if (order.payment) {
        console.log(`Pago MP ID: ${order.payment.mp_payment_id}`);
        console.log(`Estado pago: ${order.payment.status}`);
      }
    });
    
    // Analizar duplicados por external_reference
    const externalRefCounts = {};
    orders.forEach(order => {
      if (!externalRefCounts[order.external_reference]) {
        externalRefCounts[order.external_reference] = 0;
      }
      externalRefCounts[order.external_reference]++;
    });
    
    console.log('\n📊 ANÁLISIS DE EXTERNAL REFERENCES:');
    Object.entries(externalRefCounts).forEach(([ref, count]) => {
      console.log(`  ${ref}: ${count} pedidos`);
      if (count > 1) {
        console.log(`    ⚠️  MÚLTIPLES PEDIDOS CON MISMO EXTERNAL_REFERENCE!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error durante el monitoreo:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar el monitoreo
monitorWebhooks(); 