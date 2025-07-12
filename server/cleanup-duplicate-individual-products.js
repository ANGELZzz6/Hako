const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde el directorio padre
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const IndividualProduct = require('./models/IndividualProduct');
const Payment = require('./models/Payment');
const Order = require('./models/Order');

async function cleanupDuplicateIndividualProducts() {
  try {
    console.log('🧹 Iniciando limpieza de productos individuales duplicados...');
    
    // Verificar si tenemos la URI de MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI no está configurado en las variables de entorno');
      console.log('💡 Asegúrate de que el archivo .env existe y contiene MONGODB_URI');
      return;
    }
    
    // Conectar a la base de datos
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener todos los pagos únicos
    const payments = await Payment.find({}, 'mp_payment_id');
    console.log(`📊 Encontrados ${payments.length} pagos únicos`);
    
    let totalRemoved = 0;
    
    for (const payment of payments) {
      const mpPaymentId = payment.mp_payment_id;
      
      // Buscar productos individuales para este pago
      const individualProducts = await IndividualProduct.find({
        'payment.mp_payment_id': mpPaymentId
      }).populate('order', 'items');
      
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
    
    console.log(`\n🎉 Limpieza completada!`);
    console.log(`📊 Total de productos individuales eliminados: ${totalRemoved}`);
    
    // Mostrar estadísticas finales
    const totalIndividualProducts = await IndividualProduct.countDocuments();
    console.log(`📊 Total de productos individuales restantes: ${totalIndividualProducts}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar la función
cleanupDuplicateIndividualProducts(); 