const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuración para entorno de pruebas
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-3997869409987199-070320-5f0b936cb84305d1e5215b576d609165-544117534';

const mp = new MercadoPagoConfig({
  accessToken: accessToken
});

const paymentClient = new Payment(mp);

// Lista de bancos PSE comunes en Colombia
const testBanks = [
  { id: '1006', name: 'Banco Agrario' },
  { id: '1007', name: 'Banco AV Villas' },
  { id: '1009', name: 'Banco Caja Social' },
  { id: '1012', name: 'Banco Colpatria' },
  { id: '1013', name: 'Banco Cooperativo Coopcentral' },
  { id: '1014', name: 'Banco Corpbanca' },
  { id: '1015', name: 'Banco de Bogotá' },
  { id: '1016', name: 'Banco de Occidente' },
  { id: '1017', name: 'Banco Popular' },
  { id: '1018', name: 'Banco Santander' },
  { id: '1019', name: 'Banco Serfinanza' },
  { id: '1020', name: 'Banco Tequendama' },
  { id: '1021', name: 'Banco Unión Colombiano' },
  { id: '1022', name: 'Bancolombia' },
  { id: '1023', name: 'BBVA Colombia' },
  { id: '1024', name: 'Citibank Colombia' },
  { id: '1025', name: 'Colmena BCSC' },
  { id: '1026', name: 'Davivienda' },
  { id: '1027', name: 'Helm Bank' },
  { id: '1028', name: 'HSBC Colombia' },
  { id: '1029', name: 'Itaú Colombia' },
  { id: '1030', name: 'Scotiabank Colpatria' }
];

async function testBank(bankId, bankName) {
  const testPaymentData = {
    transaction_amount: 1600,
    description: 'Prueba PSE',
    payment_method_id: 'pse',
    payer: {
      entity_type: 'individual',
      email: 'test_user_123456@testuser.com',
      identification: {
        type: 'CC',
        number: '12345678'
      },
      first_name: 'Test',
      last_name: 'User',
      address: {
        zip_code: '11011',
        street_name: 'Calle Principal',
        street_number: '123',
        neighborhood: 'Centro',
        city: 'Bogotá',
        federal_unit: 'Cundinamarca'
      },
      phone: {
        area_code: '300',
        number: '1234567'
      }
    },
    additional_info: {
      ip_address: '127.0.0.1'
    },
    transaction_details: {
      financial_institution: bankId
    },
    // URLs requeridas para PSE según documentación oficial
    callback_url: 'https://httpbin.org/status/200',
    notification_url: 'https://webhook.site/your-unique-url' // Obligatoria según documentación
  };
  
  try {
    const payment = await paymentClient.create({ body: testPaymentData });
    return {
      success: true,
      bankId,
      bankName,
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail
    };
  } catch (error) {
    return {
      success: false,
      bankId,
      bankName,
      error: error.message,
      errorCode: error.cause?.[0]?.code,
      errorDesc: error.cause?.[0]?.description
    };
  }
}

async function testAllBanks() {
  console.log('=== PRUEBA DE BANCOS PSE DISPONIBLES ===');
  console.log('Probando', testBanks.length, 'bancos...');
  console.log('==========================================');
  
  const results = [];
  
  for (const bank of testBanks) {
    console.log(`Probando ${bank.name} (${bank.id})...`);
    const result = await testBank(bank.id, bank.name);
    results.push(result);
    
    // Pequeña pausa para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== RESULTADOS ===');
  
  const successfulBanks = results.filter(r => r.success);
  const failedBanks = results.filter(r => !r.success);
  
  console.log(`✅ Bancos exitosos: ${successfulBanks.length}`);
  console.log(`❌ Bancos fallidos: ${failedBanks.length}`);
  
  if (successfulBanks.length > 0) {
    console.log('\n✅ BANCOS DISPONIBLES:');
    successfulBanks.forEach(bank => {
      console.log(`   ${bank.bankName} (${bank.bankId}) - Status: ${bank.status}`);
    });
  }
  
  if (failedBanks.length > 0) {
    console.log('\n❌ BANCOS NO DISPONIBLES:');
    failedBanks.forEach(bank => {
      console.log(`   ${bank.bankName} (${bank.bankId}) - Error: ${bank.errorCode || bank.error}`);
    });
  }
  
  // Mostrar errores más comunes
  const errorCounts = {};
  failedBanks.forEach(bank => {
    const errorKey = bank.errorCode || bank.error;
    errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
  });
  
  if (Object.keys(errorCounts).length > 0) {
    console.log('\n📊 ERRORES MÁS COMUNES:');
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([error, count]) => {
        console.log(`   ${error}: ${count} bancos`);
      });
  }
  
  return {
    total: testBanks.length,
    successful: successfulBanks.length,
    failed: failedBanks.length,
    successfulBanks,
    failedBanks
  };
}

// Ejecutar la prueba
testAllBanks()
  .then(results => {
    console.log('\n🎉 Prueba completada');
    console.log(`Total: ${results.total}, Exitosos: ${results.successful}, Fallidos: ${results.failed}`);
    
    if (results.successful > 0) {
      console.log('✅ Hay bancos disponibles para PSE');
      process.exit(0);
    } else {
      console.log('❌ No hay bancos disponibles para PSE');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }); 