const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde el directorio padre
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Payment = require('./models/Payment');
const Order = require('./models/Order');

async function fixPaymentsPurchasedItems() {
  try {
    console.log('🔧 Iniciando reparación de purchased_items en pagos...');
    
    // Verificar si tenemos la URI de MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI no está configurado en las variables de entorno');
      return;
    }
    
    // Conectar a la base de datos
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener todos los pagos
    const payments = await Payment.find({});
    console.log(`📊 Encontrados ${payments.length} pagos`);
    
    let updatedCount = 0;
    
    for (const payment of payments) {
      console.log(`\n🔍 Procesando pago: ${payment.mp_payment_id}`);
      
      // Si el pago no tiene purchased_items, intentar obtenerlos de la orden
      if (!payment.purchased_items || payment.purchased_items.length === 0) {
        console.log('  ⚠️ Pago sin purchased_items, buscando en orden...');
        
        // Buscar orden asociada
        const order = await Order.findOne({
          'payment.mp_payment_id': payment.mp_payment_id
        }).populate('items.product');
        
        if (order && order.items.length > 0) {
          // Crear purchased_items desde la orden
          const purchasedItems = order.items.map(item => ({
            product_id: item.product._id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            product_name: item.product.title || item.product.nombre
          }));
          
          // Actualizar el pago
          payment.purchased_items = purchasedItems;
          await payment.save();
          
          console.log(`  ✅ Actualizado con ${purchasedItems.length} productos`);
          updatedCount++;
        } else {
          console.log('  ❌ No se encontró orden asociada');
        }
      } else {
        // Verificar si hay purchased_items con product_id inválidos
        const validItems = payment.purchased_items.filter(item => 
          item.product_id && 
          (typeof item.product_id === 'object' || typeof item.product_id === 'string')
        );
        
        if (validItems.length !== payment.purchased_items.length) {
          console.log(`  ⚠️ Encontrados ${payment.purchased_items.length - validItems.length} items inválidos`);
          
          // Actualizar solo con items válidos
          payment.purchased_items = validItems;
          await payment.save();
          
          console.log(`  ✅ Limpiado, quedaron ${validItems.length} items válidos`);
          updatedCount++;
        } else {
          console.log('  ✅ Pago ya tiene purchased_items válidos');
        }
      }
    }
    
    console.log(`\n🎉 Reparación completada!`);
    console.log(`📊 Pagos actualizados: ${updatedCount}`);
    
    // Mostrar estadísticas finales
    const totalPayments = await Payment.countDocuments();
    const paymentsWithItems = await Payment.countDocuments({
      'purchased_items.0': { $exists: true }
    });
    
    console.log(`📊 Total de pagos: ${totalPayments}`);
    console.log(`📊 Pagos con purchased_items: ${paymentsWithItems}`);
    
  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar la función
fixPaymentsPurchasedItems(); 