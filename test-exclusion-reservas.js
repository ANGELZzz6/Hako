// Script para probar la exclusión de productos ya reservados
console.log('🧪 Prueba de exclusión de productos ya reservados\n');

// Simular productos comprados
const productosComprados = [
  { _id: 'prod1', nombre: 'Sapo 1', isClaimed: false, assigned_locker: null },
  { _id: 'prod2', nombre: 'Sapo 2', isClaimed: false, assigned_locker: null },
  { _id: 'prod3', nombre: 'Sapo 3', isClaimed: false, assigned_locker: null },
  { _id: 'prod4', nombre: 'Producto A', isClaimed: false, assigned_locker: null },
  { _id: 'prod5', nombre: 'Producto B', isClaimed: false, assigned_locker: null },
  { _id: 'prod6', nombre: 'Producto C', isClaimed: false, assigned_locker: null },
  { _id: 'prod7', nombre: 'Producto D', isClaimed: false, assigned_locker: null },
  { _id: 'prod8', nombre: 'Producto E', isClaimed: false, assigned_locker: null },
];

// Simular reservas existentes
const reservasExistentes = [
  {
    _id: 'reserva1',
    itemsToPickup: [
      { product: { _id: 'prod1' }, lockerNumber: 1 },
      { product: { _id: 'prod2' }, lockerNumber: 1 },
      { product: { _id: 'prod3' }, lockerNumber: 1 },
      { product: { _id: 'prod4' }, lockerNumber: 1 },
      { product: { _id: 'prod5' }, lockerNumber: 1 },
      { product: { _id: 'prod6' }, lockerNumber: 1 },
    ]
  }
];

console.log('📦 Productos comprados:', productosComprados.length);
console.log('📅 Reservas existentes:', reservasExistentes.length);

// Función para obtener productos ya en reservas
function obtenerProductosEnReservas(reservas) {
  const productosEnReservas = new Set();
  reservas.forEach(appointment => {
    if (appointment.itemsToPickup) {
      appointment.itemsToPickup.forEach(item => {
        productosEnReservas.add(item.product._id);
      });
    }
  });
  return productosEnReservas;
}

// Función para seleccionar productos disponibles
function seleccionarProductosDisponibles(productos, reservas) {
  const productosEnReservas = obtenerProductosEnReservas(reservas);
  const productosDisponibles = [];
  
  console.log('📋 Productos ya en reservas:', Array.from(productosEnReservas));
  
  productos.forEach((item, index) => {
    const yaEstaReservado = productosEnReservas.has(item._id);
    
    if (!item.isClaimed && !item.assigned_locker && !yaEstaReservado) {
      productosDisponibles.push({
        index,
        producto: item,
        lockerNumber: 1 // Casillero por defecto
      });
    }
  });
  
  return productosDisponibles;
}

// Ejecutar la lógica
const productosEnReservas = obtenerProductosEnReservas(reservasExistentes);
const productosDisponibles = seleccionarProductosDisponibles(productosComprados, reservasExistentes);

console.log('\n📊 Resultados:');
console.log(`   Productos en reservas: ${productosEnReservas.size}`);
console.log(`   Productos disponibles para nueva reserva: ${productosDisponibles.length}`);

console.log('\n✅ Productos disponibles:');
productosDisponibles.forEach(item => {
  console.log(`   - ${item.producto.nombre} (ID: ${item.producto._id})`);
});

console.log('\n❌ Productos excluidos (ya en reservas):');
productosComprados.forEach(item => {
  if (productosEnReservas.has(item._id)) {
    console.log(`   - ${item.nombre} (ID: ${item._id})`);
  }
});

// Verificar que la lógica es correcta
const totalExcluidos = productosEnReservas.size;
const totalDisponibles = productosDisponibles.length;
const totalProductos = productosComprados.length;

console.log('\n🎯 Verificación:');
console.log(`   Total productos: ${totalProductos}`);
console.log(`   Excluidos (en reservas): ${totalExcluidos}`);
console.log(`   Disponibles: ${totalDisponibles}`);
console.log(`   Suma: ${totalExcluidos + totalDisponibles} ✅`);

if (totalExcluidos + totalDisponibles === totalProductos) {
  console.log('🎉 La lógica de exclusión funciona correctamente!');
} else {
  console.log('❌ Hay un problema en la lógica de exclusión');
}

// Simular nueva compra
console.log('\n🛒 Simulando nueva compra:');
const nuevosProductos = [
  { _id: 'nuevo1', nombre: 'Nuevo Producto 1', isClaimed: false, assigned_locker: null },
  { _id: 'nuevo2', nombre: 'Nuevo Producto 2', isClaimed: false, assigned_locker: null },
];

console.log('   Nuevos productos comprados:', nuevosProductos.length);

// Agregar nuevos productos a la lista
const todosLosProductos = [...productosComprados, ...nuevosProductos];
const nuevosDisponibles = seleccionarProductosDisponibles(todosLosProductos, reservasExistentes);

console.log(`   Productos disponibles después de nueva compra: ${nuevosDisponibles.length}`);
console.log('   Solo los nuevos productos deberían estar disponibles para selección'); 