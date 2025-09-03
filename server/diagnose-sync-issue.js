const mongoose = require('mongoose');

async function diagnoseSyncIssue() {
  try {
    console.log('🔍 Diagnosticando problema de sincronización...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    const Appointment = require('./models/Appointment');
    const LockerAssignment = require('./models/LockerAssignment');

    // Obtener citas recientes
    const appointments = await Appointment.find({})
      .populate('user', 'nombre email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Obtener asignaciones recientes
    const assignments = await LockerAssignment.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    console.log('\n📊 ESTADO ACTUAL:');
    console.log(`📅 Appointments encontradas: ${appointments.length}`);
    console.log(`📦 Locker Assignments encontradas: ${assignments.length}`);

    if (appointments.length > 0) {
      console.log('\n📅 ÚLTIMAS APPOINTMENTS:');
      appointments.forEach((app, index) => {
        console.log(`${index + 1}. ID: ${app._id}`);
        console.log(`   Fecha: ${app.scheduledDate}`);
        console.log(`   Hora: ${app.timeSlot}`);
        console.log(`   Usuario: ${app.user?.nombre || 'N/A'}`);
        console.log(`   Estado: ${app.status}`);
        console.log(`   Productos: ${app.itemsToPickup?.length || 0}`);
        console.log('');
      });
    }

    if (assignments.length > 0) {
      console.log('\n📦 ÚLTIMAS LOCKER ASSIGNMENTS:');
      assignments.forEach((ass, index) => {
        console.log(`${index + 1}. ID: ${ass._id}`);
        console.log(`   Fecha: ${ass.scheduledDate}`);
        console.log(`   Hora: ${ass.timeSlot}`);
        console.log(`   Usuario: ${ass.userName}`);
        console.log(`   Casillero: ${ass.lockerNumber}`);
        console.log(`   Estado: ${ass.status}`);
        console.log(`   Productos: ${ass.products?.length || 0}`);
        console.log('');
      });
    }

    // Verificar si hay appointments sin assignments correspondientes
    if (appointments.length > 0) {
      console.log('\n🔍 VERIFICANDO SINCRONIZACIÓN:');
      for (const appointment of appointments) {
        const correspondingAssignment = await LockerAssignment.findOne({
          appointmentId: appointment._id.toString()
        });

        if (!correspondingAssignment) {
          console.log(`❌ Appointment ${appointment._id} NO tiene assignment correspondiente`);
          console.log(`   Fecha: ${appointment.scheduledDate}, Hora: ${appointment.timeSlot}`);
        } else {
          console.log(`✅ Appointment ${appointment._id} SÍ tiene assignment correspondiente`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

diagnoseSyncIssue();
