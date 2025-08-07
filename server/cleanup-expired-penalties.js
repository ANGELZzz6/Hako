const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const cleanupExpiredPenalties = async () => {
  try {
    console.log('🧹 Iniciando limpieza de penalizaciones expiradas...');
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`⏰ Fecha límite: ${twentyFourHoursAgo.toLocaleString('es-CO')}`);
    
    // Buscar usuarios con penalizaciones
    const usersWithPenalties = await User.find({
      'reservationPenalties.createdAt': { $lt: twentyFourHoursAgo }
    });
    
    console.log(`🔍 Encontrados ${usersWithPenalties.length} usuarios con penalizaciones potencialmente expiradas`);
    
    let totalCleaned = 0;
    let usersProcessed = 0;
    
    for (const user of usersWithPenalties) {
      const originalCount = user.reservationPenalties.length;
      
      // Filtrar penalizaciones que no han expirado
      user.reservationPenalties = user.reservationPenalties.filter(penalty => {
        const penaltyTime = new Date(penalty.createdAt);
        const hoursSincePenalty = (now.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
        return hoursSincePenalty < 24;
      });
      
      const newCount = user.reservationPenalties.length;
      const cleaned = originalCount - newCount;
      
      if (cleaned > 0) {
        await user.save();
        totalCleaned += cleaned;
        usersProcessed++;
        console.log(`✅ Usuario ${user.email}: ${cleaned} penalizaciones limpiadas`);
      }
    }
    
    console.log(`🎉 Limpieza completada:`);
    console.log(`   - Usuarios procesados: ${usersProcessed}`);
    console.log(`   - Penalizaciones eliminadas: ${totalCleaned}`);
    
    if (totalCleaned === 0) {
      console.log(`✨ No se encontraron penalizaciones expiradas para limpiar`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar la limpieza
cleanupExpiredPenalties(); 