const { connectDB } = require('./config/db');
const IndividualProduct = require('./models/IndividualProduct');
const Payment = require('./models/Payment');

async function cleanupAllIndividualProducts() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();
    
    console.log('🧹 Iniciando limpieza completa de productos individuales...');
    
    // Contar productos individuales antes de la limpieza
    const totalBefore = await IndividualProduct.countDocuments();
    console.log(`📊 Total de productos individuales antes de la limpieza: ${totalBefore}`);
    
    // Eliminar TODOS los productos individuales
    const deleteResult = await IndividualProduct.deleteMany({});
    
    console.log(`🗑️ Eliminados ${deleteResult.deletedCount} productos individuales`);
    
    // Verificar que se eliminaron todos
    const totalAfter = await IndividualProduct.countDocuments();
    console.log(`📊 Total de productos individuales después de la limpieza: ${totalAfter}`);
    
    if (totalAfter === 0) {
      console.log('✅ Limpieza completada exitosamente. Base de datos limpia.');
    } else {
      console.log('⚠️ Aún quedan productos individuales en la base de datos.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la limpieza
cleanupAllIndividualProducts(); 