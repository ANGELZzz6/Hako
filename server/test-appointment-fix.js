const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require('./models/Product');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testAppointmentCreation() {
  try {
    console.log('Conectando a la base de datos...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una orden con productos no reclamados
    const order = await Order.findOne({
      'items.claimed_quantity': { $lt: '$items.quantity' }
    }).populate('items.product');

    if (!order) {
      console.log('❌ No se encontró ninguna orden con productos no reclamados');
      return;
    }

    console.log(`📦 Orden encontrada: ${order._id}`);
    console.log(`👤 Usuario: ${order.user}`);
    console.log(`📋 Estado: ${order.status}`);

    // Mostrar productos de la orden
    console.log('\n📦 Productos en la orden:');
    order.items.forEach((item, index) => {
      const claimed = item.claimed_quantity || 0;
      const available = item.quantity - claimed;
      console.log(`  ${index + 1}. ${item.product.nombre}`);
      console.log(`     Cantidad total: ${item.quantity}`);
      console.log(`     Reclamados: ${claimed}`);
      console.log(`     Disponibles: ${available}`);
      console.log(`     Casillero asignado: ${item.assigned_locker || 'Ninguno'}`);
    });

    // Simular datos de cita
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const appointmentData = {
      orderId: order._id.toString(),
      scheduledDate: tomorrow.toISOString().split('T')[0],
      timeSlot: '09:00-10:00',
      itemsToPickup: []
    };

    // Agregar productos disponibles a la cita
    order.items.forEach((item, index) => {
      const claimed = item.claimed_quantity || 0;
      const available = item.quantity - claimed;
      
      if (available > 0) {
        appointmentData.itemsToPickup.push({
          product: item.product._id.toString(),
          quantity: Math.min(1, available), // Tomar máximo 1 producto
          lockerNumber: 1 // Asignar al casillero 1
        });
      }
    });

    console.log('\n📅 Datos de la cita a crear:');
    console.log(JSON.stringify(appointmentData, null, 2));

    // Verificar disponibilidad de casilleros
    console.log('\n🔍 Verificando disponibilidad de casilleros...');
    const availability = await Appointment.checkLockerAvailability(
      tomorrow, 
      '09:00-10:00', 
      [1]
    );
    console.log(`✅ Disponibilidad: ${availability.available}`);

    if (!availability.available) {
      console.log(`❌ Casilleros ocupados: ${availability.conflictingLockers.join(', ')}`);
      return;
    }

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 La funcionalidad debería funcionar correctamente ahora');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testAppointmentCreation(); 