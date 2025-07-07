const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HAKO')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const IndividualProduct = require('./models/IndividualProduct');
const Order = require('./models/Order');
const Payment = require('./models/Payment');

async function checkIndividualProducts() {
  try {
    console.log('🔍 Verificando estado de productos individuales...');
    
    // Contar productos individuales
    const totalIndividualProducts = await IndividualProduct.countDocuments();
    console.log(`📊 Total productos individuales: ${totalIndividualProducts}`);
    
    if (totalIndividualProducts === 0) {
      console.log('❌ No hay productos individuales en la base de datos');
      
      // Verificar si hay órdenes
      const totalOrders = await Order.countDocuments();
      console.log(`📦 Total órdenes: ${totalOrders}`);
      
      // Verificar si hay pagos
      const totalPayments = await Payment.countDocuments();
      console.log(`💳 Total pagos: ${totalPayments}`);
      
      // Mostrar las últimas órdenes
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'nombre email');
      
      console.log('\n📋 Últimas órdenes:');
      recentOrders.forEach(order => {
        console.log(`  - ID: ${order._id}`);
        console.log(`    Usuario: ${order.user?.nombre} (${order.user?.email})`);
        console.log(`    Estado: ${order.status}`);
        console.log(`    Items: ${order.items.length}`);
        console.log(`    Fecha: ${order.createdAt}`);
        console.log('');
      });
      
      // Mostrar los últimos pagos
      const recentPayments = await Payment.find()
        .sort({ date_created: -1 })
        .limit(5)
        .populate('user_id', 'nombre email');
      
      console.log('📋 Últimos pagos:');
      recentPayments.forEach(payment => {
        console.log(`  - ID: ${payment._id}`);
        console.log(`    MP Payment ID: ${payment.mp_payment_id}`);
        console.log(`    Usuario: ${payment.user_id?.nombre} (${payment.user_id?.email})`);
        console.log(`    Estado: ${payment.status}`);
        console.log(`    Monto: ${payment.amount}`);
        console.log(`    Fecha: ${payment.date_created}`);
        console.log('');
      });
      
      return;
    }
    
    // Si hay productos individuales, mostrar estadísticas
    const productsWithDimensions = await IndividualProduct.countDocuments({
      'dimensiones.largo': { $exists: true },
      'dimensiones.ancho': { $exists: true },
      'dimensiones.alto': { $exists: true }
    });
    
    const productsWithoutDimensions = totalIndividualProducts - productsWithDimensions;
    
    console.log(`📏 Productos con dimensiones: ${productsWithDimensions}`);
    console.log(`❌ Productos sin dimensiones: ${productsWithoutDimensions}`);
    
    // Mostrar algunos productos individuales de ejemplo
    const sampleProducts = await IndividualProduct.find()
      .populate('product', 'nombre')
      .populate('user', 'nombre email')
      .limit(3);
    
    console.log('\n📋 Ejemplos de productos individuales:');
    sampleProducts.forEach(product => {
      console.log(`  - ID: ${product._id}`);
      console.log(`    Producto: ${product.product?.nombre}`);
      console.log(`    Usuario: ${product.user?.nombre} (${product.user?.email})`);
      console.log(`    Estado: ${product.status}`);
      console.log(`    Dimensiones: ${product.dimensiones ? 'Sí' : 'No'}`);
      if (product.dimensiones) {
        console.log(`    Volumen: ${product.getVolumen()} cm³`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error verificando productos individuales:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

checkIndividualProducts(); 