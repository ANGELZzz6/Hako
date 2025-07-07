console.log('🧪 Probando importación del controlador...');

try {
  const appointmentController = require('./controllers/appointmentController');
  console.log('✅ Controlador importado correctamente');
  console.log('📋 Métodos disponibles:', Object.keys(appointmentController));
  
  // Verificar que todos los métodos sean funciones
  const methods = [
    'getAvailableTimeSlots',
    'createAppointment', 
    'getMyAppointments',
    'getMyAppointment',
    'cancelAppointment',
    'getAllAppointments',
    'updateAppointmentStatus',
    'getAppointmentStats'
  ];
  
  methods.forEach(method => {
    if (typeof appointmentController[method] === 'function') {
      console.log(`✅ ${method}: OK`);
    } else {
      console.log(`❌ ${method}: NO es una función`);
    }
  });
  
} catch (error) {
  console.log('❌ Error al importar controlador:', error.message);
} 