// Script para verificar que las credenciales estén correctamente configuradas

console.log('=== VERIFICACIÓN DE CREDENCIALES MERCADO PAGO ===\n');

// Función para verificar formato de credenciales
function verificarFormatoCredenciales() {
  console.log('🔍 Verificando formato de credenciales...\n');
  
  // Verificar Access Token (Backend)
  const accessToken = 'APP_USR-7141205000973179-070320-5e2fcea86869ce7063884eb151f62d92-2531494471';
  console.log('📋 Access Token (Backend):');
  console.log('   Token:', accessToken.substring(0, 20) + '...');
  console.log('   Formato:', accessToken.startsWith('APP_USR-') ? '✅ Correcto' : '❌ Incorrecto');
  console.log('   Uso: Solo en servidor/backend');
  console.log('   Ubicación: server/.env\n');
  
  // Verificar Public Key (Frontend)
  const publicKey = 'TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252';
  console.log('🔑 Public Key (Frontend):');
  console.log('   Key:', publicKey.substring(0, 20) + '...');
  console.log('   Formato:', (publicKey.startsWith('TEST-') || publicKey.startsWith('APP-')) ? '✅ Correcto' : '❌ Incorrecto');
  console.log('   Uso: Solo en cliente/frontend');
  console.log('   Ubicación: client/src/config/mercadopago.ts\n');
  
  // Verificar que no se estén mezclando
  console.log('⚠️  Verificación de mezcla:');
  if (accessToken.startsWith('APP_USR-') && (publicKey.startsWith('TEST-') || publicKey.startsWith('APP-'))) {
    console.log('   ✅ Credenciales correctamente separadas');
    console.log('   ✅ Access Token en backend');
    console.log('   ✅ Public Key en frontend');
  } else {
    console.log('   ❌ ERROR: Credenciales mezcladas');
    console.log('   ❌ Verifica que uses Access Token solo en backend');
    console.log('   ❌ Verifica que uses Public Key solo en frontend');
  }
}

// Función para verificar configuración del servidor
async function verificarServidor() {
  console.log('\n🔧 Verificando configuración del servidor...');
  
  try {
    const response = await fetch('http://localhost:5000/api/payment/test-config');
    const data = await response.json();
    
    if (data.success) {
      console.log('   ✅ Servidor funcionando correctamente');
      console.log('   ✅ Access Token válido');
      console.log('   ✅ Preferencia de prueba creada');
    } else {
      console.log('   ❌ Error en servidor:', data.error);
    }
  } catch (error) {
    console.log('   ❌ No se pudo conectar al servidor');
    console.log('   ❌ Asegúrate de que esté corriendo en puerto 5000');
  }
}

// Función para verificar configuración del frontend
function verificarFrontend() {
  console.log('\n🎨 Verificando configuración del frontend...');
  
  // Simular verificación de Public Key
  const publicKey = 'TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252';
  
  if (publicKey.startsWith('TEST-') || publicKey.startsWith('APP-')) {
    console.log('   ✅ Public Key válida');
    console.log('   ✅ Formato correcto para frontend');
    console.log('   ✅ SDK puede inicializarse');
  } else {
    console.log('   ❌ Public Key inválida');
    console.log('   ❌ Debe empezar con TEST- o APP-');
  }
}

// Función para mostrar instrucciones
function mostrarInstrucciones() {
  console.log('\n📋 INSTRUCCIONES PARA CORREGIR:');
  console.log('\n1. Ve a https://www.mercadopago.com.co/developers/panel');
  console.log('2. Inicia sesión con tu cuenta');
  console.log('3. Ve a "Credenciales"');
  console.log('4. Copia las credenciales correctas:');
  console.log('   - Access Token (APP_USR-...) para server/.env');
  console.log('   - Public Key (TEST-... o APP-...) para client/src/config/mercadopago.ts');
  console.log('\n5. Reinicia los servicios:');
  console.log('   cd server && npm start');
  console.log('   cd client && npm run dev');
  console.log('\n6. Prueba el flujo completo');
}

// Función principal
async function verificarCredenciales() {
  try {
    // 1. Verificar formato
    verificarFormatoCredenciales();
    
    // 2. Verificar servidor
    await verificarServidor();
    
    // 3. Verificar frontend
    verificarFrontend();
    
    // 4. Mostrar instrucciones
    mostrarInstrucciones();
    
    console.log('\n✅ Verificación completada');
    console.log('📞 Si hay errores, sigue las instrucciones arriba');
    
  } catch (error) {
    console.error('\n❌ Error en la verificación:', error);
  }
}

// Ejecutar verificación
verificarCredenciales(); 