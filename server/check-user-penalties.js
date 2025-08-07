const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const checkUserPenalties = async () => {
  try {
    console.log('🔍 Verificando usuarios y penalizaciones en HAKO...');
    
    // Conectar a la base de datos HAKO específicamente
    const mongoUri = process.env.MONGODB_URI;
    const uriWithDB = mongoUri.includes('/?') ? mongoUri.replace('/?', '/HAKO?') : mongoUri + '/HAKO';
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a HAKO');
    
    // Buscar todos los usuarios
    const allUsers = await User.find({});
    console.log(`📊 Total de usuarios en la base de datos: ${allUsers.length}`);
    
    let usersWithPenalties = 0;
    
    for (const user of allUsers) {
      console.log(`\n👤 Usuario: ${user.email}`);
      console.log(`📅 Penalizaciones: ${user.reservationPenalties ? user.reservationPenalties.length : 0}`);
      
      if (user.reservationPenalties && user.reservationPenalties.length > 0) {
        usersWithPenalties++;
        console.log(`📋 Detalles de penalizaciones:`);
        
        user.reservationPenalties.forEach((penalty, index) => {
          console.log(`  Penalización #${index + 1}:`);
          console.log(`    - date: ${penalty.date}`);
          console.log(`    - createdAt: ${penalty.createdAt}`);
          console.log(`    - reason: ${penalty.reason || 'No especificada'}`);
          
          // Calcular si la penalización está activa
          const currentTime = new Date();
          const penaltyTime = new Date(penalty.createdAt);
          const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
          
          console.log(`    - Horas transcurridas: ${hoursSincePenalty.toFixed(2)}`);
          console.log(`    - Activa: ${hoursSincePenalty < 24 ? 'SÍ' : 'NO'}`);
        });
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   - Total usuarios: ${allUsers.length}`);
    console.log(`   - Usuarios con penalizaciones: ${usersWithPenalties}`);
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar la verificación
checkUserPenalties(); 