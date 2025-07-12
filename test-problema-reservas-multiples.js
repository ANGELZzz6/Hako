const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NzFhYzM5YzM5YzM5YzM5YzM5YzM5IiwiaWF0IjoxNzM0NzI5NjAwLCJleHAiOjE3MzQ4MTYwMDB9.test';

// Headers para las peticiones
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TEST_USER_TOKEN}`
};

// Simular los datos que se envían desde el frontend
const mockAppointmentsData = [
  {
    orderId: "test-order-1",
    scheduledDate: "2025-07-12",
    timeSlot: "08:00",
    itemsToPickup: [
      {
        product: "producto-1-id",
        quantity: 1,
        lockerNumber: 1
      },
      {
        product: "producto-2-id", 
        quantity: 1,
        lockerNumber: 1
      },
      {
        product: "producto-3-id",
        quantity: 1,
        lockerNumber: 1
      },
      {
        product: "producto-4-id",
        quantity: 1,
        lockerNumber: 1
      },
      {
        product: "producto-5-id",
        quantity: 1,
        lockerNumber: 1
      }
    ]
  },
  {
    orderId: "test-order-1",
    scheduledDate: "2025-07-13", 
    timeSlot: "08:00",
    itemsToPickup: [
      {
        product: "producto-6-id",
        quantity: 1,
        lockerNumber: 2
      },
      {
        product: "producto-7-id",
        quantity: 1,
        lockerNumber: 2
      },
      {
        product: "producto-8-id",
        quantity: 1,
        lockerNumber: 2
      },
      {
        product: "producto-9-id",
        quantity: 1,
        lockerNumber: 2
      },
      {
        product: "producto-10-id",
        quantity: 1,
        lockerNumber: 2
      }
    ]
  }
];

async function testMultipleAppointments() {
  try {
    console.log('🧪 Iniciando prueba de múltiples reservas...');
    console.log('📊 Datos que se envían:', {
      totalAppointments: mockAppointmentsData.length,
      appointments: mockAppointmentsData.map(app => ({
        lockerNumber: app.itemsToPickup[0]?.lockerNumber,
        date: app.scheduledDate,
        time: app.timeSlot,
        products: app.itemsToPickup.length
      }))
    });

    // Hacer la petición al endpoint de múltiples reservas
    const response = await axios.post(
      `${BASE_URL}/appointments/multiple`,
      { appointments: mockAppointmentsData },
      { headers }
    );

    console.log('✅ Respuesta del servidor:', {
      status: response.status,
      message: response.data.message,
      appointmentsCreated: response.data.appointments?.length || 0,
      appointments: response.data.appointments
    });

    // Verificar que se crearon todas las reservas
    if (response.data.appointments && response.data.appointments.length === mockAppointmentsData.length) {
      console.log('🎉 ¡Éxito! Se crearon todas las reservas correctamente');
    } else {
      console.log('⚠️ Advertencia: No se crearon todas las reservas esperadas');
      console.log(`Esperadas: ${mockAppointmentsData.length}, Creadas: ${response.data.appointments?.length || 0}`);
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error en la prueba:', {
      message: error.response?.data?.error || error.message,
      status: error.response?.status,
      details: error.response?.data
    });
    
    if (error.response?.data?.details) {
      console.log('📋 Detalles de errores:', error.response.data.details);
    }
    
    throw error;
  }
}

// Función para verificar las reservas existentes
async function checkExistingAppointments() {
  try {
    console.log('\n🔍 Verificando reservas existentes...');
    
    const response = await axios.get(
      `${BASE_URL}/appointments/my-appointments`,
      { headers }
    );

    console.log('📅 Reservas encontradas:', response.data.length);
    response.data.forEach((appointment, index) => {
      console.log(`Reserva ${index + 1}:`, {
        id: appointment._id.slice(-6),
        date: appointment.scheduledDate,
        time: appointment.timeSlot,
        status: appointment.status,
        lockers: appointment.itemsToPickup?.map(item => item.lockerNumber).join(', '),
        products: appointment.itemsToPickup?.length || 0
      });
    });

    return response.data;

  } catch (error) {
    console.error('❌ Error al verificar reservas:', error.response?.data?.error || error.message);
    throw error;
  }
}

// Función principal
async function runTest() {
  try {
    console.log('🚀 Iniciando prueba completa de múltiples reservas...\n');
    
    // Verificar reservas existentes antes
    await checkExistingAppointments();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Crear múltiples reservas
    const result = await testMultipleAppointments();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Verificar reservas después de crear
    await checkExistingAppointments();
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('\n❌ Prueba falló:', error.message);
  }
}

// Ejecutar la prueba
if (require.main === module) {
  runTest();
}

module.exports = {
  testMultipleAppointments,
  checkExistingAppointments
}; 