// Script para probar la conversión de fechas y entender la discrepancia
console.log('🔍 === PRUEBA DE CONVERSIÓN DE FECHAS ===');

// Simular las fechas que vienen de la base de datos
const fechasDB = [
  '2025-07-14T00:00:00.000Z',
  '2025-07-14T05:00:00.000Z',
  '2025-07-14T10:00:00.000Z',
  '2025-07-14T15:00:00.000Z',
  '2025-07-14T20:00:00.000Z',
  '2025-07-14T23:59:59.999Z'
];

console.log('\n📅 Fechas de la base de datos:');
fechasDB.forEach((fechaDB, index) => {
  console.log(`\n--- Fecha ${index + 1} ---`);
  console.log('Fecha DB:', fechaDB);
  
  // Crear objeto Date
  const date = new Date(fechaDB);
  console.log('Date object:', date);
  console.log('ISO String:', date.toISOString());
  console.log('Local String:', date.toString());
  
  // Formato para mostrar al usuario (como se hace en OrdersPage)
  const fechaMostrada = date.toLocaleDateString('es-CO');
  console.log('Fecha mostrada (es-CO):', fechaMostrada);
  
  // Formato para comparación (como se hace en getAvailableLockersForEdit)
  const fechaComparacion = date.toISOString().split('T')[0];
  console.log('Fecha para comparación:', fechaComparacion);
  
  // Función createLocalDate (como en OrdersPage)
  const createLocalDate = (dateString) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(dateString);
  };
  
  const fechaLocal = createLocalDate(fechaDB);
  const fechaLocalStr = fechaLocal.toISOString().split('T')[0];
  console.log('Fecha con createLocalDate:', fechaLocalStr);
  console.log('Fecha local mostrada:', fechaLocal.toLocaleDateString('es-CO'));
});

console.log('\n🔍 === PROBLEMA IDENTIFICADO ===');
console.log('El problema está en que:');
console.log('1. La fecha se almacena en la DB como 2025-07-14T00:00:00.000Z');
console.log('2. Cuando se muestra con toLocaleDateString("es-CO"), se convierte a zona horaria local');
console.log('3. Pero cuando se usa toISOString().split("T")[0], se mantiene en UTC');
console.log('4. Esto causa que la fecha mostrada y la fecha de comparación sean diferentes');

console.log('\n💡 === SOLUCIÓN ===');
console.log('Necesitamos usar la misma función createLocalDate tanto para mostrar como para comparar'); 