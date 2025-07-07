const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako');

async function testLockerLogic() {
  try {
    console.log('🧪 Probando nueva lógica de casilleros...\n');
    
    const testDate = '2025-01-15';
    
    // 1. Probar horarios disponibles
    console.log('1️⃣ Obteniendo horarios disponibles...');
    const timeSlots = await Appointment.getAvailableTimeSlots(new Date(testDate));
    
    console.log('Horarios disponibles:');
    timeSlots.forEach(slot => {
      console.log(`  ${slot.time}: ${slot.available ? '✅' : '❌'} - ${slot.availableLockers}/${slot.totalLockers} casilleros libres`);
      if (slot.occupiedLockers.length > 0) {
        console.log(`    Casilleros ocupados: ${slot.occupiedLockers.join(', ')}`);
      }
    });
    
    // 2. Probar verificación de casilleros específicos
    console.log('\n2️⃣ Probando verificación de casilleros específicos...');
    
    // Simular verificación de casilleros 1 y 3
    const requestedLockers = [1, 3];
    const availability = await Appointment.checkLockerAvailability(
      new Date(testDate), 
      '10:00', 
      requestedLockers
    );
    
    console.log(`Casilleros solicitados: ${requestedLockers.join(', ')}`);
    console.log(`Disponibles: ${availability.available ? '✅' : '❌'}`);
    console.log(`Casilleros ocupados en total: ${availability.occupiedLockers.join(', ') || 'ninguno'}`);
    console.log(`Conflictos: ${availability.conflictingLockers.join(', ') || 'ninguno'}`);
    
    // 3. Simular múltiples reservas
    console.log('\n3️⃣ Simulando múltiples reservas en el mismo horario...');
    
    // Primera reserva: casillero 1
    const availability1 = await Appointment.checkLockerAvailability(
      new Date(testDate), 
      '10:00', 
      [1]
    );
    console.log(`Reserva casillero 1: ${availability1.available ? '✅' : '❌'}`);
    
    // Segunda reserva: casillero 3 (debería ser posible)
    const availability2 = await Appointment.checkLockerAvailability(
      new Date(testDate), 
      '10:00', 
      [3]
    );
    console.log(`Reserva casillero 3: ${availability2.available ? '✅' : '❌'}`);
    
    // Tercera reserva: casillero 1 (debería fallar)
    const availability3 = await Appointment.checkLockerAvailability(
      new Date(testDate), 
      '10:00', 
      [1]
    );
    console.log(`Segunda reserva casillero 1: ${availability3.available ? '✅' : '❌'}`);
    
    console.log('\n✅ Pruebas completadas');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    mongoose.connection.close();
  }
}

testLockerLogic(); 