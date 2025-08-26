const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hako', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Qr = require('./models/qrModel');

async function cleanupExpiredQRs() {
  try {
    console.log('🧹 Iniciando limpieza automática de QRs vencidos...');
    console.log(`⏰ ${new Date().toLocaleString('es-CO')}`);
    
    const now = new Date();
    
    // Buscar QRs vencidos que no estén marcados como recogidos
    const expiredQRs = await Qr.find({
      vencimiento: { $lt: now },
      status: { $ne: 'recogido' }
    });
    
    console.log(`📊 Encontrados ${expiredQRs.length} QRs vencidos`);
    
    if (expiredQRs.length === 0) {
      console.log('✅ No hay QRs vencidos para limpiar');
      return;
    }
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    for (const qr of expiredQRs) {
      try {
        // Marcar como vencido
        qr.status = 'vencido';
        await qr.save();
        cleanedCount++;
        console.log(`✅ QR ${qr.qr_id} marcado como vencido`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error marcando QR ${qr.qr_id}:`, error.message);
      }
    }
    
    console.log(`🎉 Limpieza completada:`);
    console.log(`  - Total procesados: ${expiredQRs.length}`);
    console.log(`  - Exitosos: ${cleanedCount}`);
    console.log(`  - Errores: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a la base de datos cerrada');
  }
}

// Ejecutar la limpieza
cleanupExpiredQRs();
