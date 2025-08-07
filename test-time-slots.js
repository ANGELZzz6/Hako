// Script de prueba para verificar horarios disponibles
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testTimeSlots() {
  try {
    console.log('🧪 Iniciando prueba de horarios disponibles...');
    
    // Obtener fecha actual en formato YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log('📅 Fecha de prueba:', dateStr);
    console.log('🕐 Hora actual:', today.toLocaleTimeString());
    
    // Simular una petición al endpoint de horarios disponibles
    const response = await axios.get(`${BASE_URL}/appointments/available-slots/${dateStr}`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Necesitarás un token válido
      }
    });
    
    console.log('✅ Respuesta del servidor:');
    console.log('  Fecha consultada:', response.data.date);
    console.log('  Horarios disponibles:', response.data.timeSlots.map(slot => slot.time));
    console.log('  Total de horarios:', response.data.timeSlots.length);
    
    // Verificar que no hay horarios del pasado
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const pastSlots = response.data.timeSlots.filter(slot => {
      const [hours, minutes] = slot.time.split(':');
      const slotHour = parseInt(hours);
      const slotMinute = parseInt(minutes);
      return slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute);
    });
    
    if (pastSlots.length > 0) {
      console.log('❌ ERROR: Se encontraron horarios del pasado:', pastSlots.map(s => s.time));
    } else {
      console.log('✅ CORRECTO: No hay horarios del pasado');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
  }
}

// Ejecutar la prueba
testTimeSlots();
