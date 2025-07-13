// Script de prueba para verificar las correcciones de fechas
console.log('🔍 Verificando correcciones de fechas...\n');

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
console.log('📅 Fecha actual (ISO):', now.toISOString());

// Probar con una reserva para hoy a las 22:00
const appointmentDateString = '2025-07-12';
const appointmentTime = '22:00';

console.log('\n🔧 ANTES de la corrección:');
const oldAppointmentDate = new Date(appointmentDateString);
console.log(`- Fecha de reserva (método anterior): ${oldAppointmentDate.toLocaleString('es-CO')}`);
console.log(`- Fecha de reserva (ISO): ${oldAppointmentDate.toISOString()}`);

console.log('\n✅ DESPUÉS de la corrección:');
const newAppointmentDate = createLocalDate(appointmentDateString);
console.log(`- Fecha de reserva (método corregido): ${newAppointmentDate.toLocaleString('es-CO')}`);
console.log(`- Fecha de reserva (ISO): ${newAppointmentDate.toISOString()}`);

// Calcular diferencia de tiempo con ambos métodos
const [hours, minutes] = appointmentTime.split(':');

// Método anterior
const oldAppointmentDateTime = new Date(oldAppointmentDate);
oldAppointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
const oldTimeDifference = oldAppointmentDateTime.getTime() - now.getTime();
const oldHoursDifference = oldTimeDifference / (1000 * 60 * 60);

// Método corregido
const newAppointmentDateTime = new Date(newAppointmentDate);
newAppointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
const newTimeDifference = newAppointmentDateTime.getTime() - now.getTime();
const newHoursDifference = newTimeDifference / (1000 * 60 * 60);

console.log('\n⏰ Comparación de diferencias de tiempo:');
console.log(`- Método anterior: ${oldHoursDifference.toFixed(2)} horas`);
console.log(`- Método corregido: ${newHoursDifference.toFixed(2)} horas`);

console.log('\n✅ Verificación de si se puede modificar:');
console.log(`- Método anterior: ${oldHoursDifference >= 1 ? 'SÍ' : 'NO'}`);
console.log(`- Método corregido: ${newHoursDifference >= 1 ? 'SÍ' : 'NO'}`);

// Verificar si es el día actual
const today = new Date(now);
today.setHours(0, 0, 0, 0);

const oldAppointmentDay = new Date(oldAppointmentDate);
oldAppointmentDay.setHours(0, 0, 0, 0);
const oldIsToday = oldAppointmentDay.getTime() === today.getTime();

const newAppointmentDay = new Date(newAppointmentDate);
newAppointmentDay.setHours(0, 0, 0, 0);
const newIsToday = newAppointmentDay.getTime() === today.getTime();

console.log('\n📅 Verificación de día actual:');
console.log(`- Método anterior: ¿Es hoy? ${oldIsToday ? 'SÍ' : 'NO'}`);
console.log(`- Método corregido: ¿Es hoy? ${newIsToday ? 'SÍ' : 'NO'}`);

console.log('\n🎯 Resumen:');
console.log('El problema estaba en que el método anterior interpretaba "2025-07-12" como UTC,');
console.log('lo que resultaba en 11 de julio en la noche (hora Colombia).');
console.log('El método corregido crea la fecha en la zona horaria local,');
console.log('asegurando que "2025-07-12" sea realmente el 12 de julio a las 00:00 local.');

console.log('\n✅ Correcciones aplicadas:');
console.log('- Frontend: OrdersPage.tsx y AppointmentScheduler.tsx');
console.log('- Backend: appointmentController.js');
console.log('- Función utilitaria createLocalDate() agregada en ambos lados'); 