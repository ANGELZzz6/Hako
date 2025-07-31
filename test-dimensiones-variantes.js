const mongoose = require('mongoose');
const IndividualProduct = require('./server/models/IndividualProduct');
const Appointment = require('./server/models/Appointment');

// Configurar conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/hako', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Función para obtener dimensiones (simulada desde el frontend)
function getDimensiones(item) {
  // Si el item tiene dimensiones propias (ya calculadas en el backend), usarlas
  if (item.dimensiones) return item.dimensiones;
  
  // Si el item tiene variantes seleccionadas y el producto tiene variantes, intentar calcular dimensiones de la variante
  if (item.variants && item.product?.variants?.enabled && item.product.variants.attributes) {
    // Buscar atributos que definen dimensiones
    const dimensionAttributes = item.product.variants.attributes.filter((a) => a.definesDimensions);
    
    // Si hay múltiples atributos que definen dimensiones, usar el primero que tenga dimensiones válidas
    for (const attr of dimensionAttributes) {
      const selectedValue = item.variants[attr.name];
      if (selectedValue) {
        const option = attr.options.find((opt) => opt.value === selectedValue);
        if (option && option.dimensiones && 
            option.dimensiones.largo && 
            option.dimensiones.ancho && 
            option.dimensiones.alto) {
          return option.dimensiones;
        }
      }
    }
  }
  
  // Si no, usar dimensiones del producto base
  return item.product?.dimensiones;
}

function getVolumen(item) {
  const d = getDimensiones(item);
  return d && d.largo && d.ancho && d.alto ? d.largo * d.ancho * d.alto : 0;
}

async function testDimensionesVariantes() {
  try {
    console.log('🧪 === PRUEBA DE DIMENSIONES DE VARIANTES EN RESERVAS ===');
    
    // Buscar una reserva activa para probar
    const appointment = await Appointment.findOne({
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('itemsToPickup.product');
    
    if (!appointment) {
      console.log('❌ No se encontraron reservas activas para probar');
      return;
    }
    
    console.log('📅 Reserva encontrada:', appointment._id);
    console.log('👤 Usuario:', appointment.user);
    console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);
    
    // Buscar productos individuales para este usuario
    const individualProducts = await IndividualProduct.find({
      user: appointment.user
    }).populate('product');
    
    console.log('\n🔍 Productos individuales para este usuario:', individualProducts.length);
    
    // Probar la lógica de dimensiones para cada producto en la reserva
    console.log('\n🔍 === PROBANDO DIMENSIONES PARA CADA PRODUCTO EN LA RESERVA ===');
    
    for (const pickupItem of appointment.itemsToPickup) {
      console.log(`\n📦 Procesando: ${pickupItem.product.nombre}`);
      console.log(`   Product ID: ${pickupItem.product._id}`);
      console.log(`   Casillero: ${pickupItem.lockerNumber}`);
      
      // Buscar el producto individual correspondiente
      const individualProduct = individualProducts.find(p => 
        p._id === pickupItem.product._id || p.product?._id === pickupItem.product._id
      );
      
      if (individualProduct) {
        console.log(`✅ Producto individual encontrado: ${individualProduct._id}`);
        console.log(`   Estado: ${individualProduct.status}`);
        console.log(`   Variantes:`, individualProduct.variants);
        
        // Obtener dimensiones usando la función del frontend
        const dimensiones = getDimensiones(individualProduct);
        const volumen = getVolumen(individualProduct);
        
        console.log(`   Dimensiones obtenidas:`, dimensiones);
        console.log(`   Volumen calculado: ${volumen} cm³`);
        
        // Comparar con dimensiones del producto base
        console.log(`   Dimensiones del producto base:`, individualProduct.product?.dimensiones);
        
        if (individualProduct.variants && individualProduct.variants.size > 0) {
          console.log(`   ⚠️ Este producto tiene variantes seleccionadas:`, Object.fromEntries(individualProduct.variants));
        }
      } else {
        console.log(`❌ No se encontró producto individual para: ${pickupItem.product.nombre}`);
      }
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDimensionesVariantes(); 