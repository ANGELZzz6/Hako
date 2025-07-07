const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Dimensiones por defecto para productos existentes
const DEFAULT_DIMENSIONS = {
  largo: 20,  // 20 cm
  ancho: 15,  // 15 cm
  alto: 10,   // 10 cm
  peso: 500   // 500 gramos
};

async function addDimensionsToProducts() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los productos que no tienen dimensiones
    const productsWithoutDimensions = await Product.find({
      $or: [
        { dimensiones: { $exists: false } },
        { 'dimensiones.largo': { $exists: false } },
        { 'dimensiones.ancho': { $exists: false } },
        { 'dimensiones.alto': { $exists: false } },
        { 'dimensiones.peso': { $exists: false } }
      ]
    });

    console.log(`📦 Encontrados ${productsWithoutDimensions.length} productos sin dimensiones`);

    if (productsWithoutDimensions.length === 0) {
      console.log('✅ Todos los productos ya tienen dimensiones configuradas');
      return;
    }

    // Actualizar cada producto con dimensiones por defecto
    let updatedCount = 0;
    for (const product of productsWithoutDimensions) {
      try {
        await Product.findByIdAndUpdate(product._id, {
          $set: {
            dimensiones: DEFAULT_DIMENSIONS
          }
        });
        updatedCount++;
        console.log(`✅ Actualizado: ${product.nombre}`);
      } catch (error) {
        console.error(`❌ Error actualizando ${product.nombre}:`, error.message);
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   - Productos procesados: ${productsWithoutDimensions.length}`);
    console.log(`   - Productos actualizados: ${updatedCount}`);
    console.log(`   - Dimensiones por defecto: ${DEFAULT_DIMENSIONS.largo}×${DEFAULT_DIMENSIONS.ancho}×${DEFAULT_DIMENSIONS.alto} cm, ${DEFAULT_DIMENSIONS.peso}g`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
addDimensionsToProducts(); 