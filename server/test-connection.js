const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔌 Intentando conectar a MongoDB...');
    
    // Intentar conectar con timeout
    await mongoose.connect('mongodb://localhost:27017/hako', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    console.log('✅ Conectado exitosamente a MongoDB');
    
    // Probar una consulta simple
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    console.log(`📦 Total de productos en la base de datos: ${count}`);
    
    // Buscar productos con variantes
    const productsWithVariants = await Product.find({
      'variants.enabled': true
    });
    
    console.log(`🔧 Productos con variantes habilitadas: ${productsWithVariants.length}`);
    
    if (productsWithVariants.length > 0) {
      console.log('\n📋 Productos encontrados:');
      productsWithVariants.forEach((product, index) => {
        console.log(`${index + 1}. ${product.nombre} (ID: ${product._id})`);
        console.log(`   - Atributos: ${product.variants.attributes.length}`);
        product.variants.attributes.forEach((attr, attrIndex) => {
          console.log(`     • ${attr.name}: ${attr.options.length} opciones`);
          if (attr.definesDimensions !== undefined) {
            console.log(`       - definesDimensions: ${attr.definesDimensions}`);
          } else {
            console.log(`       - definesDimensions: NO DEFINIDO`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 Asegúrate de que MongoDB esté ejecutándose en localhost:27017');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

testConnection(); 