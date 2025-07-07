require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    try {
      // Obtener todas las colecciones
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('📚 Colecciones encontradas:');
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
      
      // Buscar colecciones que puedan contener pedidos
      const possibleOrderCollections = collections.filter(col => 
        col.name.toLowerCase().includes('order') || 
        col.name.toLowerCase().includes('pedido') ||
        col.name.toLowerCase().includes('compra')
      );
      
      if (possibleOrderCollections.length > 0) {
        console.log('\n🔍 Posibles colecciones de pedidos:');
        possibleOrderCollections.forEach(col => {
          console.log(`  - ${col.name}`);
        });
      }
      
      // Verificar si existe la colección 'orders'
      const ordersCollection = collections.find(col => col.name === 'orders');
      if (ordersCollection) {
        console.log('\n📦 Colección "orders" encontrada');
        const count = await mongoose.connection.db.collection('orders').countDocuments();
        console.log(`   Documentos en orders: ${count}`);
        
        if (count > 0) {
          const sample = await mongoose.connection.db.collection('orders').findOne();
          console.log('   Muestra del primer documento:');
          console.log('   - ID:', sample._id);
          console.log('   - Campos:', Object.keys(sample));
        }
      } else {
        console.log('\n❌ Colección "orders" NO encontrada');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      mongoose.connection.close();
      console.log('🔌 Conexión cerrada');
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
  }); 