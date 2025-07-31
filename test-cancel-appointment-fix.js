const mongoose = require('mongoose');
const IndividualProduct = require('./server/models/IndividualProduct');
const Appointment = require('./server/models/Appointment');

// Configurar conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/hako', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testCancelAppointment() {
  try {
    console.log('🧪 === PRUEBA DE CANCELACIÓN DE RESERVAS ===');
    
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
    
    // Simular la nueva lógica de búsqueda
    console.log('\n🔍 === SIMULANDO NUEVA LÓGICA DE BÚSQUEDA ===');
    
    for (const pickupItem of appointment.itemsToPickup) {
      console.log(`\n🔍 Buscando producto individual para: ${pickupItem.product.nombre}`);
      console.log(`   Product ID: ${pickupItem.product._id}`);
      console.log(`   Casillero: ${pickupItem.lockerNumber}`);
      
      // Primera búsqueda: criterios exactos
      let individualProduct = await IndividualProduct.findOne({
        product: pickupItem.product._id,
        user: appointment.user,
        status: 'reserved',
        assignedLocker: pickupItem.lockerNumber
      });
      
      if (individualProduct) {
        console.log(`✅ ENCONTRADO con criterios exactos: ${individualProduct._id}`);
        console.log(`   Estado: ${individualProduct.status}`);
        console.log(`   Casillero asignado: ${individualProduct.assignedLocker}`);
        continue;
      }
      
      // Si no se encuentra, buscar sin el criterio de casillero
      console.log(`⚠️ No se encontró con criterios exactos, buscando sin casillero...`);
      individualProduct = await IndividualProduct.findOne({
        product: pickupItem.product._id,
        user: appointment.user,
        status: 'reserved'
      });
      
      if (individualProduct) {
        console.log(`✅ ENCONTRADO sin casillero: ${individualProduct._id}`);
        console.log(`   Estado: ${individualProduct.status}`);
        console.log(`   Casillero asignado: ${individualProduct.assignedLocker}`);
        continue;
      }
      
      // Si aún no se encuentra, buscar cualquier producto individual disponible
      console.log(`⚠️ No se encontró reservado, buscando cualquier producto individual disponible...`);
      individualProduct = await IndividualProduct.findOne({
        product: pickupItem.product._id,
        user: appointment.user,
        status: 'available'
      });
      
      if (individualProduct) {
        console.log(`✅ ENCONTRADO disponible: ${individualProduct._id}`);
        console.log(`   Estado: ${individualProduct.status}`);
        console.log(`   Casillero asignado: ${individualProduct.assignedLocker}`);
      } else {
        console.log(`❌ NO ENCONTRADO ningún producto individual`);
        
        // Debug: mostrar todos los productos individuales para este producto
        const allIndividualProducts = await IndividualProduct.find({
          product: pickupItem.product._id,
          user: appointment.user
        });
        
        console.log(`🔍 Productos individuales encontrados para ${pickupItem.product.nombre}:`, allIndividualProducts.length);
        allIndividualProducts.forEach((ip, index) => {
          console.log(`   ${index + 1}. ID: ${ip._id}, Estado: ${ip.status}, Casillero: ${ip.assignedLocker}`);
        });
      }
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    mongoose.connection.close();
  }
}

testCancelAppointment(); 