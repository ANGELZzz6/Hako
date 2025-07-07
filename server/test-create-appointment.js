const fetch = require('node-fetch');

async function testCreateAppointment() {
  try {
    console.log('🧪 Probando creación de cita...');
    
    // Datos de prueba
    const appointmentData = {
      orderId: '507f1f77bcf86cd799439011', // ID de prueba
      scheduledDate: '2025-01-15',
      timeSlot: '10:00',
      itemsToPickup: [
        {
          product: '507f1f77bcf86cd799439012',
          quantity: 1,
          lockerNumber: 1
        }
      ]
    };
    
    console.log('📤 Enviando datos:', JSON.stringify(appointmentData, null, 2));
    
    const response = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de prueba
      },
      body: JSON.stringify(appointmentData)
    });
    
    console.log('📡 Status:', response.status);
    console.log('📡 Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('📡 Response Body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Cita creada exitosamente:', data);
    } else {
      console.log('❌ Error al crear cita');
    }
    
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    console.log('💡 Asegúrate de que el servidor esté ejecutándose en puerto 5000');
  }
}

// Ejecutar la prueba
testCreateAppointment(); 