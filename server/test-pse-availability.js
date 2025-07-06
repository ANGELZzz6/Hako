const { MercadoPagoConfig } = require('mercadopago');

// Configuración para entorno de pruebas
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534';

const mp = new MercadoPagoConfig({
  accessToken: accessToken
});

async function testPSEAvailability() {
  console.log('=== VERIFICACIÓN DE DISPONIBILIDAD PSE ===');
  console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'NO CONFIGURADO');
  console.log('Entorno: PRUEBAS');
  console.log('==========================================');
  
  try {
    // Obtener métodos de pago disponibles
    console.log('📤 Consultando métodos de pago disponibles...');
    
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods/search?site_id=MCO', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const paymentMethods = await response.json();
    
    console.log('✅ Métodos de pago obtenidos exitosamente');
    console.log(`   Total de métodos: ${paymentMethods.length || 'No disponible'}`);
    
    // Verificar que paymentMethods sea un array
    if (!Array.isArray(paymentMethods)) {
      console.log('⚠️  Respuesta inesperada de la API:');
      console.log('   Tipo de respuesta:', typeof paymentMethods);
      console.log('   Contenido:', JSON.stringify(paymentMethods, null, 2));
      return false;
    }
    
    // Buscar PSE específicamente
    const pse = paymentMethods.find(method => method.id === 'pse');
    
    if (pse) {
      console.log('✅ PSE está disponible en tu cuenta');
      console.log('   ID:', pse.id);
      console.log('   Nombre:', pse.name);
      console.log('   Estado:', pse.status);
      console.log('   Monto mínimo:', pse.min_allowed_amount);
      console.log('   Monto máximo:', pse.max_allowed_amount);
      
      if (pse.financial_institutions && pse.financial_institutions.length > 0) {
        console.log(`   Bancos disponibles: ${pse.financial_institutions.length}`);
        console.log('   Primeros 5 bancos:');
        pse.financial_institutions.slice(0, 5).forEach(bank => {
          console.log(`     - ${bank.description} (${bank.id})`);
        });
      } else {
        console.log('   ⚠️  No hay bancos disponibles');
      }
      
      return true;
    } else {
      console.log('❌ PSE NO está disponible en tu cuenta');
      console.log('🔧 SOLUCIÓN:');
      console.log('   1. Ve a https://www.mercadopago.com/developers/panel');
      console.log('   2. Inicia sesión con tu cuenta');
      console.log('   3. Ve a "Configuración" → "Medios de pago"');
      console.log('   4. Busca PSE y habilítalo');
      console.log('   5. Si no aparece, contacta al soporte de Mercado Pago');
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verificando disponibilidad de PSE:');
    console.error('   Mensaje:', error.message);
    
    if (error.message.includes('401')) {
      console.error('🔧 SOLUCIÓN: Error de autenticación - Verifica el Access Token');
    } else if (error.message.includes('403')) {
      console.error('🔧 SOLUCIÓN: No tienes permisos para acceder a esta información');
    } else {
      console.error('🔧 SOLUCIÓN: Error de conexión - Verifica tu conexión a internet');
    }
    
    return false;
  }
}

// Ejecutar la verificación
testPSEAvailability()
  .then(available => {
    if (available) {
      console.log('\n✅ PSE está disponible');
      console.log('El problema puede estar en los datos enviados o en la configuración específica');
      process.exit(0);
    } else {
      console.log('\n❌ PSE no está disponible - Habilítalo en tu cuenta');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }); 