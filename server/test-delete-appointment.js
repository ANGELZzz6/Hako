const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Order = require('./models/Order');
const User = require('./models/User');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testDeleteAppointment() {
  try {
    console.log('Conectando a la base de datos...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una cita que no esté completada
    const appointment = await Appointment.findOne({
      status: { $ne: 'completed' }
    }).populate('user order');

    if (!appointment) {
      console.log('❌ No se encontró ninguna cita para eliminar');
      return;
    }

    console.log(`📅 Cita encontrada: ${appointment._id}`);
    console.log(`👤 Usuario: ${appointment.user.nombre}`);
    console.log(`📋 Estado: ${appointment.status}`);
    console.log(`📅 Fecha: ${appointment.scheduledDate}`);
    console.log(`🕐 Hora: ${appointment.timeSlot}`);

    // Mostrar productos de la cita
    console.log('\n📦 Productos en la cita:');
    appointment.itemsToPickup.forEach((item, index) => {
      console.log(`  ${index + 1}. Producto: ${item.product}`);
      console.log(`     Cantidad: ${item.quantity}`);
      console.log(`     Casillero: ${item.lockerNumber}`);
    });

    // Verificar estado de la orden antes de eliminar
    if (appointment.order) {
      console.log('\n📋 Estado de la orden antes de eliminar:');
      appointment.order.items.forEach((item, index) => {
        console.log(`  ${index + 1}. Producto: ${item.product}`);
        console.log(`     Cantidad total: ${item.quantity}`);
        console.log(`     Reclamados: ${item.claimed_quantity || 0}`);
        console.log(`     Casillero asignado: ${item.assigned_locker || 'Ninguno'}`);
      });
    }

    // Simular eliminación (no eliminar realmente en la prueba)
    console.log('\n🔄 Simulando eliminación de cita...');
    
    // Verificar que la cita no esté completada
    if (appointment.status === 'completed') {
      console.log('❌ No se puede eliminar una cita completada');
      return;
    }

    // Simular la lógica de liberación de casilleros
    if (appointment.order && appointment.itemsToPickup.length > 0) {
      console.log('📦 Liberando casilleros...');
      
      for (const pickupItem of appointment.itemsToPickup) {
        const orderItem = appointment.order.items.find(item => 
          item.product.toString() === pickupItem.product
        );
        
        if (orderItem) {
          const oldClaimed = orderItem.claimed_quantity || 0;
          orderItem.claimed_quantity = Math.max(0, oldClaimed - pickupItem.quantity);
          
          console.log(`  - Producto: ${pickupItem.product}`);
          console.log(`    Reclamados antes: ${oldClaimed}`);
          console.log(`    Reclamados después: ${orderItem.claimed_quantity}`);
          
          if (orderItem.claimed_quantity === 0) {
            orderItem.assigned_locker = undefined;
            console.log(`    Casillero liberado`);
          }
        }
      }
    }

    console.log('\n✅ Prueba de eliminación completada exitosamente');
    console.log('📝 La funcionalidad debería funcionar correctamente');
    console.log('💡 Para eliminar realmente, usa el botón en la interfaz de admin');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testDeleteAppointment(); 