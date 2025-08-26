const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const User = require('./models/User');

async function cleanupExpiredPenalties() {
  try {
    console.log('🧹 Iniciando limpieza automática de penalizaciones expiradas...');
    console.log(`⏰ ${new Date().toLocaleString('es-CO')}`);
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`📅 Fecha límite para penalizaciones: ${twentyFourHoursAgo.toLocaleString('es-CO')}`);
    
    // Buscar usuarios con penalizaciones expiradas
    const usersWithExpiredPenalties = await User.find({
      'reservationPenalties.createdAt': { $lt: twentyFourHoursAgo }
    });
    
    console.log(`📊 Encontrados ${usersWithExpiredPenalties.length} usuarios con penalizaciones expiradas`);
    
    if (usersWithExpiredPenalties.length === 0) {
      console.log('✅ No hay penalizaciones expiradas para limpiar');
      return;
    }
    
    let totalCleaned = 0;
    let errorCount = 0;
    
    for (const user of usersWithExpiredPenalties) {
      try {
        const originalCount = user.reservationPenalties.length;
        
        // Filtrar penalizaciones que no han expirado
        user.reservationPenalties = user.reservationPenalties.filter(penalty => {
          const penaltyTime = new Date(penalty.createdAt);
          return penaltyTime >= twentyFourHoursAgo;
        });
        
        const newCount = user.reservationPenalties.length;
        const cleaned = originalCount - newCount;
        
        if (cleaned > 0) {
          await user.save();
          totalCleaned += cleaned;
          console.log(`✅ Usuario ${user.email}: ${cleaned} penalizaciones expiradas limpiadas`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error limpiando penalizaciones del usuario ${user.email}:`, error.message);
      }
    }
    
    console.log(`🎉 Limpieza completada:`);
    console.log(`  - Total procesados: ${usersWithExpiredPenalties.length}`);
    console.log(`  - Penalizaciones limpiadas: ${totalCleaned}`);
    console.log(`  - Errores: ${errorCount}`);
    
    // Mostrar estadísticas finales
    const totalUsers = await User.countDocuments();
    const usersWithActivePenalties = await User.countDocuments({
      'reservationPenalties.createdAt': { $gte: twentyFourHoursAgo }
    });
    
    console.log(`📊 Estadísticas finales:`);
    console.log(`  - Total de usuarios: ${totalUsers}`);
    console.log(`  - Usuarios con penalizaciones activas: ${usersWithActivePenalties}`);
    console.log(`  - Usuarios sin penalizaciones: ${totalUsers - usersWithActivePenalties}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
}

// Ejecutar la limpieza
cleanupExpiredPenalties(); 