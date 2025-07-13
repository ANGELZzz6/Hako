// Script de prueba para verificar las validaciones de reserva
console.log('🔍 Verificando validaciones de reserva...\n');

// Función utilitaria para crear fechas locales correctamente (igual que en el código)
const createLocalDate = (dateString) => {
  // Si la fecha viene en formato "YYYY-MM-DD", crear una fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  // Si ya es una fecha completa, usarla tal como está
  return new Date(dateString);
};

// Simular la fecha actual (12 de julio de 2025, 8:17 PM)
const now = new Date('2025-07-12T20:17:00');

console.log('📅 Fecha actual simulada:', now.toLocaleString('es-CO'));

// Casos de prueba
const testCases = [
  {
    name: 'Reserva para hoy en 30 minutos (INVÁLIDA)',
    date: '2025-07-12',
    time: '20:47',
    expected: false
  },
  {
    name: 'Reserva para hoy en 2 horas (VÁLIDA)',
    date: '2025-07-12',
    time: '22:17',
    expected: true
  },
  {
    name: 'Reserva para mañana (VÁLIDA)',
    date: '2025-07-13',
    time: '10:00',
    expected: true
  },
  {
    name: 'Reserva para ayer (INVÁLIDA)',
    date: '2025-07-11',
    time: '10:00',
    expected: false
  },
  {
    name: 'Reserva para dentro de 8 días (INVÁLIDA - más de 7 días)',
    date: '2025-07-20',
    time: '10:00',
    expected: false
  }
];

console.log('🧪 Ejecutando casos de prueba:\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  
  // Crear fecha de la reserva
  const appointmentDate = createLocalDate(testCase.date);
  const [hours, minutes] = testCase.time.split(':');
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Validaciones
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  // 1. Verificar que no sea en el pasado
  const isPast = appointmentDate < today;
  
  // 2. Verificar que no sea más de 7 días adelante
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 7);
  maxDate.setHours(23, 59, 59, 999);
  const isTooFar = appointmentDate > maxDate;
  
  // 3. Verificar que tenga al menos 1 hora de anticipación
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursDifference = timeDifference / (1000 * 60 * 60);
  const hasMinTime = hoursDifference >= 1;
  
  // Resultado final
  const isValid = !isPast && !isTooFar && hasMinTime;
  
  console.log(`   📅 Fecha: ${testCase.date} ${testCase.time}`);
  console.log(`   ⏰ Diferencia: ${hoursDifference.toFixed(2)} horas`);
  console.log(`   ❌ ¿Es pasado?: ${isPast ? 'SÍ' : 'NO'}`);
  console.log(`   ❌ ¿Es muy lejano?: ${isTooFar ? 'SÍ' : 'NO'}`);
  console.log(`   ❌ ¿Tiene 1h+ anticipación?: ${hasMinTime ? 'SÍ' : 'NO'}`);
  console.log(`   ✅ ¿Es válida?: ${isValid ? 'SÍ' : 'NO'} ${isValid === testCase.expected ? '✅' : '❌'}`);
  console.log('');
});

console.log('🎯 Resumen de validaciones implementadas:');
console.log('✅ No se pueden crear reservas en fechas pasadas');
console.log('✅ No se pueden crear reservas con más de 7 días de anticipación');
console.log('✅ Solo se pueden crear reservas con al menos 1 hora de anticipación');
console.log('');
console.log('🔧 Correcciones aplicadas:');
console.log('- Frontend: AppointmentScheduler.tsx - Validación en handleSchedule()');
console.log('- Backend: appointmentController.js - Validación en createAppointment()');
console.log('- Backend: appointmentController.js - Validación en createMultipleAppointments()'); 