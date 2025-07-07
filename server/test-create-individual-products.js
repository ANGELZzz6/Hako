const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HAKO')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const IndividualProduct = require('./models/IndividualProduct');
const Product = require('./models/Product');
const Order = require('./models/Order');

async function testCreateIndividualProducts() {
  try {
    console.log('🧪 Probando creación de productos individuales...');
    
    // Buscar un producto de prueba
    const testProduct = await Product.findOne({ nombre: 'sapo' });
    if (!testProduct) {
      console.log('❌ Producto "sapo" no encontrado');
      return;
    }
    
    console.log('✅ Producto encontrado:', {
      id: testProduct._id,
      nombre: testProduct.nombre,
      dimensiones: testProduct.dimensiones
    });
    
    // Buscar una orden de prueba
    const testOrder = await Order.findOne().sort({ createdAt: -1 });
    if (!testOrder) {
      console.log('❌ No hay órdenes en la base de datos');
      return;
    }
    
    console.log('✅ Orden encontrada:', {
      id: testOrder._id,
      status: testOrder.status,
      items_count: testOrder.items.length
    });
    
    // Simular la creación de un producto individual
    console.log('🆕 Creando producto individual de prueba...');
    
    const individualProduct = new IndividualProduct({
      user: testOrder.user,
      order: testOrder._id,
      product: testProduct._id,
      individualIndex: 1,
      status: 'available',
      unitPrice: testProduct.precio,
      dimensiones: testProduct.dimensiones, // Copiar dimensiones
      payment: {
        mp_payment_id: 'TEST_' + Date.now(),
        status: 'approved'
      }
    });
    
    console.log('📋 Datos del producto individual a crear:', {
      user: individualProduct.user,
      order: individualProduct.order,
      product: individualProduct.product,
      dimensiones: individualProduct.dimensiones,
      unitPrice: individualProduct.unitPrice
    });
    
    // Intentar guardar
    const savedProduct = await individualProduct.save();
    console.log('✅ Producto individual creado exitosamente:', savedProduct._id);
    
    // Verificar que se guardó correctamente
    const retrievedProduct = await IndividualProduct.findById(savedProduct._id);
    console.log('🔍 Producto recuperado:', {
      id: retrievedProduct._id,
      dimensiones: retrievedProduct.dimensiones,
      tieneDimensiones: retrievedProduct.tieneDimensiones(),
      volumen: retrievedProduct.getVolumen()
    });
    
    // Limpiar el producto de prueba
    await IndividualProduct.findByIdAndDelete(savedProduct._id);
    console.log('🧹 Producto de prueba eliminado');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

testCreateIndividualProducts(); 