const { connectDB } = require('./config/db');
const IndividualProduct = require('./models/IndividualProduct');
const Payment = require('./models/Payment');
const Order = require('./models/Order');
const User = require('./models/User');

async function checkIndividualProducts() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();
    
    console.log('🔍 Verificando productos individuales...');
    
    // Contar productos individuales
    const totalCount = await IndividualProduct.countDocuments();
    console.log(`📊 Total de productos individuales: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('ℹ️ No hay productos individuales en la base de datos');
      return;
    }
    
    // Obtener todos los productos individuales con información relacionada
    const individualProducts = await IndividualProduct.find()
      .populate('user', 'nombre email')
      .populate('product', 'nombre title')
      .populate('order', 'status total_amount')
      .sort({ createdAt: -1 });
    
    console.log('\n📦 Productos individuales encontrados:');
    
    // Agrupar por pago
    const groupedByPayment = {};
    for (const ip of individualProducts) {
      const paymentId = ip.payment?.mp_payment_id || 'Sin pago';
      if (!groupedByPayment[paymentId]) {
        groupedByPayment[paymentId] = [];
      }
      groupedByPayment[paymentId].push(ip);
    }
    
    for (const [paymentId, products] of Object.entries(groupedByPayment)) {
      console.log(`\n💳 Pago: ${paymentId}`);
      console.log(`   Productos: ${products.length}`);
      
      // Agrupar por producto
      const groupedByProduct = {};
      for (const ip of products) {
        const productName = ip.product?.nombre || ip.product?.title || 'Producto desconocido';
        if (!groupedByProduct[productName]) {
          groupedByProduct[productName] = [];
        }
        groupedByProduct[productName].push(ip);
      }
      
      for (const [productName, productItems] of Object.entries(groupedByProduct)) {
        console.log(`   📦 ${productName}: ${productItems.length} unidades`);
        console.log(`      Estado: ${productItems[0].status}`);
        console.log(`      Usuario: ${productItems[0].user?.nombre || productItems[0].user?.email || 'N/A'}`);
        console.log(`      Orden: ${productItems[0].order?._id || 'N/A'}`);
      }
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la verificación
checkIndividualProducts(); 