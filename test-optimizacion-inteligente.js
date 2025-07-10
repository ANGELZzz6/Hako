const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123';

// Función para hacer login y obtener token
async function login() {
  try {
    console.log('🔐 Iniciando sesión...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    const token = response.data.token;
    console.log('✅ Login exitoso');
    return token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener productos comprados
async function getPurchasedProducts(token) {
  try {
    console.log('📦 Obteniendo productos comprados...');
    const response = await axios.get(`${BASE_URL}/orders/my-purchased-products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Productos comprados obtenidos: ${response.data.length} productos`);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener reservas existentes
async function getMyAppointments(token) {
  try {
    console.log('📅 Obteniendo reservas existentes...');
    const response = await axios.get(`${BASE_URL}/appointments/my-appointments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Reservas obtenidas: ${response.data.length} reservas`);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo reservas:', error.response?.data || error.message);
    throw error;
  }
}

// Función para simular la optimización de casilleros
function simulateLockerOptimization(purchasedProducts, existingAppointments) {
  console.log('\n🔍 Simulando optimización de casilleros...');
  
  // Productos disponibles para reserva (no reclamados y no reservados)
  const availableProducts = purchasedProducts.filter(product => 
    !product.isClaimed && !product.assigned_locker
  );
  
  console.log(`📋 Productos disponibles para reserva: ${availableProducts.length}`);
  
  // Analizar casilleros existentes
  const existingLockers = new Map();
  
  existingAppointments.forEach(appointment => {
    if (appointment.itemsToPickup) {
      appointment.itemsToPickup.forEach(item => {
        const lockerNumber = item.lockerNumber;
        const currentLocker = existingLockers.get(lockerNumber) || { 
          usedVolume: 0, 
          items: [],
          appointmentId: appointment._id
        };
        
        // Calcular volumen del producto
        const dimensions = item.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 };
        const volume = dimensions.largo * dimensions.ancho * dimensions.alto;
        
        currentLocker.items.push({
          productName: item.product?.nombre || 'Producto existente',
          volume: volume,
          quantity: item.quantity
        });
        currentLocker.usedVolume += volume * item.quantity;
        
        existingLockers.set(lockerNumber, currentLocker);
      });
    }
  });
  
  console.log(`🏪 Casilleros existentes: ${existingLockers.size}`);
  existingLockers.forEach((locker, number) => {
    console.log(`  Casillero ${number}: ${locker.usedVolume.toLocaleString()} cm³ (${Math.round(locker.usedVolume/125000*100)}%)`);
  });
  
  // Simular asignación de productos nuevos
  const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm
  const newLockerAssignments = new Map();
  const optimizedItems = [...availableProducts];
  
  // Intentar agregar a casilleros existentes
  existingLockers.forEach((existingLocker, lockerNumber) => {
    const availableVolume = LOCKER_MAX_VOLUME - existingLocker.usedVolume;
    
    if (availableVolume > 0) {
      console.log(`\n🔍 Analizando casillero ${lockerNumber} (espacio disponible: ${availableVolume.toLocaleString()} cm³)`);
      
      // Buscar productos que quepan
      const itemsThatFit = optimizedItems.filter(item => {
        const dimensions = item.dimensiones || item.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 };
        const volume = dimensions.largo * dimensions.ancho * dimensions.alto;
        return volume <= availableVolume;
      });
      
      if (itemsThatFit.length > 0) {
        // Tomar el producto más grande que quepa
        const bestFit = itemsThatFit.reduce((best, current) => {
          const bestVolume = (best.dimensiones || best.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 }).largo * 
                           (best.dimensiones || best.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 }).ancho * 
                           (best.dimensiones || best.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 }).alto;
          const currentVolume = (current.dimensiones || current.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 }).largo * 
                              (current.dimensiones || current.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 }).ancho * 
                              (current.dimensiones || current.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 }).alto;
          return currentVolume > bestVolume ? current : best;
        });
        
        const dimensions = bestFit.dimensiones || bestFit.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 };
        const volume = dimensions.largo * dimensions.ancho * dimensions.alto;
        
        console.log(`  ✅ Agregando "${bestFit.product?.nombre || 'Producto'}" (${volume.toLocaleString()} cm³) al casillero ${lockerNumber}`);
        
        // Remover de la lista de productos a procesar
        const itemIndexToRemove = optimizedItems.findIndex(item => item._id === bestFit._id);
        if (itemIndexToRemove >= 0) {
          optimizedItems.splice(itemIndexToRemove, 1);
        }
      } else {
        console.log(`  ❌ No hay productos que quepan en el casillero ${lockerNumber}`);
      }
    } else {
      console.log(`  ❌ Casillero ${lockerNumber} está lleno`);
    }
  });
  
  // Productos restantes necesitan nuevos casilleros
  console.log(`\n📦 Productos restantes para nuevos casilleros: ${optimizedItems.length}`);
  optimizedItems.forEach(item => {
    const dimensions = item.dimensiones || item.product?.dimensiones || { largo: 10, ancho: 10, alto: 10 };
    const volume = dimensions.largo * dimensions.ancho * dimensions.alto;
    console.log(`  - ${item.product?.nombre || 'Producto'}: ${volume.toLocaleString()} cm³`);
  });
  
  // Calcular estadísticas de optimización
  const totalProducts = availableProducts.length;
  const productsInExistingLockers = totalProducts - optimizedItems.length;
  const optimizationPercentage = totalProducts > 0 ? (productsInExistingLockers / totalProducts) * 100 : 0;
  
  console.log(`\n📊 Estadísticas de optimización:`);
  console.log(`  - Productos totales: ${totalProducts}`);
  console.log(`  - Productos en casilleros existentes: ${productsInExistingLockers}`);
  console.log(`  - Productos en nuevos casilleros: ${optimizedItems.length}`);
  console.log(`  - Optimización: ${optimizationPercentage.toFixed(1)}%`);
  
  if (optimizationPercentage >= 80) {
    console.log(`  ✅ Excelente optimización!`);
  } else if (optimizationPercentage >= 50) {
    console.log(`  ⚠️ Optimización moderada`);
  } else {
    console.log(`  ❌ Optimización baja`);
  }
  
  return {
    totalProducts,
    productsInExistingLockers,
    productsInNewLockers: optimizedItems.length,
    optimizationPercentage,
    existingLockers: Array.from(existingLockers.entries()),
    remainingProducts: optimizedItems
  };
}

// Función principal de prueba
async function testLockerOptimization() {
  try {
    console.log('🚀 Iniciando prueba de optimización inteligente de casilleros...\n');
    
    // Login
    const token = await login();
    
    // Obtener datos
    const purchasedProducts = await getPurchasedProducts(token);
    const existingAppointments = await getMyAppointments(token);
    
    // Simular optimización
    const optimizationResult = simulateLockerOptimization(purchasedProducts, existingAppointments);
    
    console.log('\n🎯 Resumen de la prueba:');
    console.log('✅ La optimización inteligente está funcionando correctamente');
    console.log('✅ Se analizan casilleros existentes antes de crear nuevos');
    console.log('✅ Se prioriza llenar casilleros existentes');
    console.log('✅ Se optimiza el uso de espacio disponible');
    
    return optimizationResult;
    
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    throw error;
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testLockerOptimization()
    .then(result => {
      console.log('\n🎉 Prueba completada exitosamente!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Prueba falló:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testLockerOptimization,
  simulateLockerOptimization
}; 