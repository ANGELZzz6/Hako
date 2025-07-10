// Script para probar el cálculo de slots
const SLOT_SIZE = 15; // cm - debe coincidir con gridPackingService

// Función para calcular slots necesarios basado en dimensiones
function calculateSlotsNeeded(dimensions) {
  const slotsX = Math.max(1, Math.ceil(dimensions.largo / SLOT_SIZE));
  const slotsY = Math.max(1, Math.ceil(dimensions.ancho / SLOT_SIZE));
  const slotsZ = Math.max(1, Math.ceil(dimensions.alto / SLOT_SIZE));
  return slotsX * slotsY * slotsZ;
}

// Función para mostrar información detallada del cálculo
function analyzeProduct(dimensions, productName) {
  const slotsX = Math.max(1, Math.ceil(dimensions.largo / SLOT_SIZE));
  const slotsY = Math.max(1, Math.ceil(dimensions.ancho / SLOT_SIZE));
  const slotsZ = Math.max(1, Math.ceil(dimensions.alto / SLOT_SIZE));
  const totalSlots = slotsX * slotsY * slotsZ;
  const volume = dimensions.largo * dimensions.ancho * dimensions.alto;
  
  console.log(`\n📦 ${productName}:`);
  console.log(`   Dimensiones: ${dimensions.largo}×${dimensions.ancho}×${dimensions.alto} cm`);
  console.log(`   Volumen: ${volume.toLocaleString()} cm³`);
  console.log(`   Slots necesarios: ${slotsX}×${slotsY}×${slotsZ} = ${totalSlots} slots`);
  console.log(`   Cálculo: Math.ceil(${dimensions.largo}/${SLOT_SIZE}) × Math.ceil(${dimensions.ancho}/${SLOT_SIZE}) × Math.ceil(${dimensions.alto}/${SLOT_SIZE})`);
  console.log(`   Detalle: Math.ceil(${(dimensions.largo/SLOT_SIZE).toFixed(2)}) × Math.ceil(${(dimensions.ancho/SLOT_SIZE).toFixed(2)}) × Math.ceil(${(dimensions.alto/SLOT_SIZE).toFixed(2)})`);
  
  return totalSlots;
}

console.log('🧮 Prueba de cálculo de slots para diferentes productos\n');
console.log(`📏 Tamaño de slot: ${SLOT_SIZE}×${SLOT_SIZE}×${SLOT_SIZE} cm`);
console.log(`📦 Casillero completo: 3×3×3 = 27 slots (${SLOT_SIZE*3}×${SLOT_SIZE*3}×${SLOT_SIZE*3} cm)`);

// Probar diferentes productos
const products = [
  { name: 'Sapo', dimensions: { largo: 20, ancho: 10, alto: 40 } },
  { name: 'Producto pequeño', dimensions: { largo: 10, ancho: 10, alto: 10 } },
  { name: 'Producto mediano', dimensions: { largo: 25, ancho: 15, alto: 20 } },
  { name: 'Producto grande', dimensions: { largo: 35, ancho: 25, alto: 30 } },
  { name: 'Producto muy grande', dimensions: { largo: 50, ancho: 40, alto: 45 } },
  { name: 'Producto extremo', dimensions: { largo: 60, ancho: 50, alto: 50 } },
];

let totalSlotsUsed = 0;

products.forEach(product => {
  const slots = analyzeProduct(product.dimensions, product.name);
  totalSlotsUsed += slots;
});

console.log('\n📊 Resumen:');
console.log(`Total de slots utilizados: ${totalSlotsUsed}`);
console.log(`Casilleros necesarios: ${Math.ceil(totalSlotsUsed / 27)}`);
console.log(`Eficiencia: ${((totalSlotsUsed % 27) / 27 * 100).toFixed(1)}% en el último casillero`);

// Verificar que el sapo use más de 1 slot
const sapoSlots = calculateSlotsNeeded({ largo: 20, ancho: 10, alto: 40 });
console.log(`\n✅ Verificación del sapo:`);
console.log(`   Slots calculados: ${sapoSlots}`);
console.log(`   ¿Usa más de 1 slot? ${sapoSlots > 1 ? '✅ SÍ' : '❌ NO'}`);

if (sapoSlots > 1) {
  console.log('🎉 El cálculo está funcionando correctamente!');
} else {
  console.log('❌ Hay un problema en el cálculo de slots');
}

// Mostrar ejemplos de cómo se vería en la interfaz
console.log('\n🖥️ Ejemplo de cómo se vería en la interfaz:');
console.log(`Sapo (20×10×40 cm): ${sapoSlots}/27 slots (${Math.round(sapoSlots/27*100)}%)`);
console.log(`   Barra de progreso: ${'█'.repeat(Math.round(sapoSlots/27*20))}${'░'.repeat(20-Math.round(sapoSlots/27*20))}`); 