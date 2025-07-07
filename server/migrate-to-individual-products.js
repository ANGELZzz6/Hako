const mongoose = require('mongoose');
const Order = require('./models/Order');
const IndividualProduct = require('./models/IndividualProduct');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrateToIndividualProducts() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las órdenes pagadas
    const orders = await Order.find({ 
      status: { $in: ['paid', 'ready_for_pickup'] }
    }).populate('items.product');

    console.log(`📦 Encontradas ${orders.length} órdenes para migrar`);

    for (const order of orders) {
      console.log(`\n🔄 Procesando orden: ${order._id}`);
      
      for (const item of order.items) {
        console.log(`  📦 Producto: ${item.product.nombre} (${item.quantity} unidades)`);
        
        // Crear un producto individual por cada unidad
        for (let i = 0; i < item.quantity; i++) {
          const individualIndex = i + 1;
          
          // Determinar el estado basado en si ya está reclamado
          let status = 'available';
          let assignedLocker = undefined;
          
          if (item.claimed_quantity && individualIndex <= item.claimed_quantity) {
            status = 'claimed';
            assignedLocker = item.assigned_locker;
          }
          
          // Crear el producto individual
          const individualProduct = new IndividualProduct({
            user: order.user,
            order: order._id,
            product: item.product._id,
            individualIndex: individualIndex,
            status: status,
            assignedLocker: assignedLocker,
            unitPrice: item.unit_price
          });
          
          await individualProduct.save();
          console.log(`    ✅ Creado producto individual ${individualIndex}/${item.quantity} - Estado: ${status}`);
        }
      }
    }

    console.log('\n🎉 Migración completada exitosamente');
    
    // Mostrar estadísticas
    const totalIndividualProducts = await IndividualProduct.countDocuments();
    console.log(`📊 Total de productos individuales creados: ${totalIndividualProducts}`);
    
    const availableProducts = await IndividualProduct.countDocuments({ status: 'available' });
    const claimedProducts = await IndividualProduct.countDocuments({ status: 'claimed' });
    
    console.log(`📊 Productos disponibles: ${availableProducts}`);
    console.log(`📊 Productos reclamados: ${claimedProducts}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la migración si se llama directamente
if (require.main === module) {
  migrateToIndividualProducts();
}

module.exports = migrateToIndividualProducts; 