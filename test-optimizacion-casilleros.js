// Script para probar la optimización de casilleros existentes
console.log('🧪 Prueba de optimización de casilleros existentes\n');

// Simular casilleros existentes
const casillerosExistentes = new Map();
casillerosExistentes.set(1, {
  usedVolume: 80000, // 80,000 cm³ usados
  items: [
    { name: 'Sapo 1', volume: 8000, dimensions: { length: 20, width: 10, height: 40 } },
    { name: 'Sapo 2', volume: 8000, dimensions: { length: 20, width: 10, height: 40 } },
    { name: 'Sapo 3', volume: 8000, dimensions: { length: 20, width: 10, height: 40 } },
    { name: 'Producto A', volume: 2000, dimensions: { length: 20, width: 10, height: 10 } },
    { name: 'Producto B', volume: 2000, dimensions: { length: 20, width: 10, height: 10 } },
    { name: 'Producto C', volume: 2000, dimensions: { length: 20, width: 10, height: 10 } },
  ]
});

casillerosExistentes.set(2, {
  usedVolume: 40000, // 40,000 cm³ usados
  items: [
    { name: 'Producto D', volume: 4000, dimensions: { length: 20, width: 20, height: 10 } },
    { name: 'Producto E', volume: 4000, dimensions: { length: 20, width: 20, height: 10 } },
  ]
});

// Simular nuevos productos a agregar
const nuevosProductos = [
  { id: 'nuevo1', name: 'Nuevo Producto 1', volume: 3000, dimensions: { length: 15, width: 15, height: 15 } },
  { id: 'nuevo2', name: 'Nuevo Producto 2', volume: 5000, dimensions: { length: 25, width: 15, height: 15 } },
  { id: 'nuevo3', name: 'Nuevo Producto 3', volume: 2000, dimensions: { length: 10, width: 10, height: 20 } },
];

// Función para calcular slots necesarios
function calculateSlotsNeeded(dimensions) {
  const SLOT_SIZE = 15; // cm
  const slotsX = Math.max(1, Math.ceil(dimensions.length / SLOT_SIZE));
  const slotsY = Math.max(1, Math.ceil(dimensions.width / SLOT_SIZE));
  const slotsZ = Math.max(1, Math.ceil(dimensions.height / SLOT_SIZE));
  return slotsX * slotsY * slotsZ;
}

// Función para analizar casilleros existentes
function analizarCasillerosExistentes(casilleros, nuevosProductos) {
  const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm
  const LOCKER_MAX_SLOTS = 27; // 3x3x3 slots
  const productosOptimizados = [...nuevosProductos];
  const asignaciones = new Map();

  console.log('🔍 Analizando casilleros existentes...\n');

  casilleros.forEach((casillero, numero) => {
    const availableVolume = LOCKER_MAX_VOLUME - casillero.usedVolume;
    
    // Calcular slots usados por productos existentes
    const existingSlotsUsed = casillero.items.reduce((total, item) => {
      const slotsUsed = calculateSlotsNeeded({
        length: item.dimensions?.length || 10,
        width: item.dimensions?.width || 10,
        height: item.dimensions?.height || 10
      });
      return total + slotsUsed;
    }, 0);
    
    const availableSlots = LOCKER_MAX_SLOTS - existingSlotsUsed;
    
    console.log(`🏪 Casillero ${numero}:`);
    console.log(`   Volumen usado: ${casillero.usedVolume.toLocaleString()}/${LOCKER_MAX_VOLUME.toLocaleString()} cm³`);
    console.log(`   Slots usados: ${existingSlotsUsed}/${LOCKER_MAX_SLOTS}`);
    console.log(`   Espacio disponible: ${availableVolume.toLocaleString()} cm³`);
    console.log(`   Slots disponibles: ${availableSlots}`);
    
    if (availableVolume > 0 && availableSlots > 0) {
      // Buscar productos que quepan
      const productosQueCaben = productosOptimizados.filter(producto => {
        const itemSlots = calculateSlotsNeeded(producto.dimensions);
        return producto.volume <= availableVolume && itemSlots <= availableSlots;
      });

      console.log(`   Productos que caben: ${productosQueCaben.length}`);

      if (productosQueCaben.length > 0) {
        productosQueCaben.forEach(producto => {
          const itemSlots = calculateSlotsNeeded(producto.dimensions);
          console.log(`   ✅ Agregando "${producto.name}" (${producto.volume.toLocaleString()} cm³, ${itemSlots} slots)`);
          
          // Agregar a asignaciones
          if (!asignaciones.has(numero)) {
            asignaciones.set(numero, []);
          }
          asignaciones.get(numero).push(producto);
        });

        // Remover productos agregados de la lista
        productosQueCaben.forEach(producto => {
          const index = productosOptimizados.findIndex(p => p.id === producto.id);
          if (index >= 0) {
            productosOptimizados.splice(index, 1);
          }
        });
      }
    } else {
      console.log(`   ❌ Casillero lleno (volumen: ${availableVolume <= 0 ? 'SÍ' : 'NO'}, slots: ${availableSlots <= 0 ? 'SÍ' : 'NO'})`);
    }
    console.log('');
  });

  return { asignaciones, productosRestantes: productosOptimizados };
}

// Ejecutar análisis
const resultado = analizarCasillerosExistentes(casillerosExistentes, nuevosProductos);

console.log('📊 Resultados del análisis:');
console.log(`   Productos agregados a casilleros existentes: ${Array.from(resultado.asignaciones.values()).flat().length}`);
console.log(`   Productos restantes para nuevos casilleros: ${resultado.productosRestantes.length}`);

if (resultado.asignaciones.size > 0) {
  console.log('\n✅ Productos agregados a casilleros existentes:');
  resultado.asignaciones.forEach((productos, casillero) => {
    console.log(`   Casillero ${casillero}:`);
    productos.forEach(producto => {
      console.log(`     - ${producto.name} (${producto.volume.toLocaleString()} cm³)`);
    });
  });
}

if (resultado.productosRestantes.length > 0) {
  console.log('\n📦 Productos restantes (necesitan nuevo casillero):');
  resultado.productosRestantes.forEach(producto => {
    console.log(`   - ${producto.name} (${producto.volume.toLocaleString()} cm³)`);
  });
}

console.log('\n🎯 Verificación:');
console.log('✅ El sistema debe agregar productos a casilleros existentes cuando hay espacio');
console.log('✅ Solo debe crear nuevos casilleros cuando sea necesario');
console.log('✅ La optimización debe maximizar el uso de espacio disponible'); 