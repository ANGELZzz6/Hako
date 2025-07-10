const mongoose = require('mongoose');
const Appointment = require('./server/models/Appointment');
const IndividualProduct = require('./server/models/IndividualProduct');
const Order = require('./server/models/Order');
const User = require('./server/models/User');
const Product = require('./server/models/Product');

async function testReservationFix() {
  try {
    console.log('🔧 Iniciando prueba de corrección de reservas...');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako');
    console.log('✅ Conectado a MongoDB');

    // Buscar un usuario de prueba
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('❌ Usuario de prueba no encontrado');
      return;
    }

    // Buscar productos individuales del usuario
    const individualProducts = await IndividualProduct.find({ 
      user: user._id,
      status: 'available'
    }).populate('product');

    console.log(`📦 Productos individuales disponibles: ${individualProducts.length}`);

    if (individualProducts.length === 0) {
      console.log('❌ No hay productos individuales disponibles para probar');
      return;
    }

    // Mostrar información de los productos
    individualProducts.forEach((ip, index) => {
      console.log(`\n📋 Producto ${index + 1}:`);
      console.log(`   Nombre: ${ip.product.nombre}`);
      console.log(`   Dimensiones: ${ip.dimensiones?.largo || 'N/A'} × ${ip.dimensiones?.ancho || 'N/A'} × ${ip.dimensiones?.alto || 'N/A'} cm`);
      console.log(`   Volumen: ${ip.getVolumen()} cm³`);
      console.log(`   ID: ${ip._id}`);
    });

    // Buscar una orden del usuario
    const order = await Order.findOne({ 
      user: user._id,
      status: { $in: ['paid', 'ready_for_pickup'] }
    });

    if (!order) {
      console.log('❌ No hay órdenes disponibles para probar');
      return;
    }

    console.log(`\n📋 Orden encontrada: ${order._id}`);

    // Simular datos de reserva con múltiples productos
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const appointmentData = {
      orderId: order._id.toString(),
      scheduledDate: tomorrow.toISOString().split('T')[0],
      timeSlot: '09:00',
      itemsToPickup: individualProducts.slice(0, 3).map((ip, index) => ({
        product: ip._id.toString(),
        quantity: 1,
        lockerNumber: index + 1
      }))
    };

    console.log('\n📅 Datos de reserva a crear:');
    console.log(JSON.stringify(appointmentData, null, 2));

    // Verificar disponibilidad de casilleros
    console.log('\n🔍 Verificando disponibilidad de casilleros...');
    const availability = await Appointment.checkLockerAvailability(
      tomorrow, 
      '09:00', 
      [1, 2, 3]
    );
    console.log(`✅ Disponibilidad: ${availability.available}`);

    if (!availability.available) {
      console.log(`❌ Casilleros ocupados: ${availability.conflictingLockers.join(', ')}`);
      return;
    }

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 El sistema debería manejar correctamente múltiples productos con dimensiones reales');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

testReservationFix(); 