const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const IndividualProduct = require('./models/IndividualProduct');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const testReservationCreation = async () => {
  try {
    console.log('🧪 Probando creación de reserva...');
    
    // Conectar a la base de datos HAKO específicamente
    const mongoUri = process.env.MONGODB_URI;
    const uriWithDB = mongoUri.includes('/?') ? mongoUri.replace('/?', '/HAKO?') : mongoUri + '/HAKO';
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a HAKO');
    
    // Buscar un usuario para la prueba
    const user = await User.findOne({ email: 'test@testuser.com' });
    if (!user) {
      console.log('❌ No se encontró usuario test@testuser.com');
      return;
    }
    
    console.log(`👤 Usuario de prueba: ${user.email}`);
    console.log(`📅 Penalizaciones: ${user.reservationPenalties ? user.reservationPenalties.length : 0}`);
    
    // Buscar una orden disponible
    const order = await Order.findOne({ 
      user: user._id,
      status: { $in: ['paid', 'ready_for_pickup'] }
    });
    
    if (!order) {
      console.log('❌ No se encontró orden disponible para el usuario');
      return;
    }
    
    console.log(`📦 Orden encontrada: ${order._id} (${order.status})`);
    
    // Buscar productos individuales disponibles
    const individualProducts = await IndividualProduct.find({
      user: user._id,
      status: 'available'
    });
    
    console.log(`📦 Productos individuales disponibles: ${individualProducts.length}`);
    
    // Simular fecha de reserva para hoy
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    console.log(`📅 Intentando reservar para: ${tomorrow.toLocaleDateString('es-CO')}`);
    console.log(`⏰ Hora actual: ${today.toLocaleString('es-CO')}`);
    
    // Verificar penalizaciones (simular la lógica del controlador)
    if (user.reservationPenalties) {
      const currentTime = new Date();
      const penalty = user.reservationPenalties.find(p => {
        const penaltyDate = new Date(p.date);
        penaltyDate.setHours(0, 0, 0, 0);
        const selectedDateNormalized = new Date(tomorrow);
        selectedDateNormalized.setHours(0, 0, 0, 0);
        
        // Solo aplicar penalización si es el mismo día y no han pasado 24 horas
        if (penaltyDate.getTime() === selectedDateNormalized.getTime()) {
          const penaltyTime = new Date(p.createdAt);
          const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
          
          console.log(`🔍 Penalización encontrada para ${tomorrow.toLocaleDateString('es-CO')}`);
          console.log(`⏰ Horas transcurridas desde penalización: ${hoursSincePenalty.toFixed(2)}`);
          
          // Si han pasado menos de 24 horas, aplicar penalización
          if (hoursSincePenalty < 24) {
            console.log(`❌ Penalización activa - No se puede reservar para este día`);
            return true;
          } else {
            console.log(`✅ Penalización expirada - Se puede reservar para este día`);
            return false;
          }
        }
        return false;
      });
      
      if (penalty) {
        console.log(`❌ RESULTADO: BLOQUEADO por penalización`);
        return;
      }
    }
    
    // Verificar otras validaciones
    if (tomorrow < today) {
      console.log(`❌ RESULTADO: BLOQUEADO - Fecha en el pasado`);
      return;
    }
    
    // Verificar anticipación mínima
    const appointmentDateTime = new Date(tomorrow);
    appointmentDateTime.setHours(10, 0, 0, 0); // 10:00 AM
    
    const timeDifference = appointmentDateTime.getTime() - today.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    console.log(`⏰ Diferencia de tiempo: ${hoursDifference.toFixed(2)} horas`);
    
    if (hoursDifference < 1) {
      console.log(`❌ RESULTADO: BLOQUEADO - Menos de 1 hora de anticipación`);
      return;
    }
    
    console.log(`✅ RESULTADO: PERMITIDO - Todas las validaciones pasaron`);
    console.log(`📅 Se puede crear reserva para ${tomorrow.toLocaleDateString('es-CO')} a las 10:00`);
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
};

// Ejecutar la prueba
testReservationCreation(); 