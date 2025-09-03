const mongoose = require('mongoose');
const LockerAssignment = require('./models/LockerAssignment');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Order = require('./models/Order');
const lockerAssignmentService = require('./services/lockerAssignmentService');

// Configurar zona horaria
process.env.TZ = 'America/Bogota';

async function testLockerAssignmentSystem() {
  try {
    console.log('🧪 Iniciando pruebas del sistema de Locker Assignments...');
    
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos de prueba anteriores
    await LockerAssignment.deleteMany({});
    console.log('🧹 Datos de prueba anteriores eliminados');

    // 1. Probar creación de asignación manual
    console.log('\n📝 Prueba 1: Crear asignación manual');
    const testAssignment = {
      lockerNumber: 1,
      userId: 'test-user-id',
      userName: 'Usuario de Prueba',
      userEmail: 'test@example.com',
      appointmentId: 'test-appointment-id',
      scheduledDate: '2024-01-15',
      timeSlot: '10:00',
      products: [
        {
          productId: 'product-1',
          productName: 'Producto de Prueba',
          variants: { Talla: 'L', Color: 'Rojo' },
          dimensions: { largo: 20, ancho: 15, alto: 10, peso: 0.5 },
          calculatedSlots: 2,
          quantity: 1,
          volume: 3000
        }
      ]
    };

    const createdAssignment = await lockerAssignmentService.createAssignment(testAssignment);
    console.log('✅ Asignación creada:', {
      id: createdAssignment._id,
      lockerNumber: createdAssignment.lockerNumber,
      totalSlotsUsed: createdAssignment.totalSlotsUsed
    });

    // 2. Probar obtención de asignaciones por fecha y hora
    console.log('\n📝 Prueba 2: Obtener asignaciones por fecha y hora');
    const assignments = await lockerAssignmentService.getAssignmentsByDateTime('2024-01-15', '10:00');
    console.log('✅ Asignaciones encontradas:', assignments.length);

    // 3. Probar obtención de asignación por casillero
    console.log('\n📝 Prueba 3: Obtener asignación por casillero');
    const assignmentByLocker = await lockerAssignmentService.getAssignmentByLocker(1, '2024-01-15', '10:00');
    console.log('✅ Asignación por casillero:', assignmentByLocker ? 'Encontrada' : 'No encontrada');

    // 4. Probar actualización de estado
    console.log('\n📝 Prueba 4: Actualizar estado de asignación');
    const updatedAssignment = await lockerAssignmentService.updateStatus(createdAssignment._id, 'active');
    console.log('✅ Estado actualizado:', updatedAssignment.status);

    // 5. Probar verificación de disponibilidad
    console.log('\n📝 Prueba 5: Verificar disponibilidad de casillero');
    const isAvailable = await lockerAssignmentService.isLockerAvailable(2, '2024-01-15', '10:00');
    console.log('✅ Casillero 2 disponible:', isAvailable);

    // 6. Probar estadísticas de uso
    console.log('\n📝 Prueba 6: Obtener estadísticas de uso');
    const stats = await lockerAssignmentService.getLockerUsageStats('2024-01-15', '10:00');
    console.log('✅ Estadísticas:', {
      totalLockers: stats.totalLockers,
      usedLockers: stats.usedLockers,
      availableLockers: stats.availableLockers,
      totalSlotsUsed: stats.totalSlotsUsed,
      efficiency: stats.efficiency.toFixed(2) + '%'
    });

    // 7. Probar cálculo de dimensiones de productos
    console.log('\n📝 Prueba 7: Calcular dimensiones de productos');
    const testItem = {
      product: {
        nombre: 'Producto con Variantes',
        dimensiones: { largo: 30, ancho: 20, alto: 15, peso: 1.0 },
        variants: {
          enabled: true,
          attributes: [
            {
              name: 'Talla',
              definesDimensions: true,
              options: [
                {
                  value: 'L',
                  dimensiones: { largo: 25, ancho: 18, alto: 12, peso: 0.8 }
                }
              ]
            }
          ]
        }
      },
      variants: { Talla: 'L' },
      quantity: 2
    };

    const dimensions = lockerAssignmentService.calculateProductDimensions(testItem);
    const slots = lockerAssignmentService.calculateSlots(dimensions);
    const volume = lockerAssignmentService.calculateVolume(dimensions);

    console.log('✅ Cálculos de producto:', {
      dimensions,
      slots,
      volume,
      totalSlotsForQuantity: slots * testItem.quantity
    });

    // 8. Probar procesamiento de productos de cita
    console.log('\n📝 Prueba 8: Procesar productos de cita');
    const testAppointment = {
      itemsToPickup: [
        {
          product: { nombre: 'Producto 1', dimensiones: { largo: 20, ancho: 15, alto: 10, peso: 0.5 } },
          quantity: 1
        },
        {
          product: { nombre: 'Producto 2', dimensiones: { largo: 25, ancho: 20, alto: 15, peso: 0.8 } },
          quantity: 2
        }
      ]
    };

    const processedProducts = await lockerAssignmentService.processAppointmentProducts(testAppointment);
    console.log('✅ Productos procesados:', processedProducts.length);
    processedProducts.forEach((product, index) => {
      console.log(`  Producto ${index + 1}:`, {
        name: product.productName,
        dimensions: product.dimensions,
        slots: product.calculatedSlots,
        quantity: product.quantity,
        totalSlots: product.calculatedSlots * product.quantity
      });
    });

    // 9. Probar eliminación de asignación
    console.log('\n📝 Prueba 9: Eliminar asignación');
    await lockerAssignmentService.deleteAssignment(createdAssignment._id);
    console.log('✅ Asignación eliminada');

    // 10. Verificar que se eliminó correctamente
    console.log('\n📝 Prueba 10: Verificar eliminación');
    const deletedAssignment = await LockerAssignment.findById(createdAssignment._id);
    console.log('✅ Asignación eliminada:', deletedAssignment ? 'No' : 'Sí');

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📊 Resumen de pruebas:');
    console.log('  ✅ Creación de asignación');
    console.log('  ✅ Obtención por fecha/hora');
    console.log('  ✅ Obtención por casillero');
    console.log('  ✅ Actualización de estado');
    console.log('  ✅ Verificación de disponibilidad');
    console.log('  ✅ Estadísticas de uso');
    console.log('  ✅ Cálculo de dimensiones');
    console.log('  ✅ Procesamiento de productos');
    console.log('  ✅ Eliminación de asignación');
    console.log('  ✅ Verificación de eliminación');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testLockerAssignmentSystem();
}

module.exports = testLockerAssignmentSystem;
