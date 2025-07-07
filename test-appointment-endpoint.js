const fetch = require('node-fetch');

async function testAppointmentEndpoint() {
  try {
    console.log('🧪 Probando endpoint de citas...');
    
    // Probar la ruta de horarios disponibles
    const response = await fetch('http://localhost:5000/api/appointments/available-slots/2025-01-15', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de prueba
      }
    });
    
    console.log('📡 Status:', response.status);
    console.log('📡 Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Respuesta exitosa:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    console.log('💡 Asegúrate de que el servidor esté ejecutándose en puerto 5000');
  }
}

// Ejecutar la prueba
testAppointmentEndpoint(); 