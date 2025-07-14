// Script para probar que la corrección de fechas funciona correctamente
console.log('🔍 === PRUEBA DE CORRECCIÓN DE FECHAS ===');

// Simular las fechas que vienen de la base de datos
const fechasDB = [
  '2025-07-14T00:00:00.000Z', // Esta debería mostrar como 13/7/2025 en Colombia
  '2025-07-14T05:00:00.000Z', // Esta debería mostrar como 14/7/2025 en Colombia
];

// Función createLocalDate (como en OrdersPage)
const createLocalDate = (dateString) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(dateString);
};

console.log('\n📅 Probando conversión de fechas:');
fechasDB.forEach((fechaDB, index) => {
  console.log(`\n--- Fecha ${index + 1} ---`);
  console.log('Fecha DB original:', fechaDB);
  
  // Método anterior (problemático)
  const fechaAnterior = new Date(fechaDB);
  const fechaMostradaAnterior = fechaAnterior.toLocaleDateString('es-CO');
  const fechaComparacionAnterior = fechaAnterior.toISOString().split('T')[0];
  
  console.log('Método anterior:');
  console.log('  Fecha mostrada:', fechaMostradaAnterior);
  console.log('  Fecha para comparación:', fechaComparacionAnterior);
  console.log('  ¿Coinciden?', fechaMostradaAnterior === fechaComparacionAnterior);
  
  // Método corregido (usando createLocalDate)
  const fechaLocal = createLocalDate(fechaDB);
  const fechaMostradaCorregida = fechaLocal.toLocaleDateString('es-CO');
  const fechaComparacionCorregida = fechaLocal.toISOString().split('T')[0];
  
  console.log('Método corregido:');
  console.log('  Fecha mostrada:', fechaMostradaCorregida);
  console.log('  Fecha para comparación:', fechaComparacionCorregida);
  console.log('  ¿Coinciden?', fechaMostradaCorregida === fechaComparacionCorregida);
});

console.log('\n✅ === RESULTADO ESPERADO ===');
console.log('Con la corrección, las fechas mostradas y las fechas de comparación deberían coincidir');
console.log('Esto asegura que cuando el usuario ve "13/7/2025", el sistema busque casilleros ocupados para "13/7/2025"'); 