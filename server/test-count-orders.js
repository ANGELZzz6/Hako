require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Order = require('./models/Order');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    try {
      const count = await Order.countDocuments();
      console.log('📦 Pedidos encontrados:', count);
      
      if (count > 0) {
        const sampleOrder = await Order.findOne().populate('items.product');
        console.log('🔍 Muestra del primer pedido:');
        console.log('- ID:', sampleOrder._id);
        console.log('- Usuario:', sampleOrder.user);
        console.log('- Items:', sampleOrder.items.length);
        console.log('- Total:', sampleOrder.total_amount);
        console.log('- Estado:', sampleOrder.status);
        
        if (sampleOrder.items.length > 0) {
          console.log('📋 Productos en el pedido:');
          sampleOrder.items.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.product.nombre} - Cantidad: ${item.quantity}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      mongoose.connection.close();
      console.log('🔌 Conexión cerrada');
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
  }); 