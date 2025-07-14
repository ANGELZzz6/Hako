const mongoose = require('mongoose');
const Appointment = require('./server/models/Appointment');
const User = require('./server/models/User');
const Order = require('./server/models/Order');
const Product = require('./server/models/Product');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testReservaDuplicadaEspecifico() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear datos de prueba
    const testUser = await User.findOne({ email: 'test@example.com' }) || 
      await User.create({
        nombre: 'Usuario Test',
        email: 'test@example.com',
        contraseña: 'Test123!',
        role: 'user'
      });

    const testProduct = await Product.findOne() || 
      await Product.create({
        nombre: 'Producto Test',
        descripcion: 'Descripción de prueba',
        precio: 10000,
        stock: 10,
        imagen_url: 'https://example.com/image.jpg'
      });

    const testOrder = await Order.create({
      user: testUser._id,
      items: [{
        product: testProduct._id,
        quantity: 4,
        unit_price: 10000,
        total_price: 40000
      }],
      total_amount: 40000,
      external_reference: 'test-' + Date.now(),
      status: 'paid'
    });

    console.log('📦 Datos de prueba creados');

    // Crear primera reserva con casillero 1
    const appointment1 = await Appointment.create({
      user: testUser._id,
      order: testOrder._id,
      scheduledDate: new Date('2025-07-13'),
      timeSlot: '17:00',
      itemsToPickup: [
        { product: testProduct._id, quantity: 1, lockerNumber: 1 },
        { product: testProduct._id, quantity: 1, lockerNumber: 1 },
        { product: testProduct._id, quantity: 1, lockerNumber: 1 },
        { product: testProduct._id, quantity: 1, lockerNumber: 1 }
      ],
      status: 'scheduled'
    });

    console.log('✅ Primera reserva creada (casillero 1):', appointment1._id);

    // Crear segunda reserva con casillero 2
    const appointment2 = await Appointment.create({
      user: testUser._id,
      order: testOrder._id,
      scheduledDate: new Date('2025-07-13'),
      timeSlot: '17:00',
      itemsToPickup: [
        { product: testProduct._id, quantity: 1, lockerNumber: 2 },
        { product: testProduct._id, quantity: 1, lockerNumber: 2 },
        { product: testProduct._id, quantity: 1, lockerNumber: 2 },
        { product: testProduct._id, quantity: 1, lockerNumber: 2 }
      ],
      status: 'scheduled'
    });

    console.log('✅ Segunda reserva creada (casillero 2):', appointment2._id);

    // Crear tercera reserva con casillero 3
    const appointment3 = await Appointment.create({
      user: testUser._id,
      order: testOrder._id,
      scheduledDate: new Date('2025-07-13'),
      timeSlot: '17:00',
      itemsToPickup: [
        { product: testProduct._id, quantity: 1, lockerNumber: 3 },
        { product: testProduct._id, quantity: 1, lockerNumber: 3 }
      ],
      status: 'scheduled'
    });

    console.log('✅ Tercera reserva creada (casillero 3):', appointment3._id);

    // Simular la actualización de la tercera reserva para usar casillero 2
    console.log('\n🔄 Intentando modificar la tercera reserva para usar casillero 2...');
    
    // Simular la lógica de validación
    const existingUserAppointments = await Appointment.find({
      user: testUser._id,
      scheduledDate: new Date('2025-07-13'),
      timeSlot: '17:00',
      status: { $in: ['scheduled', 'confirmed'] },
      _id: { $ne: appointment3._id } // Excluir la cita actual
    });

    console.log('📋 Reservas existentes del usuario para la misma fecha/hora:', existingUserAppointments.length);

    // Verificar si hay conflictos con el nuevo casillero (2)
    let hasConflict = false;
    for (const existingAppointment of existingUserAppointments) {
      for (const item of existingAppointment.itemsToPickup) {
        if (item.lockerNumber === 2) {
          hasConflict = true;
          console.log(`❌ CONFLICTO DETECTADO: La reserva ${existingAppointment._id} ya usa el casillero 2`);
          break;
        }
      }
      if (hasConflict) break;
    }

    if (hasConflict) {
      console.log('✅ CORRECTO: Se detectó el conflicto - no se puede usar casillero 2');
    } else {
      console.log('❌ ERROR: No se detectó el conflicto - se permitiría usar casillero 2');
    }

    // Mostrar todas las reservas del usuario
    console.log('\n📊 Estado actual de las reservas:');
    const allUserAppointments = await Appointment.find({
      user: testUser._id,
      scheduledDate: new Date('2025-07-13'),
      timeSlot: '17:00',
      status: { $in: ['scheduled', 'confirmed'] }
    });

    for (const apt of allUserAppointments) {
      const lockers = apt.itemsToPickup.map(item => item.lockerNumber);
      console.log(`Reserva ${apt._id}: Casilleros ${lockers.join(', ')}`);
    }

    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await Appointment.findByIdAndDelete(appointment1._id);
    await Appointment.findByIdAndDelete(appointment2._id);
    await Appointment.findByIdAndDelete(appointment3._id);
    await Order.findByIdAndDelete(testOrder._id);
    await User.findByIdAndDelete(testUser._id);
    console.log('✅ Datos de prueba eliminados');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testReservaDuplicadaEspecifico(); 