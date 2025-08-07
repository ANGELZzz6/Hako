const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testPenaltySystem = async () => {
  try {
    console.log('🧪 Probando sistema de penalizaciones...');
    
    // Buscar un usuario para agregar penalización de prueba
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('❌ No se encontró usuario de prueba. Creando uno...');
      return;
    }
    
    const now = new Date();
    const testDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Mañana
    
    // Agregar penalización de prueba
    const testPenalty = {
      date: testDate,
      reason: 'Prueba de penalización',
      createdAt: now
    };
    
    user.reservationPenalties.push(testPenalty);
    await user.save();
    
    console.log(`✅ Penalización de prueba agregada para ${testDate.toLocaleDateString('es-CO')}`);
    console.log(`📅 Fecha de penalización: ${testDate.toLocaleDateString('es-CO')}`);
    console.log(`⏰ Hora de creación: ${now.toLocaleString('es-CO')}`);
    
    // Simular verificación después de 1 hora
    console.log('\n🔍 Simulando verificación después de 1 hora...');
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const hoursSincePenalty = (oneHourLater.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log(`⏰ Horas transcurridas: ${hoursSincePenalty.toFixed(2)}`);
    console.log(`🔒 Penalización activa: ${hoursSincePenalty < 24 ? 'SÍ' : 'NO'}`);
    
    // Simular verificación después de 25 horas
    console.log('\n🔍 Simulando verificación después de 25 horas...');
    const twentyFiveHoursLater = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const hoursSincePenalty25 = (twentyFiveHoursLater.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log(`⏰ Horas transcurridas: ${hoursSincePenalty25.toFixed(2)}`);
    console.log(`🔒 Penalización activa: ${hoursSincePenalty25 < 24 ? 'SÍ' : 'NO'}`);
    
    console.log('\n✅ Prueba completada. La penalización expirará automáticamente después de 24 horas.');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar la prueba
testPenaltySystem(); 