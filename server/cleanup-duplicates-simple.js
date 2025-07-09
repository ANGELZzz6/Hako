const { connectDB } = require('./config/db');
const IndividualProduct = require('./models/IndividualProduct');
const Payment = require('./models/Payment');
const Order = require('./models/Order');

async function cleanupDuplicates() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();
    
    console.log('🧹 Iniciando limpieza de productos individuales duplicados...');
    
    // Obtener todos los pagos únicos
    const payments = await Payment.find({}, 'mp_payment_id');
    console.log(`📊 Encontrados ${payments.length} pagos únicos`);
    
    let totalRemoved = 0;
    
    for (const payment of payments) {
      const mpPaymentId = payment.mp_payment_id;
      
      // Buscar productos individuales para este pago
      const individualProducts = await IndividualProduct.find({
        'payment.mp_payment_id': mpPaymentId
      });
      
      if (individualProducts.length > 0) {
        console.log(`\n🔍 Pago ${mpPaymentId}: ${individualProducts.length} productos individuales encontrados`);
        
        // Agrupar por producto y orden
        const groupedProducts = {};
        for (const ip of individualProducts) {
          const key = `${ip.order}_${ip.product}`;
          if (!groupedProducts[key]) {
            groupedProducts[key] = [];
          }
          groupedProducts[key].push(ip);
        }
        
        // Para cada grupo, mantener solo la cantidad correcta
        for (const [key, products] of Object.entries(groupedProducts)) {
          const [orderId, productId] = key.split('_');
          
          // Obtener la orden para saber la cantidad correcta
          const order = await Order.findById(orderId);
          
          if (order) {
            const orderItem = order.items.find(item => item.product.toString() === productId);
            const correctQuantity = orderItem ? orderItem.quantity : 0;
            
            console.log(`  📦 Producto ${productId}: ${products.length} creados, ${correctQuantity} correctos`);
            
            if (products.length > correctQuantity) {
              // Mantener solo los primeros 'correctQuantity' productos
              const productsToKeep = products.slice(0, correctQuantity);
              const productsToRemove = products.slice(correctQuantity);
              
              console.log(`    ✅ Manteniendo: ${productsToKeep.length}`);
              console.log(`    🗑️ Eliminando: ${productsToRemove.length}`);
              
              // Eliminar los duplicados
              const idsToRemove = productsToRemove.map(p => p._id);
              const deleteResult = await IndividualProduct.deleteMany({
                _id: { $in: idsToRemove }
              });
              
              totalRemoved += deleteResult.deletedCount;
            }
          }
        }
      }
    }
    
    console.log(`\n🎉 Limpieza completada! Total de productos individuales eliminados: ${totalRemoved}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la limpieza
cleanupDuplicates(); 