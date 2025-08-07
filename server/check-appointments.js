const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const checkAppointments = async () => {
  try {
    console.log('🔍 Verificando citas en HAKO...');
    
    // Conectar a la base de datos HAKO específicamente
    const mongoUri = process.env.MONGODB_URI;
    const uriWithDB = mongoUri.includes('/?') ? mongoUri.replace('/?', '/HAKO?') : mongoUri + '/HAKO';
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a HAKO');
    
    // Buscar todas las citas
    const allAppointments = await Appointment.find({}).populate('user', 'email');
    console.log(`📊 Total de citas en la base de datos: ${allAppointments.length}`);
    
    const currentTime = new Date();
    console.log(`⏰ Hora actual: ${currentTime.toLocaleString('es-CO')}`);
    
    for (const appointment of allAppointments) {
      console.log(`\n📅 Cita ID: ${appointment._id}`);
      console.log(`👤 Usuario: ${appointment.user ? appointment.user.email : 'N/A'}`);
      console.log(`📅 Fecha programada: ${appointment.scheduledDate}`);
      console.log(`⏰ Hora: ${appointment.timeSlot}`);
      console.log(`📦 Casilleros: ${appointment.lockerNumbers ? appointment.lockerNumbers.join(', ') : 'N/A'}`);
      console.log(`📊 Estado: ${appointment.status}`);
      console.log(`📝 Creada: ${appointment.createdAt}`);
      
      // Verificar si la cita está vencida
      const appointmentDate = new Date(appointment.scheduledDate);
      const [hours, minutes] = appointment.timeSlot.split(':');
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const isExpired = appointmentDate < currentTime;
      console.log(`⏰ Vencida: ${isExpired ? 'SÍ' : 'NO'}`);
      
      if (isExpired && appointment.status === 'active') {
        console.log(`⚠️  CITA VENCIDA Y ACTIVA - DEBERÍA GENERAR PENALIZACIÓN`);
      }
    }
    
    // Verificar usuarios específicos
    console.log('\n🔍 Verificando usuarios específicos...');
    const specificEmails = ['poronga@correo.com', 'poro@gmail.com', 'angel@gmail.com'];
    
    for (const email of specificEmails) {
      const user = await User.findOne({ email });
      if (user) {
        console.log(`\n👤 Usuario: ${email}`);
        console.log(`📅 Penalizaciones: ${user.reservationPenalties ? user.reservationPenalties.length : 0}`);
        console.log(`📊 Citas activas: ${await Appointment.countDocuments({ user: user._id, status: 'active' })}`);
        console.log(`📊 Citas vencidas: ${await Appointment.countDocuments({ 
          user: user._id, 
          status: 'active',
          scheduledDate: { $lt: currentTime }
        })}`);
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
checkAppointments(); 