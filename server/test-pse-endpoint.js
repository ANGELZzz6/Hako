const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

console.log('=== PRUEBA DEL ENDPOINT PSE ===');
console.log('Probando endpoint: http://localhost:3001/api/payment/create_pse_preference');
console.log('================================');

async function testPSEEndpoint() {
  try {
    const testData = {
      amount: 1600,
      description: 'Prueba PSE desde endpoint',
      payerEmail: 'test@example.com',
      payerName: 'Usuario de Prueba'
    };
    
    console.log('Datos a enviar:', JSON.stringify(testData, null, 2));
    console.log('\n📤 Enviando petición al servidor...');
    
    const response = await fetch('http://localhost:3001/api/payment/create_pse_preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Status de respuesta:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('\n✅ RESPUESTA EXITOSA');
      console.log('=====================');
      console.log('Success:', responseData.success);
      console.log('Preference ID:', responseData.preference_id);
      console.log('Init Point:', responseData.init_point);
      console.log('Sandbox Init Point:', responseData.sandbox_init_point);
      console.log('Message:', responseData.message);
      
      console.log('\n🔗 ENLACES PARA PROBAR:');
      console.log('URL de sandbox:', responseData.sandbox_init_point);
      console.log('URL de producción:', responseData.init_point);
      
    } else {
      console.log('\n❌ RESPUESTA CON ERROR');
      console.log('======================');
      console.log('Success:', responseData.success);
      console.log('Message:', responseData.message);
      console.log('Error Code:', responseData.error_code);
      console.log('Error Description:', responseData.error_description);
    }
    
    return responseData;
    
  } catch (error) {
    console.error('\n💥 ERROR DE CONEXIÓN');
    console.error('====================');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 SOLUCIÓN:');
      console.error('   El servidor no está ejecutándose en el puerto 3001');
      console.error('   1. Asegúrate de que el servidor esté corriendo');
      console.error('   2. Ejecuta: npm start o node server.js');
      console.error('   3. Verifica que el puerto 3001 esté disponible');
    }
    
    throw error;
  }
}

// Ejecutar prueba
testPSEEndpoint()
  .then(data => {
    console.log('\n🎉 PRUEBA COMPLETADA');
    if (data.success) {
      console.log('El endpoint funciona correctamente');
    } else {
      console.log('El endpoint devolvió un error');
    }
  })
  .catch(error => {
    console.log('\n💥 PRUEBA FALLÓ');
    console.log('No se pudo conectar al endpoint');
    process.exit(1);
  }); 