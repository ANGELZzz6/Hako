// Script para probar el endpoint del carrito
const API_URL = 'http://localhost:5000/api';

async function testCartEndpoint() {
  console.log('=== PRUEBA DEL ENDPOINT DEL CARRITO ===\n');

  try {
    // 1. Probar endpoint sin autenticación (debería fallar)
    console.log('1. Probando endpoint sin autenticación...');
    const response1 = await fetch(`${API_URL}/cart`);
    console.log('Status:', response1.status);
    console.log('Response:', await response1.text());
    
    // 2. Probar con headers básicos
    console.log('\n2. Probando con headers básicos...');
    const response2 = await fetch(`${API_URL}/cart`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token'
      }
    });
    console.log('Status:', response2.status);
    console.log('Response:', await response2.text());

    console.log('\n=== INSTRUCCIONES PARA PROBAR ===');
    console.log('1. Asegúrate de que el servidor esté corriendo: npm start');
    console.log('2. Inicia sesión en la aplicación');
    console.log('3. Abre la consola del navegador (F12)');
    console.log('4. Ve a la página de checkout');
    console.log('5. Revisa los logs en la consola');
    console.log('6. Si hay errores, verifica:');
    console.log('   - Que el token de autenticación sea válido');
    console.log('   - Que tengas productos en el carrito');
    console.log('   - Que el servidor esté respondiendo correctamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testCartEndpoint(); 