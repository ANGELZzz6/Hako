// Script de prueba para verificar la validación de fechas
console.log('🔍 Verificando validación de fechas...\n');

// Simular la fecha actual (12 de julio de 2025, 8:17 PM)
const now = new Date('2025-07-12T20:17:00');

console.log('📅 Fecha actual simulada:', now.toLocaleString('es-CO'));
console.log('📅 Fecha actual (ISO):', now.toISOString());

// Simular una reserva para hoy a las 22:00
// Usar la misma fecha que la actual pero con hora diferente
const appointmentDate = new Date(now);
appointmentDate.setHours(22, 0, 0, 0);

console.log('\n📅 Fecha de la reserva:', appointmentDate.toLocaleString('es-CO'));
console.log('📅 Fecha de la reserva (ISO):', appointmentDate.toISOString());

// Calcular diferencia de tiempo
const timeDifference = appointmentDate.getTime() - now.getTime();
const hoursDifference = timeDifference / (1000 * 60 * 60);
const minutesDifference = timeDifference / (1000 * 60);

console.log('\n⏰ Diferencia de tiempo:');
console.log(`- Milisegundos: ${timeDifference}`);
console.log(`- Horas: ${hoursDifference.toFixed(2)}`);
console.log(`- Minutos: ${minutesDifference.toFixed(2)}`);

// Verificar si se puede modificar (más de 1 hora de anticipación)
const canModify = hoursDifference >= 1;
console.log(`\n✅ ¿Se puede modificar? ${canModify ? 'SÍ' : 'NO'}`);

// Verificar si es el día actual
const today = new Date(now);
today.setHours(0, 0, 0, 0);
const appointmentDay = new Date(appointmentDate);
appointmentDay.setHours(0, 0, 0, 0);
const isToday = appointmentDay.getTime() === today.getTime();

console.log('\n📅 Verificación de día actual:');
console.log(`- Hoy (00:00): ${today.toLocaleDateString('es-CO')}`);
console.log(`- Día de la reserva (00:00): ${appointmentDay.toLocaleDateString('es-CO')}`);
console.log(`- ¿Es hoy? ${isToday ? 'SÍ' : 'NO'}`);

// Verificar fechas disponibles (próximos 7 días)
console.log('\n📅 Fechas disponibles (próximos 7 días):');
for (let i = 0; i < 7; i++) {
  const date = new Date(today);
  date.setDate(today.getDate() + i);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const readableDate = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  console.log(`${i === 0 ? '→ ' : '  '}${dateStr} - ${readableDate}${i === 0 ? ' (Hoy)' : ''}`);
}

// Verificar horarios disponibles para hoy
console.log('\n🕐 Horarios disponibles para hoy:');
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

const currentHour = now.getHours();
const currentMinute = now.getMinutes();

timeSlots.forEach(time => {
  const [hours, minutes] = time.split(':');
  const slotHour = parseInt(hours);
  const slotMinute = parseInt(minutes);
  
  const isFuture = slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
  
  console.log(`${isFuture ? '✅' : '❌'} ${time} - ${isFuture ? 'Disponible' : 'Ya pasó'}`);
});

console.log('\n🔍 Resumen del problema:');
console.log(`- Fecha actual: 12 de julio de 2025, 8:17 PM`);
console.log(`- Reserva: 12 de julio de 2025, 10:00 PM`);
console.log(`- Diferencia: ${hoursDifference.toFixed(2)} horas`);
console.log(`- ¿Se puede modificar? ${canModify ? 'SÍ' : 'NO'}`);

// Simular el problema que menciona el usuario
console.log('\n🔍 Simulando el problema del usuario:');
console.log('El usuario dice que hoy es 12 de julio pero el sistema dice que es 13');

// Verificar si hay algún problema con la zona horaria
const realNow = new Date();
console.log('\n📅 Fecha real del sistema:');
console.log(`- Fecha actual real: ${realNow.toLocaleString('es-CO')}`);
console.log(`- Fecha actual real (ISO): ${realNow.toISOString()}`);
console.log(`- Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Verificar si el problema está en el frontend
console.log('\n🔍 Verificando lógica del frontend:');
const frontendToday = new Date();
frontendToday.setHours(0, 0, 0, 0);
console.log(`- Frontend hoy: ${frontendToday.toLocaleDateString('es-CO')}`);

// Verificar si el problema está en el backend
console.log('\n🔍 Verificando lógica del backend:');
const backendNow = new Date();
const backendToday = new Date();
backendToday.setHours(0, 0, 0, 0);
console.log(`- Backend ahora: ${backendNow.toLocaleString('es-CO')}`);
console.log(`- Backend hoy: ${backendToday.toLocaleDateString('es-CO')}`); 