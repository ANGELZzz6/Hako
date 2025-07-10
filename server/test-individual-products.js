const { connectDB } = require('./config/db');
const IndividualProduct = require('./models/IndividualProduct');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');

async function testIndividualProducts() {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los productos individuales con sus órdenes
    const individualProducts = await IndividualProduct.find({})
      .populate('order', '_id')
      .populate('product', 'nombre')
      .populate('user', 'email');

    console.log(`📊 Productos individuales encontrados: ${individualProducts.length}`);

    // Encontrar productos con órdenes inexistentes
    const orphanedProducts = [];
    const validProducts = [];

    individualProducts.forEach((product) => {
      if (product.order === null && product.order !== undefined) {
        orphanedProducts.push(product);
      } else {
        validProducts.push(product);
      }
    });

    console.log('\n❌ PRODUCTOS HUÉRFANOS (orden eliminada):', orphanedProducts.length);
    orphanedProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ID: ${product._id}`);
      console.log(`     Producto: ${product.product?.nombre}`);
      console.log(`     Usuario: ${product.user?.email}`);
      console.log(`     Order ID: ${product.order}`);
      console.log(`     Status: ${product.status}`);
      console.log('');
    });

    console.log('\n✅ PRODUCTOS VÁLIDOS:', validProducts.length);
    validProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ID: ${product._id}`);
      console.log(`     Producto: ${product.product?.nombre}`);
      console.log(`     Order ID: ${product.order?._id}`);
      console.log(`     Status: ${product.status}`);
    });

    // Estadísticas
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log('Total productos individuales:', individualProducts.length);
    console.log('Productos válidos:', validProducts.length);
    console.log('Productos huérfanos:', orphanedProducts.length);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testIndividualProducts(); 