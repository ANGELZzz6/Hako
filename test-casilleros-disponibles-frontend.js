// Script de prueba para verificar la función getAvailableLockersForEdit
// Este script simula la lógica del frontend para filtrar casilleros disponibles

// Datos de prueba - simular reservas del usuario
const myAppointments = [
  {
    _id: '1d3e59',
    status: 'scheduled',
    scheduledDate: '2025-07-13T00:00:00.000Z',
    timeSlot: '17:00',
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
    timeSlot: '17:00',
    itemsToPickup: [
      { lockerNumber: 3 },
      { lockerNumber: 3 }
    ]
  },
  {
    _id: '1d3e1f',
    status: 'scheduled',
    scheduledDate: '2025-07-13T00:00:00.000Z',
    timeSlot: '17:00',
    itemsToPickup: [
      { lockerNumber: 1 },
      { lockerNumber: 1 },
      { lockerNumber: 1 },
      { lockerNumber: 1 }
    ]
  }
];

// Función que simula getAvailableLockersForEdit del frontend
function getAvailableLockersForEdit(date, timeSlot, appointmentId) {
  const allLockers = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Si no hay fecha o hora seleccionada, mostrar todos los casilleros
  if (!date || !timeSlot) {
    return allLockers;
  }

  // Obtener casilleros ocupados por el usuario en la fecha y hora seleccionada
  const occupiedLockers = new Set();
  
  myAppointments.forEach(appointment => {
    // Excluir la reserva actual que se está editando
    if (appointment._id === appointmentId) {
      return;
    }
    
    // Solo considerar reservas activas para la misma fecha y hora
    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
      const appointmentDate = new Date(appointment.scheduledDate).toISOString().split('T')[0];
      if (appointmentDate === date && appointment.timeSlot === timeSlot) {
        // Agregar todos los casilleros usados en esta reserva
        appointment.itemsToPickup.forEach(item => {
          occupiedLockers.add(item.lockerNumber);
        });
      }
    }
  });

  // Retornar solo los casilleros que no están ocupados
  return allLockers.filter(locker => !occupiedLockers.has(locker));
}

// Pruebas
console.log('🧪 Probando función getAvailableLockersForEdit...\n');

// Test 1: Editar reserva 1d3e80 (casillero 3) para fecha 2025-07-13, hora 17:00
console.log('📋 Test 1: Editando reserva 1d3e80 (casillero 3)');
const availableLockers1 = getAvailableLockersForEdit('2025-07-13', '17:00', '1d3e80');
console.log('Casilleros disponibles:', availableLockers1);
console.log('Casilleros ocupados por otras reservas: [1, 2]');
console.log('✅ Resultado esperado: [4, 5, 6, 7, 8, 9, 10, 11, 12]');
console.log('✅ Resultado obtenido:', availableLockers1);
console.log('¿Test 1 exitoso?', availableLockers1.length === 9 && !availableLockers1.includes(1) && !availableLockers1.includes(2));
console.log('');

// Test 2: Editar reserva 1d3e59 (casillero 2) para fecha 2025-07-13, hora 17:00
console.log('📋 Test 2: Editando reserva 1d3e59 (casillero 2)');
const availableLockers2 = getAvailableLockersForEdit('2025-07-13', '17:00', '1d3e59');
console.log('Casilleros disponibles:', availableLockers2);
console.log('Casilleros ocupados por otras reservas: [1, 3]');
console.log('✅ Resultado esperado: [4, 5, 6, 7, 8, 9, 10, 11, 12]');
console.log('✅ Resultado obtenido:', availableLockers2);
console.log('¿Test 2 exitoso?', availableLockers2.length === 9 && !availableLockers2.includes(1) && !availableLockers2.includes(3));
console.log('');

// Test 3: Editar reserva 1d3e1f (casillero 1) para fecha 2025-07-13, hora 17:00
console.log('📋 Test 3: Editando reserva 1d3e1f (casillero 1)');
const availableLockers3 = getAvailableLockersForEdit('2025-07-13', '17:00', '1d3e1f');
console.log('Casilleros disponibles:', availableLockers3);
console.log('Casilleros ocupados por otras reservas: [2, 3]');
console.log('✅ Resultado esperado: [4, 5, 6, 7, 8, 9, 10, 11, 12]');
console.log('✅ Resultado obtenido:', availableLockers3);
console.log('¿Test 3 exitoso?', availableLockers3.length === 9 && !availableLockers3.includes(2) && !availableLockers3.includes(3));
console.log('');

// Test 4: Probar con fecha diferente (debería mostrar todos los casilleros)
console.log('📋 Test 4: Fecha diferente (2025-07-14)');
const availableLockers4 = getAvailableLockersForEdit('2025-07-14', '17:00', '1d3e80');
console.log('Casilleros disponibles:', availableLockers4);
console.log('✅ Resultado esperado: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]');
console.log('✅ Resultado obtenido:', availableLockers4);
console.log('¿Test 4 exitoso?', availableLockers4.length === 12);
console.log('');

// Test 5: Probar con hora diferente (debería mostrar todos los casilleros)
console.log('📋 Test 5: Hora diferente (18:00)');
const availableLockers5 = getAvailableLockersForEdit('2025-07-13', '18:00', '1d3e80');
console.log('Casilleros disponibles:', availableLockers5);
console.log('✅ Resultado esperado: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]');
console.log('✅ Resultado obtenido:', availableLockers5);
console.log('¿Test 5 exitoso?', availableLockers5.length === 12);
console.log('');

console.log('🎯 Resumen de pruebas:');
console.log('Test 1:', availableLockers1.length === 9 && !availableLockers1.includes(1) && !availableLockers1.includes(2) ? '✅ PASÓ' : '❌ FALLÓ');
console.log('Test 2:', availableLockers2.length === 9 && !availableLockers2.includes(1) && !availableLockers2.includes(3) ? '✅ PASÓ' : '❌ FALLÓ');
console.log('Test 3:', availableLockers3.length === 9 && !availableLockers3.includes(2) && !availableLockers3.includes(3) ? '✅ PASÓ' : '❌ FALLÓ');
console.log('Test 4:', availableLockers4.length === 12 ? '✅ PASÓ' : '❌ FALLÓ');
console.log('Test 5:', availableLockers5.length === 12 ? '✅ PASÓ' : '❌ FALLÓ'); 