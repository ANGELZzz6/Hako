const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

async function migrateVariantsDimensions() {
  try {
    // Conectar a la base de datos con configuración por defecto si no existe .env
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB:', mongoUri);

    // Obtener todos los productos que tienen variantes habilitadas
    const products = await Product.find({
      'variants.enabled': true
    });

    console.log(`📦 Encontrados ${products.length} productos con variantes habilitadas`);

    if (products.length === 0) {
      console.log('✅ No hay productos con variantes para migrar');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        console.log(`\n🔍 Procesando producto: ${product.nombre}`);
        console.log(`   - ID: ${product._id}`);
        console.log(`   - Atributos: ${product.variants.attributes.length}`);

        let hasChanges = false;

        // Verificar y actualizar cada atributo
        for (const attribute of product.variants.attributes) {
          // Agregar definesDimensions si no existe
          if (attribute.definesDimensions === undefined) {
            attribute.definesDimensions = false;
            hasChanges = true;
            console.log(`   ✅ Agregado definesDimensions=false a atributo "${attribute.name}"`);
          }

          // Verificar y actualizar cada opción
          for (const option of attribute.options) {
            // Agregar dimensiones si no existe
            if (!option.dimensiones) {
              option.dimensiones = {
                largo: 0,
                ancho: 0,
                alto: 0,
                peso: 0
              };
              hasChanges = true;
              console.log(`   ✅ Agregado dimensiones vacías a opción "${option.value}" del atributo "${attribute.name}"`);
            }
          }
        }

        if (hasChanges) {
          await product.save();
          updatedCount++;
          console.log(`   ✅ Producto actualizado`);
        } else {
          console.log(`   ℹ️ Producto ya tiene todos los campos necesarios`);
        }

      } catch (error) {
        console.error(`   ❌ Error procesando producto ${product._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   - Productos procesados: ${products.length}`);
    console.log(`   - Productos actualizados: ${updatedCount}`);
    console.log(`   - Errores: ${errorCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
migrateVariantsDimensions(); 