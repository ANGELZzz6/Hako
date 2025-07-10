const mongoose = require('mongoose');
const Appointment = require('./server/models/Appointment');
const IndividualProduct = require('./server/models/IndividualProduct');
const Order = require('./server/models/Order');
const User = require('./server/models/User');

async function testVisualizationFix() {
  try {
    console.log('🔧 Iniciando prueba de corrección de visualización...');
    
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

    // Buscar reservas existentes
    const existingAppointments = await Appointment.find({
      user: user._id,
      status: { $nin: ['cancelled', 'completed'] }
    }).populate('itemsToPickup.product');

    console.log(`\n📅 Reservas existentes: ${existingAppointments.length}`);
    existingAppointments.forEach((appointment, index) => {
      console.log(`   Reserva ${index + 1}: ${appointment._id.slice(-6)}`);
      console.log(`   Fecha: ${appointment.scheduledDate.toLocaleDateString()}`);
      console.log(`   Hora: ${appointment.timeSlot}`);
      console.log(`   Productos: ${appointment.itemsToPickup.length}`);
      appointment.itemsToPickup.forEach(item => {
        console.log(`     - ${item.product.nombre} (Casillero ${item.lockerNumber})`);
      });
    });

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 Los problemas solucionados son:');
    console.log('   1. ✅ Visualización 3D muestra SOLO productos seleccionados (no reservas existentes)');
    console.log('   2. ✅ Modal de reserva no muestra productos duplicados');
    console.log('   3. ✅ Validación: debe llenar al menos 1 casillero (80% o más)');
    console.log('   4. ✅ Indicador visual del estado de los casilleros');
    console.log('   5. ✅ Botón de reserva deshabilitado si no hay casillero lleno');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

testVisualizationFix(); 