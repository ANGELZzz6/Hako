console.log('🧠 Prueba de Reserva Inteligente');
console.log('=' .repeat(50));

// Simular el flujo de reserva inteligente
function simulateSmartReservation() {
  console.log('\n📊 Simulando escenario de reserva inteligente...');
  
  // Simular reservas existentes
  const existingAppointments = [
    {
      _id: 'appointment-1',
      status: 'scheduled',
      itemsToPickup: [
        { lockerNumber: 1, product: { _id: 'product-1', nombre: 'Producto 1' } },
        { lockerNumber: 1, product: { _id: 'product-2', nombre: 'Producto 2' } }
      ]
    }
  ];
  
  // Simular packing result con casilleros existentes y nuevos
  const packingResult = {
    lockers: [
      {
        id: 'locker_1',
        usedSlots: 15,
        products: [
          { id: 'product-1', name: 'Producto 1' },
          { id: 'product-2', name: 'Producto 2' },
          { id: 'product-3', name: 'Producto 3' }, // Nuevo producto
          { id: 'product-4', name: 'Producto 4' }  // Nuevo producto
        ]
      },
      {
        id: 'locker_2',
        usedSlots: 8,
        products: [
          { id: 'product-5', name: 'Producto 5' }, // Nuevo casillero
          { id: 'product-6', name: 'Producto 6' }  // Nuevo casillero
        ]
      }
    ]
  };
  
  // Simular productos seleccionados
  const selectedProducts = new Map([
    [0, { quantity: 1, lockerNumber: 1 }], // Producto 3 -> Casillero 1 (existente)
    [1, { quantity: 1, lockerNumber: 1 }], // Producto 4 -> Casillero 1 (existente)
    [2, { quantity: 1, lockerNumber: 2 }], // Producto 5 -> Casillero 2 (nuevo)
    [3, { quantity: 1, lockerNumber: 2 }]  // Producto 6 -> Casillero 2 (nuevo)
  ]);
  
  console.log('📅 Reservas existentes:', existingAppointments.length);
  console.log('📦 Casilleros en packing result:', packingResult.lockers.length);
  console.log('🎯 Productos seleccionados:', selectedProducts.size);
  
  // Separar casilleros existentes vs nuevos
  const existingLockers = [];
  const newLockers = [];
  
  packingResult.lockers.forEach(locker => {
    const lockerNumber = parseInt(locker.id.replace('locker_', ''));
    const isExisting = existingAppointments.some(appointment => 
      appointment.status !== 'cancelled' && 
      appointment.status !== 'completed' &&
      appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
    );
    
    if (isExisting) {
      existingLockers.push(lockerNumber);
    } else {
      newLockers.push(lockerNumber);
    }
  });
  
  console.log('\n🔍 Análisis de casilleros:');
  console.log('📊 Casilleros existentes:', existingLockers);
  console.log('🆕 Casilleros nuevos:', newLockers);
  
  // Simular productos para casilleros existentes
  if (existingLockers.length > 0) {
    console.log('\n🔄 Procesando productos para casilleros existentes...');
    
    for (const lockerNumber of existingLockers) {
      const existingAppointment = existingAppointments.find(appointment => 
        appointment.status !== 'cancelled' && 
        appointment.status !== 'completed' &&
        appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
      );
      
      if (existingAppointment) {
        const productsForThisLocker = Array.from(selectedProducts.entries())
          .filter(([itemIndex, selection]) => selection.lockerNumber === lockerNumber)
          .map(([itemIndex, selection]) => ({
            productId: `product-${itemIndex + 3}`, // Simular IDs
            quantity: 1,
            lockerNumber: lockerNumber
          }));
        
        console.log(`📦 Casillero ${lockerNumber}: Agregando ${productsForThisLocker.length} productos a reserva existente`);
        console.log('   Productos:', productsForThisLocker.map(p => p.productId));
      }
    }
  }
  
  // Simular productos para casilleros nuevos
  if (newLockers.length > 0) {
    console.log('\n🆕 Procesando productos para casilleros nuevos...');
    
    const newLockersData = packingResult.lockers.filter(locker => {
      const lockerNumber = parseInt(locker.id.replace('locker_', ''));
      return newLockers.includes(lockerNumber);
    });
    
    console.log(`📋 Mostrando modal para ${newLockersData.length} casillero(s) nuevo(s)`);
    
    newLockersData.forEach(locker => {
      const lockerNumber = parseInt(locker.id.replace('locker_', ''));
      const productsInThisLocker = Array.from(selectedProducts.entries())
        .filter(([itemIndex, selection]) => selection.lockerNumber === lockerNumber)
        .map(([itemIndex, selection]) => ({
          name: `Producto ${itemIndex + 5}`,
          count: 1,
          productId: `product-${itemIndex + 5}`
        }));
      
      console.log(`📦 Casillero ${lockerNumber} (nuevo): ${productsInThisLocker.length} productos para reservar`);
      console.log('   Productos:', productsInThisLocker.map(p => p.name));
    });
  }
  
  console.log('\n✅ Simulación completada');
  console.log('📊 Resumen:');
  console.log(`   - ${existingLockers.length} casillero(s) existente(s) → productos agregados automáticamente`);
  console.log(`   - ${newLockers.length} casillero(s) nuevo(s) → mostrar modal de reserva`);
}

// Ejecutar la simulación
simulateSmartReservation();

console.log('\n' + '=' .repeat(50));
console.log('🎯 Beneficios de la reserva inteligente:');
console.log('   1. ✅ No duplicar reservas para casilleros existentes');
console.log('   2. ✅ Agregar productos automáticamente a reservas existentes');
console.log('   3. ✅ Solo reservar casilleros nuevos');
console.log('   4. ✅ Mejor experiencia de usuario');
console.log('   5. ✅ Evitar confusión con múltiples reservas'); 