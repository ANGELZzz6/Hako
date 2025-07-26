const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const IndividualProduct = require('./models/IndividualProduct');

async function testVariantsDimensions() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar un producto con variantes para probar
    const product = await Product.findOne({
      'variants.enabled': true
    });

    if (!product) {
      console.log('❌ No se encontró ningún producto con variantes para probar');
      return;
    }

    console.log(`\n🔍 Probando producto: ${product.nombre}`);
    console.log(`   - ID: ${product._id}`);
    console.log(`   - Dimensiones base:`, product.dimensiones);
    console.log(`   - Atributos: ${product.variants.attributes.length}`);

    // Mostrar información de variantes
    product.variants.attributes.forEach((attr, index) => {
      console.log(`\n   📋 Atributo ${index + 1}: ${attr.name}`);
      console.log(`      - Required: ${attr.required}`);
      console.log(`      - DefinesDimensions: ${attr.definesDimensions}`);
      console.log(`      - Opciones: ${attr.options.length}`);
      
      attr.options.forEach(option => {
        console.log(`         • ${option.value}: ${option.price > 0 ? `+$${option.price}` : 'sin costo'}`);
        if (option.dimensiones) {
          console.log(`           Dimensiones: ${option.dimensiones.largo}×${option.dimensiones.ancho}×${option.dimensiones.alto} cm, ${option.dimensiones.peso}g`);
        }
      });
    });

    // Probar diferentes combinaciones de variantes
    console.log(`\n🧪 Probando diferentes combinaciones de variantes:`);

    // Crear algunas combinaciones de prueba
    const testCombinations = [];
    
    // Combinación 1: primera opción de cada atributo
    const combination1 = {};
    product.variants.attributes.forEach(attr => {
      if (attr.options.length > 0) {
        combination1[attr.name] = attr.options[0].value;
      }
    });
    testCombinations.push(combination1);

    // Combinación 2: última opción de cada atributo
    const combination2 = {};
    product.variants.attributes.forEach(attr => {
      if (attr.options.length > 0) {
        combination2[attr.name] = attr.options[attr.options.length - 1].value;
      }
    });
    testCombinations.push(combination2);

    // Probar cada combinación
    testCombinations.forEach((variants, index) => {
      console.log(`\n   🔬 Combinación ${index + 1}:`, variants);
      
      const dimensiones = product.getVariantOrProductDimensions(variants);
      const volumen = product.getVariantOrProductVolume(variants);
      
      console.log(`      📏 Dimensiones obtenidas:`, dimensiones);
      console.log(`      📦 Volumen calculado: ${volumen} cm³`);
      
      if (dimensiones) {
        console.log(`      ✅ Dimensiones válidas encontradas`);
      } else {
        console.log(`      ⚠️ No se encontraron dimensiones específicas, usando dimensiones base`);
      }
    });

    // Buscar productos individuales con variantes
    const individualProducts = await IndividualProduct.find({
      variants: { $exists: true, $ne: null }
    }).populate('product').limit(3);

    if (individualProducts.length > 0) {
      console.log(`\n📦 Productos individuales con variantes encontrados: ${individualProducts.length}`);
      
      individualProducts.forEach((ip, index) => {
        console.log(`\n   📋 Producto individual ${index + 1}:`);
        console.log(`      - ID: ${ip._id}`);
        console.log(`      - Producto: ${ip.product?.nombre || 'N/A'}`);
        console.log(`      - Variantes:`, Object.fromEntries(ip.variants || new Map()));
        console.log(`      - Dimensiones guardadas:`, ip.dimensiones);
        
        const variantDimensiones = ip.getVariantOrProductDimensions();
        const variantVolumen = ip.getVariantOrProductVolume();
        
        console.log(`      - Dimensiones calculadas:`, variantDimensiones);
        console.log(`      - Volumen calculado: ${variantVolumen} cm³`);
      });
    } else {
      console.log(`\nℹ️ No se encontraron productos individuales con variantes`);
    }

    console.log(`\n✅ Pruebas completadas exitosamente`);

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar las pruebas
testVariantsDimensions(); 