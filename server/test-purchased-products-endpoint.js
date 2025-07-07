const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HAKO')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const IndividualProduct = require('./models/IndividualProduct');
const User = require('./models/User');

async function testPurchasedProductsEndpoint() {
  try {
    console.log('🔍 Probando endpoint getMyPurchasedProducts...');
    
    // Buscar un usuario de prueba
    const testUser = await User.findOne({ email: 'test@testuser.com' });
    if (!testUser) {
      console.log('❌ Usuario de prueba no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', testUser._id);
    
    // Simular la consulta que hace getMyPurchasedProducts
    console.log('📋 Buscando productos individuales...');
    const individualProducts = await IndividualProduct.find({ 
      user: testUser._id,
      status: { $in: ['available', 'reserved', 'claimed'] }
    }).populate('product order');
    
    console.log(`📊 Productos individuales encontrados: ${individualProducts.length}`);
    
    if (individualProducts.length === 0) {
      console.log('ℹ️ No hay productos individuales para este usuario');
      return;
    }
    
    // Probar la transformación que hace getMyPurchasedProducts
    console.log('🔄 Probando transformación de productos...');
    
    const allItems = individualProducts.map((individualProduct, index) => {
      console.log(`📦 Procesando producto ${index + 1}/${individualProducts.length}`);
      
      const product = individualProduct.product;
      
      if (!product) {
        console.log('⚠️ Producto no encontrado para individualProduct:', individualProduct._id);
        return null;
      }
      
      console.log('✅ Producto encontrado:', product.title);
      
      // Verificar si los métodos existen
      if (typeof product.tieneDimensiones === 'function') {
        console.log('✅ Método tieneDimensiones existe');
        try {
          const tieneDimensiones = product.tieneDimensiones();
          console.log('📏 tieneDimensiones:', tieneDimensiones);
        } catch (error) {
          console.error('❌ Error en tieneDimensiones:', error.message);
        }
      } else {
        console.log('⚠️ Método tieneDimensiones no existe');
      }
      
      if (typeof product.getVolumen === 'function') {
        console.log('✅ Método getVolumen existe');
        try {
          const volumen = product.getVolumen();
          console.log('📦 volumen:', volumen);
        } catch (error) {
          console.error('❌ Error en getVolumen:', error.message);
        }
      } else {
        console.log('⚠️ Método getVolumen no existe');
      }
      
      // Crear el objeto transformado
      const transformedItem = {
        _id: individualProduct._id,
        product: product,
        orderId: individualProduct.order?._id,
        orderCreatedAt: individualProduct.order?.createdAt,
        quantity: 1,
        remaining_quantity: individualProduct.status === 'available' ? 1 : 0,
        isClaimed: individualProduct.status === 'claimed',
        isReserved: individualProduct.status === 'reserved',
        originalItemId: individualProduct._id,
        individualIndex: individualProduct.individualIndex,
        totalInOrder: 1,
        assigned_locker: individualProduct.assignedLocker,
        unit_price: individualProduct.unitPrice
      };
      
      console.log('✅ Producto transformado exitosamente');
      return transformedItem;
    }).filter(item => item !== null);
    
    console.log('🎉 Transformación completada exitosamente!');
    console.log(`📊 Total de productos transformados: ${allItems.length}`);
    
    // Mostrar resumen
    const statusCount = {};
    allItems.forEach(item => {
      const status = item.isClaimed ? 'claimed' : item.isReserved ? 'reserved' : 'available';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    console.log('📋 Resumen por estado:', statusCount);
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

testPurchasedProductsEndpoint(); 