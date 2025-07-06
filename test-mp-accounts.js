// Script para verificar la configuración de cuentas de prueba de Mercado Pago
const API_URL = 'http://localhost:5000/api';

async function testMercadoPagoAccounts() {
  console.log('=== VERIFICACIÓN DE CUENTAS DE PRUEBA MERCADO PAGO ===\n');

  try {
    // 1. Verificar configuración del servidor
    console.log('1. Verificando configuración del servidor...');
    const configResponse = await fetch(`${API_URL}/payment/test-config`);
    const configData = await configResponse.json();
    
    if (configData.success) {
      console.log('✅ Configuración del servidor: OK');
      console.log('   Token:', configData.preference_id ? 'Válido' : 'Inválido');
      console.log('   URL de prueba:', configData.init_point);
    } else {
      console.log('❌ Error en configuración:', configData.error);
      return;
    }

    // 2. Crear preferencia de prueba
    console.log('\n2. Creando preferencia de prueba...');
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
    
    if (preferenceData.success) {
      console.log('✅ Preferencia creada exitosamente');
      console.log('   ID:', preferenceData.preference_id);
      console.log('   URL de pago:', preferenceData.init_point);
    } else {
      console.log('❌ Error creando preferencia:', preferenceData.message);
      return;
    }

    // 3. Instrucciones para el usuario
    console.log('\n=== INSTRUCCIONES PARA PROBAR ===');
    console.log('1. Copia esta URL y ábrela en tu navegador:');
    console.log(`   ${preferenceData.init_point}`);
    console.log('\n2. IMPORTANTE: Usa SOLO cuentas de prueba');
    console.log('   - NO uses tu cuenta real de Mercado Pago');
    console.log('   - Inicia sesión con tu cuenta de prueba comprador');
    console.log('\n3. Métodos de pago de prueba disponibles:');
    console.log('   - Tarjetas: 4509 9535 6623 3704 (CVV: 123)');
    console.log('   - PSE: Cualquier banco, documento: 12345678');
    console.log('   - Efectivo: Cualquier código de referencia');
    console.log('\n4. Si ves el error "Una de las partes es de prueba":');
    console.log('   - Verifica que uses credenciales de prueba (TEST-)');
    console.log('   - Usa solo cuentas de prueba para pagar');
    console.log('   - No mezcles cuentas reales con cuentas de prueba');

    // 4. Verificar configuración de cuentas
    console.log('\n=== VERIFICACIÓN DE CONFIGURACIÓN ===');
    console.log('Para que funcione correctamente, asegúrate de:');
    console.log('✅ Tener credenciales de prueba (empiezan con TEST-)');
    console.log('✅ Tener cuenta vendedor de prueba creada');
    console.log('✅ Tener cuenta comprador de prueba creada');
    console.log('✅ Ambas cuentas sean del mismo país (Colombia)');
    console.log('✅ La cuenta comprador tenga saldo suficiente');

  } catch (error) {
    console.error('❌ Error en la verificación:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verifica que el servidor esté corriendo');
    console.log('2. Verifica que las credenciales sean correctas');
    console.log('3. Revisa la configuración de Mercado Pago');
  }
}

// Ejecutar la verificación
testMercadoPagoAccounts(); 