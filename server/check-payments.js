const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkPayments() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los pagos
    const allPayments = await Payment.find().populate('user_id');
    console.log(`💰 Total de pagos en la base de datos: ${allPayments.length}`);

    // Mostrar detalles de cada pago
    for (const payment of allPayments) {
      console.log(`\n🔄 Pago ID: ${payment._id}`);
      console.log(`   Usuario: ${payment.user_id?.email || payment.user_id}`);
      console.log(`   Estado: ${payment.status}`);
      console.log(`   Monto: $${payment.amount}`);
      console.log(`   Fecha: ${payment.date_created}`);
      console.log(`   MP Payment ID: ${payment.mp_payment_id}`);
      console.log(`   External Reference: ${payment.external_reference}`);
    }

    // Verificar pagos por estado
    const approvedPayments = await Payment.find({ status: 'approved' });
    const pendingPayments = await Payment.find({ status: 'pending' });
    const rejectedPayments = await Payment.find({ status: 'rejected' });
    
    console.log(`\n📊 Pagos por estado:`);
    console.log(`   Aprobados: ${approvedPayments.length}`);
    console.log(`   Pendientes: ${pendingPayments.length}`);
    console.log(`   Rechazados: ${rejectedPayments.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
checkPayments(); 