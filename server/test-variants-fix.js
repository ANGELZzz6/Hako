const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const Order = require('./models/Order');
const IndividualProduct = require('./models/IndividualProduct');

async function testVariantsFix() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar una orden reciente para probar
    const recentOrder = await Order.findOne({
      status: 'paid'
    }).sort({ createdAt: -1 });

    if (!recentOrder) {
      console.log('❌ No se encontró ninguna orden pagada para probar');
      return;
    }

    console.log(`\n🔍 Probando orden: ${recentOrder._id}`);
    console.log(`   - Usuario: ${recentOrder.user}`);
    console.log(`   - Estado: ${recentOrder.status}`);
    console.log(`   - Items: ${recentOrder.items.length}`);

    // Mostrar items de la orden
    console.log('\n📦 Items en la orden:');
    recentOrder.items.forEach((item, index) => {
      console.log(`   ${index + 1}. Producto: ${item.product}`);
      console.log(`      - Cantidad: ${item.quantity}`);
      console.log(`      - Variantes: ${item.variants ? JSON.stringify(Object.fromEntries(item.variants)) : 'Sin variantes'}`);
    });

    // Buscar productos individuales de esta orden
    const individualProducts = await IndividualProduct.find({
      order: recentOrder._id
    }).populate('product');

    console.log(`\n📊 Productos individuales encontrados: ${individualProducts.length}`);

    // Agrupar por producto y variantes
    const groupedProducts = {};
    individualProducts.forEach(product => {
      const productId = product.product._id.toString();
      const variants = product.variants ? Object.fromEntries(product.variants) : {};
      const variantKey = JSON.stringify(variants);
      
      if (!groupedProducts[productId]) {
        groupedProducts[productId] = {};
      }
      
      if (!groupedProducts[productId][variantKey]) {
        groupedProducts[productId][variantKey] = [];
      }
      
      groupedProducts[productId][variantKey].push(product);
    });

    // Mostrar agrupación
    console.log('\n📋 Productos individuales agrupados:');
    Object.entries(groupedProducts).forEach(([productId, variants]) => {
      console.log(`\n   Producto: ${productId}`);
      Object.entries(variants).forEach(([variantKey, products]) => {
        const variants = JSON.parse(variantKey);
        console.log(`      Variantes: ${JSON.stringify(variants)}`);
        console.log(`      Cantidad: ${products.length}`);
        console.log(`      Índices: ${products.map(p => p.individualIndex).join(', ')}`);
      });
    });

    // Verificar que coincida con la orden
    console.log('\n✅ Verificación:');
    let allGood = true;
    
    recentOrder.items.forEach((item, index) => {
      const productId = item.product.toString();
      const itemVariants = item.variants ? Object.fromEntries(item.variants) : {};
      const variantKey = JSON.stringify(itemVariants);
      
      const expectedCount = item.quantity;
      const actualCount = groupedProducts[productId]?.[variantKey]?.length || 0;
      
      console.log(`   Item ${index + 1}:`);
      console.log(`      - Esperados: ${expectedCount}`);
      console.log(`      - Encontrados: ${actualCount}`);
      console.log(`      - Variantes: ${JSON.stringify(itemVariants)}`);
      
      if (expectedCount !== actualCount) {
        console.log(`      ❌ NO COINCIDE`);
        allGood = false;
      } else {
        console.log(`      ✅ COINCIDE`);
      }
    });

    if (allGood) {
      console.log('\n🎉 ¡Todas las verificaciones pasaron!');
    } else {
      console.log('\n❌ Hay discrepancias en las verificaciones');
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar la prueba
testVariantsFix(); 