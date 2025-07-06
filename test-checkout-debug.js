// Script de prueba para verificar el flujo de checkout
const API_URL = 'http://localhost:5000/api';

async function testCheckoutFlow() {
  console.log('=== PRUEBA DE FLUJO DE CHECKOUT ===\n');

  try {
    // 1. Probar configuración de Mercado Pago
    console.log('1. Probando configuración de Mercado Pago...');
    const configResponse = await fetch(`${API_URL}/payment/test-config`);
    const configData = await configResponse.json();
    console.log('✅ Configuración:', configData.success ? 'OK' : 'ERROR');
    if (!configData.success) {
      console.log('❌ Error:', configData.error);
      return;
    }

    // 2. Probar creación de preferencia con datos de prueba
    console.log('\n2. Probando creación de preferencia...');
    const testItems = [
      {
        title: 'Producto de Prueba',
        unit_price: 1000,
        quantity: 1
      }
    ];

    const testPayer = {
      email: 'test@test.com',
      name: 'Usuario Test',
      identification: {
        type: 'CC',
        number: '12345678'
      }
    };

    const preferenceResponse = await fetch(`${API_URL}/payment/create_preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: testItems,
        payer: testPayer,
        external_reference: `TEST_${Date.now()}`
      })
    });

    const preferenceData = await preferenceResponse.json();
    console.log('✅ Preferencia creada:', preferenceData.success ? 'OK' : 'ERROR');
    if (preferenceData.success) {
      console.log('   ID:', preferenceData.preference_id);
      console.log('   URL:', preferenceData.init_point);
    } else {
      console.log('❌ Error:', preferenceData.message);
    }

    // 3. Probar endpoint del carrito (requiere autenticación)
    console.log('\n3. Probando endpoint del carrito...');
    console.log('⚠️  Este test requiere autenticación. Verifica que:');
    console.log('   - El servidor esté corriendo en puerto 5000');
    console.log('   - Tengas un usuario autenticado');
    console.log('   - Tengas productos en el carrito');

    console.log('\n=== INSTRUCCIONES PARA PROBAR ===');
    console.log('1. Asegúrate de que el servidor esté corriendo: npm start');
    console.log('2. Inicia sesión en la aplicación');
    console.log('3. Agrega productos al carrito');
    console.log('4. Ve a la página de checkout');
    console.log('5. Verifica en la consola del navegador si hay errores');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testCheckoutFlow(); 