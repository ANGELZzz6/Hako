const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const diagnosePenaltyIssue = async () => {
  try {
    console.log('🔍 Diagnóstico de penalizaciones...');
    
    // Buscar usuarios con penalizaciones
    const usersWithPenalties = await User.find({
      'reservationPenalties.0': { $exists: true }
    });
    
    console.log(`📊 Total de usuarios con penalizaciones: ${usersWithPenalties.length}`);
    
    for (const user of usersWithPenalties) {
      console.log(`\n👤 Usuario: ${user.email}`);
      console.log(`📅 Penalizaciones encontradas: ${user.reservationPenalties.length}`);
      
      const currentTime = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log(`⏰ Hora actual: ${currentTime.toLocaleString('es-CO')}`);
      console.log(`📅 Fecha actual: ${today.toLocaleDateString('es-CO')}`);
      
      user.reservationPenalties.forEach((penalty, index) => {
        const penaltyDate = new Date(penalty.date);
        const penaltyTime = new Date(penalty.createdAt);
        const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
        
        console.log(`\n  📋 Penalización #${index + 1}:`);
        console.log(`    📅 Fecha penalizada: ${penaltyDate.toLocaleDateString('es-CO')}`);
        console.log(`    ⏰ Creada: ${penaltyTime.toLocaleString('es-CO')}`);
        console.log(`    ⏱️  Horas transcurridas: ${hoursSincePenalty.toFixed(2)}`);
        console.log(`    🔒 Activa: ${hoursSincePenalty < 24 ? 'SÍ' : 'NO'}`);
        console.log(`    📝 Razón: ${penalty.reason || 'No especificada'}`);
        
        // Verificar si esta penalización bloquearía una reserva para hoy
        const penaltyDateNormalized = new Date(penaltyDate);
        penaltyDateNormalized.setHours(0, 0, 0, 0);
        
        if (penaltyDateNormalized.getTime() === today.getTime()) {
          console.log(`    ⚠️  ESTA PENALIZACIÓN BLOQUEARÍA UNA RESERVA PARA HOY`);
          if (hoursSincePenalty >= 24) {
            console.log(`    ✅ PERO YA EXPIRÓ - NO DEBERÍA BLOQUEAR`);
          } else {
            console.log(`    ❌ SIGUE ACTIVA - BLOQUEARÁ RESERVAS PARA HOY`);
          }
        } else {
          console.log(`    ✅ No afecta reservas para hoy`);
        }
      });
    }
    
    // Simular intento de reserva para hoy
    console.log('\n🧪 Simulando intento de reserva para hoy...');
    const testDate = new Date();
    testDate.setHours(0, 0, 0, 0);
    
    for (const user of usersWithPenalties) {
      console.log(`\n👤 Probando usuario: ${user.email}`);
      
      const currentTime = new Date();
      const penalty = user.reservationPenalties.find(p => {
        const penaltyDate = new Date(p.date);
        penaltyDate.setHours(0, 0, 0, 0);
        const testDateNormalized = new Date(testDate);
        testDateNormalized.setHours(0, 0, 0, 0);
        
        return penaltyDate.getTime() === testDateNormalized.getTime();
      });
      
      if (penalty) {
        const penaltyTime = new Date(penalty.createdAt);
        const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
        
        console.log(`🔍 Penalización encontrada para hoy`);
        console.log(`⏰ Horas transcurridas: ${hoursSincePenalty.toFixed(2)}`);
        
        if (hoursSincePenalty < 24) {
          console.log(`❌ RESULTADO: BLOQUEADO - Penalización activa`);
        } else {
          console.log(`✅ RESULTADO: PERMITIDO - Penalización expirada`);
        }
      } else {
        console.log(`✅ RESULTADO: PERMITIDO - No hay penalización para hoy`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar el diagnóstico
diagnosePenaltyIssue(); 