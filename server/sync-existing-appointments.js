const mongoose = require('mongoose');
const LockerAssignment = require('./models/LockerAssignment');
const Appointment = require('./models/Appointment');
const lockerAssignmentService = require('./services/lockerAssignmentService');

// Configurar zona horaria
process.env.TZ = 'America/Bogota';

async function syncExistingAppointments() {
  try {
    console.log('🔄 Iniciando sincronización de citas existentes...');
    
    // Verificar si ya hay una conexión activa
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ No hay conexión activa a MongoDB, conectando...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Conectado a MongoDB');
    } else {
      console.log('✅ Usando conexión existente a MongoDB');
    }

    // Obtener todas las citas que no tienen asignaciones correspondientes
    const appointments = await Appointment.find({
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('user', 'nombre email');

    console.log(`📅 Encontradas ${appointments.length} citas para sincronizar`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      try {
        // Verificar si ya existe una asignación para esta cita
        const existingAssignment = await LockerAssignment.findOne({
          appointmentId: appointment._id.toString()
        });

        if (existingAssignment) {
          console.log(`⚠️ Ya existe asignación para la cita ${appointment._id}`);
          continue;
        }

        console.log(`🔄 Sincronizando cita ${appointment._id}...`);

        // Usar el servicio para sincronizar esta cita específica
        const result = await lockerAssignmentService.syncFromAppointments(appointment.scheduledDate);
        
        // Verificar si se creó la asignación
        const newAssignment = await LockerAssignment.findOne({
          appointmentId: appointment._id.toString()
        });

        if (newAssignment) {
          console.log(`✅ Asignación creada para cita ${appointment._id} en casillero ${newAssignment.lockerNumber}`);
          syncedCount++;
        } else {
          console.log(`❌ No se pudo crear asignación para cita ${appointment._id}`);
          errorCount++;
        }

      } catch (error) {
        console.error(`❌ Error sincronizando cita ${appointment._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 RESUMEN DE SINCRONIZACIÓN:');
    console.log(`✅ Citas sincronizadas exitosamente: ${syncedCount}`);
    console.log(`❌ Citas con errores: ${errorCount}`);
    console.log(`📅 Total de citas procesadas: ${appointments.length}`);

    // Mostrar estadísticas finales
    const totalAssignments = await LockerAssignment.countDocuments();
    console.log(`📦 Total de asignaciones en la base de datos: ${totalAssignments}`);

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    throw error; // Re-lanzar el error para que el endpoint pueda manejarlo
  } finally {
    // Solo cerrar la conexión si la abrimos nosotros
    if (mongoose.connection.readyState === 1) {
      // Verificar si hay otros procesos usando la conexión
      // En un entorno de servidor, no cerramos la conexión principal
      console.log('🔌 Manteniendo conexión activa para el servidor');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  syncExistingAppointments();
}

module.exports = syncExistingAppointments;
