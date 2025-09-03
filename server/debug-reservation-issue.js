const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const LockerAssignment = require('./models/LockerAssignment');

// Configurar zona horaria
process.env.TZ = 'America/Bogota';

async function debugReservationIssue() {
  try {
    console.log('🔍 Diagnosticando problema de reservas...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    // Buscar la cita específica que mencionaste
    const testDate = '2025-09-09'; // martes, 9 de septiembre de 2025
    const testTime = '13:00';
    
    console.log(`\n🔍 Buscando cita para ${testDate} a las ${testTime}...`);

    // 1. Buscar la appointment
    const appointment = await Appointment.findOne({
      scheduledDate: testDate,
      timeSlot: testTime
    }).populate('user', 'nombre email');

    if (!appointment) {
      console.log('❌ No se encontró la appointment');
      return;
    }

    console.log('✅ Appointment encontrada:');
    console.log(`   ID: ${appointment._id}`);
    console.log(`   Usuario: ${appointment.user?.nombre || 'N/A'}`);
    console.log(`   Email: ${appointment.user?.email || 'N/A'}`);
    console.log(`   Fecha: ${appointment.scheduledDate}`);
    console.log(`   Hora: ${appointment.timeSlot}`);
    console.log(`   Estado: ${appointment.status}`);
    console.log(`   Productos: ${appointment.itemsToPickup?.length || 0}`);

    if (appointment.itemsToPickup && appointment.itemsToPickup.length > 0) {
      console.log('\n📦 Productos en la appointment:');
      appointment.itemsToPickup.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.product} - Cantidad: ${item.quantity} - Casillero: ${item.lockerNumber}`);
      });
    }

    // 2. Buscar locker assignment correspondiente
    const lockerAssignment = await LockerAssignment.findOne({
      appointmentId: appointment._id.toString()
    });

    if (!lockerAssignment) {
      console.log('\n❌ NO se encontró locker assignment correspondiente');
      console.log('   Esto explica por qué no se muestran las reservas');
      
      // Verificar si hay assignments para esa fecha y hora
      const assignmentsForDateTime = await LockerAssignment.find({
        scheduledDate: testDate,
        timeSlot: testTime
      });

      console.log(`\n🔍 Assignments para ${testDate} ${testTime}: ${assignmentsForDateTime.length}`);
      
      if (assignmentsForDateTime.length > 0) {
        console.log('   Assignments encontradas:');
        assignmentsForDateTime.forEach((ass, index) => {
          console.log(`   ${index + 1}. Casillero: ${ass.lockerNumber}, Usuario: ${ass.userName}, Appointment ID: ${ass.appointmentId}`);
        });
      }

      return;
    }

    console.log('\n✅ Locker assignment encontrada:');
    console.log(`   ID: ${lockerAssignment._id}`);
    console.log(`   Casillero: ${lockerAssignment.lockerNumber}`);
    console.log(`   Usuario: ${lockerAssignment.userName}`);
    console.log(`   Email: ${lockerAssignment.userEmail}`);
    console.log(`   Fecha: ${lockerAssignment.scheduledDate}`);
    console.log(`   Hora: ${lockerAssignment.timeSlot}`);
    console.log(`   Estado: ${lockerAssignment.status}`);
    console.log(`   Productos: ${lockerAssignment.products?.length || 0}`);

    if (lockerAssignment.products && lockerAssignment.products.length > 0) {
      console.log('\n📦 Productos en la assignment:');
      lockerAssignment.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.productName}`);
        console.log(`      Variantes: ${JSON.stringify(product.variants)}`);
        console.log(`      Dimensiones: ${JSON.stringify(product.dimensions)}`);
        console.log(`      Cantidad: ${product.quantity}`);
        console.log(`      Slots: ${product.calculatedSlots}`);
      });
    }

    // 3. Verificar si hay otras appointments para la misma fecha
    const allAppointmentsForDate = await Appointment.find({
      scheduledDate: testDate
    }).populate('user', 'nombre email');

    console.log(`\n📅 Total de appointments para ${testDate}: ${allAppointmentsForDate.length}`);
    
    if (allAppointmentsForDate.length > 0) {
      console.log('   Appointments:');
      allAppointmentsForDate.forEach((app, index) => {
        console.log(`   ${index + 1}. ${app.timeSlot} - ${app.user?.nombre || 'N/A'} - ${app.status}`);
      });
    }

    // 4. Verificar si hay otras assignments para la misma fecha
    const allAssignmentsForDate = await LockerAssignment.find({
      scheduledDate: testDate
    });

    console.log(`\n📦 Total de assignments para ${testDate}: ${allAssignmentsForDate.length}`);
    
    if (allAssignmentsForDate.length > 0) {
      console.log('   Assignments:');
      allAssignmentsForDate.forEach((ass, index) => {
        console.log(`   ${index + 1}. ${ass.timeSlot} - Casillero ${ass.lockerNumber} - ${ass.userName} - ${ass.status}`);
      });
    }

    // 5. Verificar correspondencia
    console.log('\n🔍 VERIFICANDO CORRESPONDENCIA:');
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const app of allAppointmentsForDate) {
      const correspondingAssignment = await LockerAssignment.findOne({
        appointmentId: app._id.toString()
      });

      if (correspondingAssignment) {
        console.log(`✅ ${app.timeSlot} - ${app.user?.nombre} → Casillero ${correspondingAssignment.lockerNumber}`);
        matchedCount++;
      } else {
        console.log(`❌ ${app.timeSlot} - ${app.user?.nombre} → SIN ASSIGNMENT`);
        unmatchedCount++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`✅ Con assignment: ${matchedCount}`);
    console.log(`❌ Sin assignment: ${unmatchedCount}`);

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugReservationIssue();
}

module.exports = debugReservationIssue;

