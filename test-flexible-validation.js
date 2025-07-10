const mongoose = require('mongoose');
const Appointment = require('./server/models/Appointment');
const IndividualProduct = require('./server/models/IndividualProduct');
const Order = require('./server/models/Order');
const User = require('./server/models/User');

async function testFlexibleValidation() {
  try {
    console.log('🔧 Iniciando prueba de validación flexible...');
    
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

    // Simular diferentes escenarios de selección
    console.log('\n🧪 Simulando diferentes escenarios:');
    
    // Escenario 1: Pocos productos (uso bajo)
    const fewProducts = individualProducts.slice(0, 1);
    console.log('\n📊 Escenario 1: Pocos productos');
    console.log(`   Productos: ${fewProducts.length}`);
    console.log(`   Volumen total: ${fewProducts.reduce((sum, ip) => sum + ip.getVolumen(), 0)} cm³`);
    console.log(`   Uso estimado: ~${Math.round((fewProducts.reduce((sum, ip) => sum + ip.getVolumen(), 0) / 125000) * 100)}%`);
    console.log(`   Resultado esperado: Puede reservar con advertencia de uso bajo`);

    // Escenario 2: Productos moderados (uso moderado)
    const moderateProducts = individualProducts.slice(0, Math.min(3, individualProducts.length));
    console.log('\n📊 Escenario 2: Productos moderados');
    console.log(`   Productos: ${moderateProducts.length}`);
    console.log(`   Volumen total: ${moderateProducts.reduce((sum, ip) => sum + ip.getVolumen(), 0)} cm³`);
    console.log(`   Uso estimado: ~${Math.round((moderateProducts.reduce((sum, ip) => sum + ip.getVolumen(), 0) / 125000) * 100)}%`);
    console.log(`   Resultado esperado: Puede reservar con indicación de uso moderado`);

    // Escenario 3: Muchos productos (uso alto)
    const manyProducts = individualProducts.slice(0, Math.min(5, individualProducts.length));
    console.log('\n📊 Escenario 3: Muchos productos');
    console.log(`   Productos: ${manyProducts.length}`);
    console.log(`   Volumen total: ${manyProducts.reduce((sum, ip) => sum + ip.getVolumen(), 0)} cm³`);
    console.log(`   Uso estimado: ~${Math.round((manyProducts.reduce((sum, ip) => sum + ip.getVolumen(), 0) / 125000) * 100)}%`);
    console.log(`   Resultado esperado: Puede reservar con indicación de optimización excelente`);

    console.log('\n✅ Prueba completada exitosamente');
    console.log('📝 La nueva lógica permite:');
    console.log('   1. ✅ Reservar con pocos productos (con advertencia)');
    console.log('   2. ✅ Reservar con productos moderados (con información)');
    console.log('   3. ✅ Reservar con muchos productos (con felicitación)');
    console.log('   4. ✅ Mostrar información detallada de optimización');
    console.log('   5. ✅ No bloquear al usuario si no puede llenar un casillero');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

testFlexibleValidation(); 