const mongoose = require('mongoose');
const Order = require('./models/Order');
const IndividualProduct = require('./models/IndividualProduct');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function createIndividualProductsForExistingOrders() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las órdenes pagadas
    const orders = await Order.find({ 
      status: { $in: ['paid', 'ready_for_pickup'] }
    }).populate('items.product');

    console.log(`📦 Encontradas ${orders.length} órdenes para procesar`);

    for (const order of orders) {
      console.log(`\n🔄 Procesando orden: ${order._id}`);
      
      // Verificar si ya existen productos individuales para esta orden
      const existingIndividualProducts = await IndividualProduct.find({ order: order._id });
      
      if (existingIndividualProducts.length > 0) {
        console.log(`  ⏭️  Ya existen ${existingIndividualProducts.length} productos individuales para esta orden`);
        continue;
      }
      
      console.log(`  📦 Creando productos individuales para ${order.items.length} items`);
      
      for (const item of order.items) {
        console.log(`    📦 Producto: ${item.product.nombre} (${item.quantity} unidades)`);
        
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
          console.log(`      ✅ Creado producto individual ${individualIndex}/${item.quantity} - Estado: ${status}`);
        }
      }
    }

    console.log('\n🎉 Proceso completado exitosamente');
    
    // Mostrar estadísticas
    const totalIndividualProducts = await IndividualProduct.countDocuments();
    console.log(`📊 Total de productos individuales en la base de datos: ${totalIndividualProducts}`);
    
    const availableProducts = await IndividualProduct.countDocuments({ status: 'available' });
    const claimedProducts = await IndividualProduct.countDocuments({ status: 'claimed' });
    const reservedProducts = await IndividualProduct.countDocuments({ status: 'reserved' });
    
    console.log(`📊 Productos disponibles: ${availableProducts}`);
    console.log(`📊 Productos reclamados: ${claimedProducts}`);
    console.log(`📊 Productos reservados: ${reservedProducts}`);

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
  createIndividualProductsForExistingOrders();
}

module.exports = createIndividualProductsForExistingOrders; 