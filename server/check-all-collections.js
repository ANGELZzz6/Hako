const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde el directorio padre
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkAllCollections() {
  try {
    console.log('🔍 Verificando todas las colecciones en la base de datos...');
    
    // Verificar si tenemos la URI de MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI no está configurado');
      return;
    }
    
    console.log('🔗 URI de MongoDB:', mongoUri.substring(0, 50) + '...');
    
    // Conectar a la base de datos
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener todas las colecciones
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Colecciones encontradas: ${collections.length}`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n📋 Colección: ${collectionName}`);
      
      // Contar documentos en cada colección
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      console.log(`   📊 Documentos: ${count}`);
      
      // Si es la colección de pagos, mostrar algunos ejemplos
      if (collectionName === 'payments' && count > 0) {
        console.log('   🔍 Mostrando algunos pagos:');
        const payments = await mongoose.connection.db.collection(collectionName).find({}).limit(3).toArray();
        payments.forEach((payment, index) => {
          console.log(`     ${index + 1}. ID: ${payment._id} | MP ID: ${payment.mp_payment_id} | Estado: ${payment.status}`);
        });
      }
      
      // Si es la colección de órdenes, mostrar algunos ejemplos
      if (collectionName === 'orders' && count > 0) {
        console.log('   🔍 Mostrando algunas órdenes:');
        const orders = await mongoose.connection.db.collection(collectionName).find({}).limit(3).toArray();
        orders.forEach((order, index) => {
          console.log(`     ${index + 1}. ID: ${order._id} | Estado: ${order.status} | Total: $${order.total_amount}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar la función
checkAllCollections(); 