const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const checkDatabaseStatus = async () => {
  try {
    console.log('🔍 Verificando estado de la base de datos...');
    console.log(`📡 URI de conexión: ${process.env.MONGODB_URI}`);
    
    // Conectar a la base de datos HAKO específicamente
    const mongoUri = process.env.MONGODB_URI;
    const uriWithDB = mongoUri.includes('/?') ? mongoUri.replace('/?', '/HAKO?') : mongoUri + '/HAKO';
    
    console.log(`🎯 Conectando a: ${uriWithDB}`);
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conexión establecida a HAKO');
    
    // Obtener información de la base de datos
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📊 Colecciones encontradas: ${collections.length}`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  📋 ${collection.name}: ${count} documentos`);
    }
    
    // Verificar si hay datos en colecciones específicas
    console.log('\n🔍 Verificando colecciones específicas:');
    
    const collectionsToCheck = ['usuarios', 'orders', 'appointments', 'payments', 'productos'];
    
    for (const collectionName of collectionsToCheck) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`  📋 ${collectionName}: ${count} documentos`);
        
        if (count > 0) {
          // Mostrar algunos documentos de ejemplo
          const sampleDocs = await db.collection(collectionName).find().limit(2).toArray();
          console.log(`    📄 Ejemplos:`);
          sampleDocs.forEach((doc, index) => {
            console.log(`      ${index + 1}. ID: ${doc._id}`);
            if (doc.email) console.log(`         Email: ${doc.email}`);
            if (doc.status) console.log(`         Status: ${doc.status}`);
            if (doc.createdAt) console.log(`         Creado: ${doc.createdAt}`);
          });
        }
      } catch (error) {
        console.log(`  ❌ Error al verificar ${collectionName}: ${error.message}`);
      }
    }
    
    // Verificar la conexión
    console.log('\n🔌 Estado de la conexión:');
    console.log(`  - Host: ${mongoose.connection.host}`);
    console.log(`  - Port: ${mongoose.connection.port}`);
    console.log(`  - Database: ${mongoose.connection.name}`);
    console.log(`  - Ready State: ${mongoose.connection.readyState}`);
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar la verificación
checkDatabaseStatus(); 