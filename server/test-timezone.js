// Script para probar la zona horaria del servidor
console.log('🧪 Probando configuración de zona horaria...');

// Configurar zona horaria
process.env.TZ = 'America/Bogota';
console.log('🕐 Zona horaria configurada:', process.env.TZ);

// Mostrar información de fecha y hora
const now = new Date();
console.log('📅 Fecha actual:', now.toLocaleDateString());
console.log('🕐 Hora actual:', now.toLocaleTimeString());
console.log('🌍 Zona horaria detectada:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Probar filtrado de horas
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
console.log('⏰ Hora actual (formato 24h):', currentHour);
console.log('⏰ Minuto actual:', currentMinute);

// Simular horarios disponibles
const allTimeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

console.log('📋 Todos los horarios:', allTimeSlots);

// Filtrar horarios del pasado
const availableSlots = allTimeSlots.filter(time => {
  const [hours, minutes] = time.split(':');
  const slotHour = parseInt(hours);
  const slotMinute = parseInt(minutes);
  
  const isFuture = slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
  
  console.log(`  ${time}: hora=${slotHour}, minuto=${slotMinute}, ¿es futuro?=${isFuture}`);
  
  return isFuture;
});

console.log('✅ Horarios disponibles:', availableSlots);
console.log('❌ Horarios del pasado:', allTimeSlots.filter(time => !availableSlots.includes(time)));

console.log('✅ Prueba completada');
