const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const LockerAssignment = require('./models/LockerAssignment');
const lockerAssignmentService = require('./services/lockerAssignmentService');

// Configurar zona horaria
process.env.TZ = 'America/Bogota';

async function testSyncFunctionality() {
  try {
    console.log('🧪 Probando funcionalidad de sincronización...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    // 1. Verificar estado inicial
    console.log('\n📊 ESTADO INICIAL:');
    const initialAppointments = await Appointment.countDocuments({
      status: { $in: ['scheduled', 'confirmed'] }
    });
    const initialAssignments = await LockerAssignment.countDocuments();
    
    console.log(`📅 Appointments activas: ${initialAppointments}`);
    console.log(`📦 Locker Assignments: ${initialAssignments}`);

    // 2. Obtener una fecha con citas para probar
    const appointmentWithDate = await Appointment.findOne({
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('scheduledDate');

    if (!appointmentWithDate) {
      console.log('❌ No hay citas para probar la sincronización');
      return;
    }

    const testDate = appointmentWithDate.scheduledDate;
    console.log(`\n🔍 Probando sincronización para fecha: ${testDate}`);

    // 3. Contar appointments para esta fecha antes de sincronizar
    const appointmentsBefore = await Appointment.find({
      scheduledDate: testDate,
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    console.log(`📅 Appointments para ${testDate}: ${appointmentsBefore.length}`);

    // 4. Contar assignments para esta fecha antes de sincronizar
    const assignmentsBefore = await LockerAssignment.find({
      scheduledDate: testDate
    });
    
    console.log(`📦 Assignments para ${testDate}: ${assignmentsBefore.length}`);

    // 5. Ejecutar sincronización
    console.log('\n🔄 Ejecutando sincronización...');
    const syncResult = await lockerAssignmentService.syncFromAppointments(testDate);
    console.log(`✅ Sincronización completada. Resultado:`, syncResult);

    // 6. Verificar resultado
    const assignmentsAfter = await LockerAssignment.find({
      scheduledDate: testDate
    });
    
    console.log(`\n📊 RESULTADO:`);
    console.log(`📦 Assignments después de sincronizar: ${assignmentsAfter.length}`);
    console.log(`📈 Diferencia: +${assignmentsAfter.length - assignmentsBefore.length}`);

    // 7. Mostrar detalles de las assignments creadas
    if (assignmentsAfter.length > 0) {
      console.log('\n📋 DETALLES DE ASSIGNMENTS:');
      assignmentsAfter.forEach((assignment, index) => {
        console.log(`${index + 1}. Casillero: ${assignment.lockerNumber}`);
        console.log(`   Usuario: ${assignment.userName}`);
        console.log(`   Hora: ${assignment.timeSlot}`);
        console.log(`   Estado: ${assignment.status}`);
        console.log(`   Productos: ${assignment.products?.length || 0}`);
        console.log(`   Appointment ID: ${assignment.appointmentId}`);
        console.log('');
      });
    }

    // 8. Verificar que todas las appointments tienen assignments correspondientes
    console.log('\n🔍 VERIFICANDO CORRESPONDENCIA:');
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const appointment of appointmentsBefore) {
      const correspondingAssignment = await LockerAssignment.findOne({
        appointmentId: appointment._id.toString()
      });

      if (correspondingAssignment) {
        console.log(`✅ Appointment ${appointment._id} → Assignment ${correspondingAssignment._id}`);
        matchedCount++;
      } else {
        console.log(`❌ Appointment ${appointment._id} NO tiene assignment`);
        unmatchedCount++;
      }
    }

    console.log(`\n📊 RESUMEN DE CORRESPONDENCIA:`);
    console.log(`✅ Matched: ${matchedCount}`);
    console.log(`❌ Unmatched: ${unmatchedCount}`);
    console.log(`📈 Success Rate: ${appointmentsBefore.length > 0 ? Math.round((matchedCount / appointmentsBefore.length) * 100) : 0}%`);

  } catch (error) {
    console.error('❌ Error en prueba de sincronización:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSyncFunctionality();
}

module.exports = testSyncFunctionality;
