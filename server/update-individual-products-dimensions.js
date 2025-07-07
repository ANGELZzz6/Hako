const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HAKO')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const IndividualProduct = require('./models/IndividualProduct');
const Product = require('./models/Product');

async function updateIndividualProductsDimensions() {
  try {
    console.log('🔍 Actualizando dimensiones de productos individuales...');
    
    // Obtener todos los productos individuales que no tienen dimensiones
    const individualProducts = await IndividualProduct.find({
      $or: [
        { dimensiones: { $exists: false } },
        { 'dimensiones.largo': { $exists: false } },
        { 'dimensiones.ancho': { $exists: false } },
        { 'dimensiones.alto': { $exists: false } }
      ]
    });
    
    console.log(`📊 Productos individuales sin dimensiones encontrados: ${individualProducts.length}`);
    
    if (individualProducts.length === 0) {
      console.log('✅ Todos los productos individuales ya tienen dimensiones');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const individualProduct of individualProducts) {
      try {
        // Obtener el producto original
        const originalProduct = await Product.findById(individualProduct.product);
        
        if (!originalProduct) {
          console.log(`⚠️ Producto original no encontrado para individualProduct: ${individualProduct._id}`);
          errorCount++;
          continue;
        }
        
        // Verificar si el producto original tiene dimensiones
        if (!originalProduct.dimensiones || 
            !originalProduct.dimensiones.largo || 
            !originalProduct.dimensiones.ancho || 
            !originalProduct.dimensiones.alto) {
          console.log(`⚠️ Producto original no tiene dimensiones: ${originalProduct.nombre}`);
          errorCount++;
          continue;
        }
        
        // Actualizar el producto individual con las dimensiones
        individualProduct.dimensiones = originalProduct.dimensiones;
        await individualProduct.save();
        
        updatedCount++;
        console.log(`✅ Actualizado producto individual ${individualProduct._id} con dimensiones de ${originalProduct.nombre}`);
        
      } catch (error) {
        console.error(`❌ Error actualizando producto individual ${individualProduct._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Resumen de actualización:');
    console.log(`✅ Productos actualizados: ${updatedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total procesados: ${individualProducts.length}`);
    
    // Verificar el resultado
    const productsWithDimensions = await IndividualProduct.countDocuments({
      'dimensiones.largo': { $exists: true },
      'dimensiones.ancho': { $exists: true },
      'dimensiones.alto': { $exists: true }
    });
    
    const totalProducts = await IndividualProduct.countDocuments();
    
    console.log(`\n📈 Estadísticas finales:`);
    console.log(`📦 Total productos individuales: ${totalProducts}`);
    console.log(`📏 Productos con dimensiones: ${productsWithDimensions}`);
    console.log(`❌ Productos sin dimensiones: ${totalProducts - productsWithDimensions}`);
    
  } catch (error) {
    console.error('❌ Error en actualización:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

updateIndividualProductsDimensions(); 