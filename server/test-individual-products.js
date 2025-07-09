const { connectDB } = require('./config/db');
const IndividualProduct = require('./models/IndividualProduct');
const Payment = require('../models/Payment');

async function testIndividualProducts() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await connectDB();
    
    console.log('🧪 Probando creación de productos individuales...');
    
    // Simular datos de un pago
    const mockPaymentInfo = {
      id: 'TEST_PAYMENT_123',
      status: 'approved',
      metadata: {
        user_id: '6865c8eadaea2368cc29a818',
        selected_items: [
          {
            id: '6857192c777fc0acb62e5150',
            title: 'Camisa Blanca',
            quantity: 1,
            unit_price: 10000
          }
        ]
      }
    };
    
    // Simular pago
    const mockPayment = {
      _id: 'test_payment_id',
      mp_payment_id: 'TEST_PAYMENT_123'
    };
    
    // Importar la función
    const { mercadoPagoWebhook } = require('./controllers/paymentController');
    
    // Contar productos individuales antes
    const beforeCount = await IndividualProduct.countDocuments();
    console.log(`📊 Productos individuales antes: ${beforeCount}`);
    
    // Simular la creación (esto no funcionará directamente, pero podemos probar la lógica)
    console.log('📦 Simulando creación de productos individuales...');
    console.log('Productos a crear:', mockPaymentInfo.metadata.selected_items);
    
    // Verificar si ya existen productos para este pago
    const existingProducts = await IndividualProduct.find({
      'payment.mp_payment_id': mockPaymentInfo.id
    });
    
    console.log(`🔍 Productos existentes para pago ${mockPaymentInfo.id}: ${existingProducts.length}`);
    
    // Contar productos individuales después
    const afterCount = await IndividualProduct.countDocuments();
    console.log(`📊 Productos individuales después: ${afterCount}`);
    
    console.log('✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la prueba
testIndividualProducts(); 