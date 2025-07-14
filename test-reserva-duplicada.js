const mongoose = require('mongoose');
const Appointment = require('./server/models/Appointment');
const User = require('./server/models/User');
const Order = require('./server/models/Order');
const Product = require('./server/models/Product');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hako';

async function testReservaDuplicada() {
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
        quantity: 2,
        unit_price: 10000,
        total_price: 20000
      }],
      total_amount: 20000,
      external_reference: 'test-' + Date.now(),
      status: 'paid'
    });

    console.log('📦 Datos de prueba creados');

    // Crear primera reserva
    const appointment1 = await Appointment.create({
      user: testUser._id,
      order: testOrder._id,
      scheduledDate: new Date('2024-12-20'),
      timeSlot: '10:00',
      itemsToPickup: [{
        product: testProduct._id,
        quantity: 1,
        lockerNumber: 1
      }],
      status: 'scheduled'
    });

    console.log('✅ Primera reserva creada:', appointment1._id);

    // Intentar crear segunda reserva para el mismo casillero, fecha y hora
    try {
      const appointment2 = await Appointment.create({
        user: testUser._id,
        order: testOrder._id,
        scheduledDate: new Date('2024-12-20'),
        timeSlot: '10:00',
        itemsToPickup: [{
          product: testProduct._id,
          quantity: 1,
          lockerNumber: 1
        }],
        status: 'scheduled'
      });
      console.log('❌ ERROR: Se permitió crear reserva duplicada:', appointment2._id);
    } catch (error) {
      console.log('✅ CORRECTO: Se impidió crear reserva duplicada');
      console.log('   Error:', error.message);
    }

    // Probar la función checkLockerAvailability
    console.log('\n🔍 Probando checkLockerAvailability...');
    
    const availability = await Appointment.checkLockerAvailability(
      new Date('2024-12-20'), 
      '10:00', 
      [1], 
      appointment1._id
    );
    
    console.log('Disponibilidad excluyendo la cita actual:', availability);

    const availabilityWithoutExclude = await Appointment.checkLockerAvailability(
      new Date('2024-12-20'), 
      '10:00', 
      [1]
    );
    
    console.log('Disponibilidad sin excluir:', availabilityWithoutExclude);

    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await Appointment.findByIdAndDelete(appointment1._id);
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
testReservaDuplicada(); 