const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const testPenaltyExpiration = async () => {
  try {
    console.log('🧪 Verificando expiración de penalización...');
    
    // Conectar a la base de datos HAKO específicamente
    const mongoUri = process.env.MONGODB_URI;
    const uriWithDB = mongoUri.includes('/?') ? mongoUri.replace('/?', '/HAKO?') : mongoUri + '/HAKO';
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a HAKO');
    
    // Buscar el usuario test@testuser.com
    const user = await User.findOne({ email: 'test@testuser.com' });
    if (!user) {
      console.log('❌ No se encontró usuario test@testuser.com');
      return;
    }
    
    console.log(`👤 Usuario: ${user.email}`);
    
    // Buscar todas las reservas del usuario
    const userAppointments = await Appointment.find({ user: user._id });
    console.log(`📊 Total de reservas del usuario: ${userAppointments.length}`);
    
    const currentTime = new Date();
    console.log(`⏰ Hora actual: ${currentTime.toLocaleString('es-CO')}`);
    
    for (const app of userAppointments) {
      console.log(`\n📅 Reserva ID: ${app._id}`);
      console.log(`📅 Fecha: ${app.scheduledDate}`);
      console.log(`⏰ Hora: ${app.timeSlot}`);
      console.log(`📊 Estado: ${app.status}`);
      
      // Calcular si está vencida y cuánto tiempo ha pasado
      const appDateTime = new Date(app.scheduledDate);
      const [h, m] = app.timeSlot.split(':');
      appDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
      
      const isExpired = appDateTime < currentTime;
      const hoursSinceExpiry = isExpired ? (currentTime.getTime() - appDateTime.getTime()) / (1000 * 60 * 60) : 0;
      
      console.log(`⏰ Vencida: ${isExpired ? 'SÍ' : 'NO'}`);
      if (isExpired) {
        console.log(`⏱️  Horas transcurridas: ${hoursSinceExpiry.toFixed(2)}`);
        console.log(`🔒 Penalización activa: ${hoursSinceExpiry < 24 ? 'SÍ' : 'NO'}`);
        
        if (hoursSinceExpiry >= 24) {
          console.log(`✅ Esta reserva vencida YA NO debería bloquear nuevas reservas`);
        } else {
          console.log(`❌ Esta reserva vencida AÚN debería bloquear nuevas reservas`);
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

// Ejecutar la prueba
testPenaltyExpiration(); 