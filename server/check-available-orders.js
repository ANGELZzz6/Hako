const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const checkAvailableOrders = async () => {
  try {
    console.log('🔍 Verificando órdenes disponibles...');
    
    // Conectar a la base de datos HAKO específicamente
    const mongoUri = process.env.MONGODB_URI;
    const uriWithDB = mongoUri.includes('/?') ? mongoUri.replace('/?', '/HAKO?') : mongoUri + '/HAKO';
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a HAKO');
    
    // Buscar todas las órdenes con status paid o ready_for_pickup
    const availableOrders = await Order.find({
      status: { $in: ['paid', 'ready_for_pickup'] }
    }).populate('user', 'email');
    
    console.log(`📊 Total de órdenes disponibles: ${availableOrders.length}`);
    
    for (const order of availableOrders) {
      console.log(`\n📦 Orden ID: ${order._id}`);
      console.log(`👤 Usuario: ${order.user ? order.user.email : 'N/A'}`);
      console.log(`📊 Estado: ${order.status}`);
      console.log(`📅 Creada: ${order.createdAt}`);
      console.log(`💰 Total: $${order.total}`);
    }
    
    // Verificar usuarios específicos
    console.log('\n🔍 Verificando usuarios específicos...');
    const specificEmails = ['poronga@correo.com', 'poro@gmail.com', 'angel@gmail.com', 'test@testuser.com'];
    
    for (const email of specificEmails) {
      const user = await User.findOne({ email });
      if (user) {
        const userOrders = await Order.find({ 
          user: user._id,
          status: { $in: ['paid', 'ready_for_pickup'] }
        });
        
        console.log(`\n👤 Usuario: ${email}`);
        console.log(`📦 Órdenes disponibles: ${userOrders.length}`);
        
        if (userOrders.length > 0) {
          console.log(`   📋 Órdenes:`);
          userOrders.forEach((order, index) => {
            console.log(`     ${index + 1}. ID: ${order._id} (${order.status}) - $${order.total}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar la verificación
checkAvailableOrders(); 