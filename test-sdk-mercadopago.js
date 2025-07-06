// Script para verificar el SDK de Mercado Pago en el frontend

console.log('=== VERIFICACIÓN DEL SDK DE MERCADO PAGO ===\n');

// Función para cargar el SDK dinámicamente
function loadMercadoPagoSDK() {
  return new Promise((resolve, reject) => {
    // Verificar si ya está cargado
    if (window.MercadoPago) {
      console.log('✅ SDK de Mercado Pago ya cargado');
      resolve();
      return;
    }

    console.log('📥 Cargando SDK de Mercado Pago...');
    
    // Cargar SDK dinámicamente
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => {
      console.log('✅ SDK de Mercado Pago cargado exitosamente');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Error cargando SDK de Mercado Pago');
      reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
    };
    document.body.appendChild(script);
  });
}

// Función para probar la inicialización
function testMercadoPagoInitialization() {
  try {
    const PUBLIC_KEY = 'TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252';
    
    console.log('🔧 Inicializando Mercado Pago...');
    console.log('   Public Key:', PUBLIC_KEY.substring(0, 20) + '...');
    
    const mp = new window.MercadoPago(PUBLIC_KEY, {
      locale: 'es-CO',
      advancedFraudPrevention: false
    });
    
    console.log('✅ Mercado Pago inicializado correctamente');
    console.log('   Instancia creada:', !!mp);
    
    return mp;
  } catch (error) {
    console.error('❌ Error inicializando Mercado Pago:', error);
    throw error;
  }
}

// Función para probar la creación de preferencia
async function testPreferenceCreation() {
  try {
    console.log('\n🧪 Probando creación de preferencia...');
    
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

    const response = await fetch('http://localhost:5000/api/payment/create_preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: testItems,
        payer: testPayer,
        external_reference: `TEST_SDK_${Date.now()}`
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Preferencia creada exitosamente');
      console.log('   ID:', data.preference_id);
      console.log('   URL:', data.init_point);
      return data;
    } else {
      console.error('❌ Error creando preferencia:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Error en test de preferencia:', error);
    throw error;
  }
}

// Función principal de prueba
async function runSDKTest() {
  try {
    // 1. Cargar SDK
    await loadMercadoPagoSDK();
    
    // 2. Probar inicialización
    const mp = testMercadoPagoInitialization();
    
    // 3. Probar creación de preferencia
    const preference = await testPreferenceCreation();
    
    // 4. Probar checkout (opcional)
    console.log('\n🎯 SDK listo para usar');
    console.log('   Puedes usar la instancia de Mercado Pago para crear checkouts');
    console.log('   Preferencia ID:', preference.preference_id);
    
    // 5. Instrucciones para el usuario
    console.log('\n=== INSTRUCCIONES PARA PROBAR ===');
    console.log('1. Ve a tu aplicación y agrega productos al carrito');
    console.log('2. Ve al checkout');
    console.log('3. Verifica que el SDK se cargue correctamente');
    console.log('4. Prueba el flujo de pago completo');
    console.log('5. Usa cuentas de prueba para pagar');
    
    return { success: true, mp, preference };
    
  } catch (error) {
    console.error('\n❌ Error en la verificación del SDK:', error);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verifica que el servidor esté corriendo');
    console.log('2. Verifica que las credenciales sean correctas');
    console.log('3. Revisa la consola del navegador para errores');
    console.log('4. Asegúrate de que el SDK se cargue correctamente');
    
    return { success: false, error };
  }
}

// Ejecutar la prueba si estamos en el navegador
if (typeof window !== 'undefined') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSDKTest);
  } else {
    runSDKTest();
  }
} else {
  console.log('Este script debe ejecutarse en el navegador');
  console.log('Abre la consola del navegador (F12) y ejecuta:');
  console.log('runSDKTest()');
} 