const Qr = require('./models/qrModel');
const cron = require('node-cron');

// Función para actualizar QRs vencidos
async function updateExpiredQRs() {
  try {
    const now = new Date();
    
    // Actualizar QRs vencidos a estado 'vencido'
    const result = await Qr.updateMany(
      { status: 'disponible', vencimiento: { $lt: now } },
      { $set: { status: 'vencido' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[${new Date().toISOString()}] Se actualizaron ${result.modifiedCount} QRs vencidos`);
    }
    
  } catch (error) {
    console.error('Error al actualizar QRs vencidos:', error);
  }
}

// Función para limpiar QRs antiguos (opcional)
async function cleanupOldQRs() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Eliminar QRs que tienen más de 30 días y están vencidos o recogidos
    const deletedQRs = await Qr.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      status: { $in: ['vencido', 'recogido'] }
    });

    if (deletedQRs.deletedCount > 0) {
      console.log(`[${new Date().toISOString()}] Se eliminaron ${deletedQRs.deletedCount} QRs antiguos`);
    }
    
  } catch (error) {
    console.error('Error al limpiar QRs antiguos:', error);
  }
}

// Programar tareas
function scheduleTasks() {
  // Actualizar QRs vencidos cada hora
  cron.schedule('0 * * * *', async () => {
    console.log('Ejecutando tarea programada: Actualizar QRs vencidos');
    await updateExpiredQRs();
  });

  // Limpiar QRs antiguos cada día a las 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Ejecutando tarea programada: Limpiar QRs antiguos');
    await cleanupOldQRs();
  });

  console.log('Tareas programadas configuradas correctamente');
}

// Función para ejecutar tareas manualmente (útil para testing)
async function runTasksManually() {
  console.log('Ejecutando tareas manualmente...');
  await updateExpiredQRs();
  await cleanupOldQRs();
  console.log('Tareas manuales completadas');
}

module.exports = {
  scheduleTasks,
  updateExpiredQRs,
  cleanupOldQRs,
  runTasksManually
};
