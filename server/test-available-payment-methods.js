const { MercadoPagoConfig } = require('mercadopago');

// Configuración
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534';
const mp = new MercadoPagoConfig({ accessToken });

console.log('=== VERIFICACIÓN DE MÉTODOS DE PAGO DISPONIBLES ===');
console.log('Access Token:', accessToken.substring(0, 20) + '...');
console.log('Entorno: PRUEBAS');
console.log('==================================================');

async function testPaymentMethods() {
  try {
    const { Payment } = require('mercadopago');
    const paymentClient = new Payment(mp);
    
    // Lista de métodos de pago comunes para Colombia
    const paymentMethods = [
      { id: 'pse', name: 'PSE (Pagos Seguros en Línea)', country: 'CO' },
      { id: 'credit_card', name: 'Tarjeta de Crédito', country: 'CO' },
      { id: 'debit_card', name: 'Tarjeta de Débito', country: 'CO' },
      { id: 'bank_transfer', name: 'Transferencia Bancaria', country: 'CO' },
      { id: 'cash', name: 'Efectivo', country: 'CO' },
      { id: 'rapipago', name: 'RapiPago', country: 'AR' },
      { id: 'pagofacil', name: 'PagoFácil', country: 'AR' },
      { id: 'oxxo', name: 'OXXO', country: 'MX' },
      { id: 'spei', name: 'SPEI', country: 'MX' }
    ];
    
    console.log('🔍 Probando métodos de pago...\n');
    
    const results = {
      available: [],
      unavailable: [],
      errors: []
    };
    
    for (const method of paymentMethods) {
      try {
        console.log(`Probando ${method.name} (${method.id})...`);
        
        // Datos de prueba básicos
        const testData = {
          transaction_amount: 1600,
          description: `Prueba ${method.name}`,
          payment_method_id: method.id,
          payer: {
            email: 'test_user_123456@testuser.com',
            identification: {
              type: 'CC',
              number: '12345678'
            },
            first_name: 'Test',
            last_name: 'User'
          }
        };
        
        // Agregar datos específicos según el método
        if (method.id === 'pse') {
          testData.transaction_details = { financial_institution: '1006' };
          testData.payer.entity_type = 'individual';
          testData.payer.address = {
            zip_code: '11011',
            street_name: 'Calle Principal',
            street_number: '123',
            neighborhood: 'Centro',
            city: 'Bogotá',
            federal_unit: 'Cundinamarca'
          };
          testData.payer.phone = {
            area_code: '300',
            number: '1234567'
          };
        } else if (method.id === 'credit_card' || method.id === 'debit_card') {
          testData.token = 'TEST-1234567890123456';
        }
        
        const payment = await paymentClient.create({ body: testData });
        
        if (payment.status === 'approved' || payment.status === 'pending' || payment.status === 'in_process') {
          results.available.push({
            method: method.name,
            id: method.id,
            status: payment.status,
            payment_id: payment.id
          });
          console.log(`  ✅ ${method.name} - DISPONIBLE (${payment.status})`);
        } else {
          results.unavailable.push({
            method: method.name,
            id: method.id,
            status: payment.status,
            reason: 'Status no válido'
          });
          console.log(`  ❌ ${method.name} - NO DISPONIBLE (${payment.status})`);
        }
        
      } catch (error) {
        const errorInfo = {
          method: method.name,
          id: method.id,
          error: error.message,
          code: error.error,
          cause: error.cause
        };
        
        results.errors.push(errorInfo);
        
        if (error.error === 'bad_request' && error.cause && error.cause[0]) {
          console.log(`  ❌ ${method.name} - Error ${error.cause[0].code}: ${error.cause[0].description}`);
        } else {
          console.log(`  ❌ ${method.name} - Error: ${error.message}`);
        }
      }
    }
    
    // Mostrar resultados
    console.log('\n=== RESULTADOS ===');
    
    if (results.available.length > 0) {
      console.log('\n✅ MÉTODOS DISPONIBLES:');
      results.available.forEach(method => {
        console.log(`  • ${method.method} (${method.id}) - ${method.status}`);
      });
    }
    
    if (results.unavailable.length > 0) {
      console.log('\n⚠️  MÉTODOS NO DISPONIBLES:');
      results.unavailable.forEach(method => {
        console.log(`  • ${method.method} (${method.id}) - ${method.reason}`);
      });
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERRORES ENCONTRADOS:');
      const errorCodes = {};
      results.errors.forEach(error => {
        if (error.cause && error.cause[0]) {
          const code = error.cause[0].code;
          if (!errorCodes[code]) errorCodes[code] = [];
          errorCodes[code].push(error.method);
        }
      });
      
      Object.keys(errorCodes).forEach(code => {
        console.log(`  • Error ${code}: ${errorCodes[code].join(', ')}`);
      });
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Total probados: ${paymentMethods.length}`);
    console.log(`  Disponibles: ${results.available.length}`);
    console.log(`  No disponibles: ${results.unavailable.length}`);
    console.log(`  Con errores: ${results.errors.length}`);
    
    if (results.available.length === 0) {
      console.log('\n🚨 NINGÚN MÉTODO DE PAGO DISPONIBLE');
      console.log('   Esto indica que:');
      console.log('   1. La cuenta no tiene métodos habilitados');
      console.log('   2. El Access Token no tiene permisos suficientes');
      console.log('   3. La cuenta está en modo sandbox con restricciones');
      console.log('\n   SOLUCIÓN: Contacta a soporte de Mercado Pago');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testPaymentMethods(); 