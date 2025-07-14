// Script de prueba para verificar la comparación de fechas
// Simula el problema que está ocurriendo

// Función createLocalDate (copiada del frontend)
function createLocalDate(dateString) {
  // Si la fecha viene en formato "YYYY-MM-DD", crear una fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  // Si ya es una fecha completa, usarla tal como está
  return new Date(dateString);
}

// Datos de prueba - simular reservas del usuario
const myAppointments = [
  {
    _id: '1d3e1f',
    status: 'scheduled',
    scheduledDate: '2025-07-13T00:00:00.000Z',
    timeSlot: '19:00',
    itemsToPickup: [
      { lockerNumber: 1 },
      { lockerNumber: 1 },
      { lockerNumber: 1 },
      { lockerNumber: 1 }
    ]
  },
  {
    _id: '1d3e59',
    status: 'scheduled',
    scheduledDate: '2025-07-13T00:00:00.000Z',
    timeSlot: '19:00',
    itemsToPickup: [
      { lockerNumber: 2 },
      { lockerNumber: 2 },
      { lockerNumber: 2 },
      { lockerNumber: 2 }
    ]
  },
  {
    _id: '1d3e80',
    status: 'scheduled',
    scheduledDate: '2025-07-13T00:00:00.000Z',
    timeSlot: '19:00',
    itemsToPickup: [
      { lockerNumber: 3 },
      { lockerNumber: 3 }
    ]
  }
];

// Función que simula getAvailableLockersForEdit del frontend (versión corregida)
function getAvailableLockersForEdit(date, timeSlot, appointmentId) {
  const allLockers = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Si no hay fecha o hora seleccionada, mostrar todos los casilleros
  if (!date || !timeSlot) {
    return allLockers;
  }

  console.log('🔍 Buscando casilleros ocupados para fecha:', date, 'hora:', timeSlot);
  console.log('🔍 Reserva que se está editando:', appointmentId);

  // Obtener casilleros ocupados por el usuario en la fecha y hora seleccionada
  const occupiedLockers = new Set();
  
  myAppointments.forEach(appointment => {
    // Excluir la reserva actual que se está editando
    if (appointment._id === appointmentId) {
      console.log('⏭️ Excluyendo reserva actual:', appointment._id);
      return;
    }
    
    // Solo considerar reservas activas para la misma fecha y hora
    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
      // Usar la función createLocalDate para comparar fechas correctamente
      const appointmentDate = createLocalDate(appointment.scheduledDate);
      const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
      
      console.log('🔍 Comparando reserva:', appointment._id);
      console.log('   Fecha de la reserva:', appointmentDateStr);
      console.log('   Hora de la reserva:', appointment.timeSlot);
      console.log('   Fecha seleccionada:', date);
      console.log('   Hora seleccionada:', timeSlot);
      console.log('   ¿Coinciden fecha y hora?', appointmentDateStr === date && appointment.timeSlot === timeSlot);
      
      if (appointmentDateStr === date && appointment.timeSlot === timeSlot) {
        console.log('❌ Casillero ocupado por reserva:', appointment._id);
        // Agregar todos los casilleros usados en esta reserva
        appointment.itemsToPickup.forEach(item => {
          occupiedLockers.add(item.lockerNumber);
          console.log('   Casillero ocupado:', item.lockerNumber);
        });
      }
    }
  });

  console.log('🔒 Casilleros ocupados encontrados:', Array.from(occupiedLockers));
  
  // Retornar solo los casilleros que no están ocupados
  const availableLockers = allLockers.filter(locker => !occupiedLockers.has(locker));
  console.log('✅ Casilleros disponibles:', availableLockers);
  
  return availableLockers;
}

// Pruebas
console.log('🧪 Probando comparación de fechas...\n');

// Test 1: Editar reserva 1d3e59 (casillero 2) para fecha 2025-07-13, hora 19:00
console.log('📋 Test 1: Editando reserva 1d3e59 (casillero 2) para 2025-07-13 19:00');
const availableLockers1 = getAvailableLockersForEdit('2025-07-13', '19:00', '1d3e59');
console.log('Resultado final:', availableLockers1);
console.log('¿Debería excluir casilleros 1 y 3?', !availableLockers1.includes(1) && !availableLockers1.includes(3));
console.log('');

// Test 2: Editar reserva 1d3e59 (casillero 2) para fecha 2025-07-14, hora 19:00
console.log('📋 Test 2: Editando reserva 1d3e59 (casillero 2) para 2025-07-14 19:00');
const availableLockers2 = getAvailableLockersForEdit('2025-07-14', '19:00', '1d3e59');
console.log('Resultado final:', availableLockers2);
console.log('¿Debería mostrar todos los casilleros?', availableLockers2.length === 12);
console.log('');

// Test 3: Verificar que las fechas se comparan correctamente
console.log('📋 Test 3: Verificando comparación de fechas');
const testDate1 = createLocalDate('2025-07-13T00:00:00.000Z');
const testDate2 = createLocalDate('2025-07-13');
console.log('Fecha 1 (ISO):', testDate1.toISOString().split('T')[0]);
console.log('Fecha 2 (local):', testDate2.toISOString().split('T')[0]);
console.log('¿Son iguales?', testDate1.toISOString().split('T')[0] === testDate2.toISOString().split('T')[0]);
console.log('');

console.log('🎯 Resumen:');
console.log('Test 1 (misma fecha):', !availableLockers1.includes(1) && !availableLockers1.includes(3) ? '✅ CORRECTO' : '❌ INCORRECTO');
console.log('Test 2 (fecha diferente):', availableLockers2.length === 12 ? '✅ CORRECTO' : '❌ INCORRECTO');
console.log('Test 3 (comparación fechas):', testDate1.toISOString().split('T')[0] === testDate2.toISOString().split('T')[0] ? '✅ CORRECTO' : '❌ INCORRECTO'); 