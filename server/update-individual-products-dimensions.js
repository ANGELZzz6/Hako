const mongoose = require('mongoose');
require('dotenv').config();

const IndividualProduct = require('./models/IndividualProduct');
const Product = require('./models/Product');

async function updateIndividualProductsDimensions() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los productos individuales que tienen variantes
    const individualProducts = await IndividualProduct.find({
      variants: { $exists: true, $ne: null }
    }).populate('product');

    console.log(`📦 Encontrados ${individualProducts.length} productos individuales con variantes`);

    if (individualProducts.length === 0) {
      console.log('✅ No hay productos individuales con variantes para actualizar');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const individualProduct of individualProducts) {
      try {
        console.log(`\n🔍 Procesando producto individual: ${individualProduct._id}`);
        console.log(`   - Producto: ${individualProduct.product?.nombre || 'N/A'}`);
        console.log(`   - Variantes:`, Object.fromEntries(individualProduct.variants || new Map()));

        // Verificar que el producto base existe y tiene variantes
        if (!individualProduct.product || !individualProduct.product.variants || !individualProduct.product.variants.enabled) {
          console.log(`   ⚠️ Producto base no tiene variantes habilitadas, saltando`);
          continue;
        }

        // Calcular las dimensiones correctas basadas en las variantes
        const selectedVariants = Object.fromEntries(individualProduct.variants || new Map());
        const variantDimensiones = individualProduct.product.getVariantOrProductDimensions(selectedVariants);

        if (variantDimensiones) {
          // Actualizar las dimensiones del producto individual
          individualProduct.dimensiones = variantDimensiones;
          await individualProduct.save();
          
          console.log(`   ✅ Actualizado con dimensiones de variante:`, variantDimensiones);
          updatedCount++;
        } else {
          console.log(`   ℹ️ No se encontraron dimensiones de variante, manteniendo dimensiones base`);
        }

      } catch (error) {
        console.error(`   ❌ Error procesando producto individual ${individualProduct._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   - Productos procesados: ${individualProducts.length}`);
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
updateIndividualProductsDimensions(); 