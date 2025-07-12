const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde el directorio padre
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Payment = require('./models/Payment');

async function deleteAllPayments() {
  try {
    console.log('🗑️ Iniciando eliminación de todos los pagos...');
    
    // Verificar si tenemos la URI de MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI no está configurado en las variables de entorno');
      return;
    }
    
    // Conectar a la base de datos
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Contar pagos antes de eliminar
    const paymentsCount = await Payment.countDocuments();
    console.log(`📊 Pagos encontrados antes de eliminar: ${paymentsCount}`);
    
    if (paymentsCount === 0) {
      console.log('ℹ️ No hay pagos para eliminar');
      return;
    }
    
    // Confirmar eliminación
    console.log('\n⚠️ ADVERTENCIA: Esto eliminará TODOS los pagos de la base de datos');
    console.log('💡 Si estás seguro, el script continuará automáticamente en 5 segundos...');
    
    // Esperar 5 segundos para dar tiempo de cancelar si es necesario
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Eliminar todos los pagos
    const deleteResult = await Payment.deleteMany({});
    
    console.log(`\n✅ Eliminación completada!`);
    console.log(`📊 Pagos eliminados: ${deleteResult.deletedCount}`);
    
    // Verificar que se eliminaron todos
    const remainingPayments = await Payment.countDocuments();
    console.log(`📊 Pagos restantes: ${remainingPayments}`);
    
    if (remainingPayments === 0) {
      console.log('🎉 ¡Todos los pagos han sido eliminados exitosamente!');
    } else {
      console.log('⚠️ Algunos pagos no se eliminaron');
    }
    
  } catch (error) {
    console.error('❌ Error durante la eliminación:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar la función
deleteAllPayments(); 