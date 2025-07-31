const mongoose = require('mongoose');
const IndividualProduct = require('./server/models/IndividualProduct');
const Appointment = require('./server/models/Appointment');

// Configurar conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/hako', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugCancelAppointment() {
  try {
    console.log('🔍 === DEBUG CANCELACIÓN DE RESERVAS ===');
    
    // Buscar una reserva activa para probar
    const appointment = await Appointment.findOne({
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('itemsToPickup.product');
    
    if (!appointment) {
      console.log('❌ No se encontraron reservas activas para probar');
      return;
    }
    
    console.log('📅 Reserva encontrada:', appointment._id);
    console.log('👤 Usuario:', appointment.user);
    console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);
    
    // Mostrar productos en la reserva
    appointment.itemsToPickup.forEach((item, index) => {
      console.log(`  ${index + 1}. Producto: ${item.product.nombre} (ID: ${item.product._id})`);
      console.log(`     Casillero: ${item.lockerNumber}`);
      console.log(`     Cantidad: ${item.quantity}`);
    });
    
    // Buscar productos individuales para este usuario
    const individualProducts = await IndividualProduct.find({
      user: appointment.user,
      status: 'reserved'
    }).populate('product');
    
    console.log('\n🔍 Productos individuales reservados para este usuario:', individualProducts.length);
    individualProducts.forEach((ip, index) => {
      console.log(`  ${index + 1}. ID: ${ip._id}`);
      console.log(`     Producto: ${ip.product.nombre} (ID: ${ip.product._id})`);
      console.log(`     Estado: ${ip.status}`);
      console.log(`     Casillero asignado: ${ip.assignedLocker}`);
      console.log(`     Reservado en: ${ip.reservedAt}`);
    });
    
    // Simular la búsqueda que hace la función de cancelación
    console.log('\n🔍 === SIMULANDO BÚSQUEDA DE CANCELACIÓN ===');
    
    for (const pickupItem of appointment.itemsToPickup) {
      console.log(`\n🔍 Buscando producto individual para: ${pickupItem.product.nombre}`);
      console.log(`   Product ID: ${pickupItem.product._id}`);
      console.log(`   Casillero: ${pickupItem.lockerNumber}`);
      
      const individualProduct = await IndividualProduct.findOne({
        product: pickupItem.product._id,
        user: appointment.user,
        status: 'reserved',
        assignedLocker: pickupItem.lockerNumber
      });
      
      if (individualProduct) {
        console.log(`✅ ENCONTRADO: ${individualProduct._id}`);
        console.log(`   Estado actual: ${individualProduct.status}`);
        console.log(`   Casillero asignado: ${individualProduct.assignedLocker}`);
      } else {
        console.log(`❌ NO ENCONTRADO`);
        
        // Buscar productos individuales más ampliamente
        const broaderSearch = await IndividualProduct.find({
          product: pickupItem.product._id,
          user: appointment.user
        });
        
        console.log(`🔍 Búsqueda amplia encontró ${broaderSearch.length} productos:`);
        broaderSearch.forEach(ip => {
          console.log(`   - ID: ${ip._id}, Estado: ${ip.status}, Casillero: ${ip.assignedLocker}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugCancelAppointment(); 