// Test del algoritmo de Cuadrícula 3D RÁPIDO (slots de 10x10x10cm)

class Grid3DPackingService {
  constructor() {
    this.SLOT_SIZE = 15; // 15cm por lado (aumentado de 10cm)
    this.GRID_DIMENSIONS = { x: 3, y: 3, z: 3 }; // 3×3×3 = 27 slots total (aumentado de 2 a 3 en Z)
    this.TOTAL_SLOTS = this.GRID_DIMENSIONS.x * this.GRID_DIMENSIONS.y * this.GRID_DIMENSIONS.z;
    this.MAX_DIMENSIONS = {
      x: this.GRID_DIMENSIONS.x * this.SLOT_SIZE, // 45cm (aumentado de 30cm)
      y: this.GRID_DIMENSIONS.y * this.SLOT_SIZE, // 45cm (aumentado de 30cm)
      z: this.GRID_DIMENSIONS.z * this.SLOT_SIZE  // 45cm (aumentado de 30cm)
    };
    this.lockers = []; // Array de múltiples casilleros
    this.currentLockerIndex = 0;
  }

  createNewLocker() {
    const locker = {
      id: `locker_${this.lockers.length + 1}`,
      grid: this.initializeGrid(),
      packedProducts: [],
      usedSlots: 0,
      isFull: false
    };
    this.lockers.push(locker);
    return locker;
  }

  initializeGrid() {
    const grid = [];
    for (let x = 0; x < this.GRID_DIMENSIONS.x; x++) {
      grid[x] = [];
      for (let y = 0; y < this.GRID_DIMENSIONS.y; y++) {
        grid[x][y] = [];
        for (let z = 0; z < this.GRID_DIMENSIONS.z; z++) {
          grid[x][y][z] = null; // null = slot vacío
        }
      }
    }
    return grid;
  }

  validateProductSize(product) {
    const { dimensions } = product;
    const { length, width, height } = dimensions;
    
    // Verificar si el producto excede el tamaño máximo en cualquier dimensión
    if (length > this.MAX_DIMENSIONS.x) {
      return { valid: false, reason: `Largo (${length}cm) excede máximo (${this.MAX_DIMENSIONS.x}cm)` };
    }
    if (width > this.MAX_DIMENSIONS.y) {
      return { valid: false, reason: `Ancho (${width}cm) excede máximo (${this.MAX_DIMENSIONS.y}cm)` };
    }
    if (height > this.MAX_DIMENSIONS.z) {
      return { valid: false, reason: `Alto (${height}cm) excede máximo (${this.MAX_DIMENSIONS.z}cm)` };
    }
    
    return { valid: true };
  }

  packProducts3D(products) {
    console.log('🎯 Iniciando algoritmo de Cuadrícula 3D RÁPIDO');
    console.log(`📦 Grid: ${this.GRID_DIMENSIONS.x}×${this.GRID_DIMENSIONS.y}×${this.GRID_DIMENSIONS.z} = ${this.TOTAL_SLOTS} slots por casillero`);
    console.log(`📏 Tamaño de slot: ${this.SLOT_SIZE}×${this.SLOT_SIZE}×${this.SLOT_SIZE}cm`);
    console.log(`📐 Máximo por eje: X=${this.MAX_DIMENSIONS.x}cm, Y=${this.MAX_DIMENSIONS.y}cm, Z=${this.MAX_DIMENSIONS.z}cm`);
    
    if (products.length === 0) {
      return { 
        lockers: [],
        totalEfficiency: 0, 
        totalUnusedSlots: 0, 
        packingScore: 0,
        rejectedProducts: []
      };
    }

    // Expandir productos por cantidad
    const allProducts = [];
    for (const product of products) {
      for (let i = 0; i < product.quantity; i++) {
        allProducts.push({ ...product, quantity: 1 });
      }
    }

    const failedProducts = [];
    const rejectedProducts = [];

    // Ordenar productos por volumen (más grandes primero)
    allProducts.sort((a, b) => b.volume - a.volume);

    // Crear el primer casillero
    this.createNewLocker();

    for (const product of allProducts) {
      // Validar tamaño del producto
      const validation = this.validateProductSize(product);
      if (!validation.valid) {
        rejectedProducts.push({ product, reason: validation.reason });
        continue;
      }

      const packedItem = this.tryPlaceProductInAnyLocker(product);
      if (!packedItem) {
        failedProducts.push(product);
      }
    }

    // Calcular estadísticas totales
    const totalUsedSlots = this.lockers.reduce((sum, locker) => sum + locker.usedSlots, 0);
    const totalSlots = this.lockers.length * this.TOTAL_SLOTS;
    const totalEfficiency = totalSlots > 0 ? (totalUsedSlots / totalSlots) * 100 : 0;
    const totalUnusedSlots = totalSlots - totalUsedSlots;
    const packingScore = this.calculatePackingScore(totalUsedSlots, totalSlots, failedProducts, rejectedProducts);

    return {
      lockers: this.lockers,
      failedProducts,
      rejectedProducts,
      totalEfficiency,
      totalUnusedSlots,
      packingScore,
      totalLockers: this.lockers.length
    };
  }

  tryPlaceProductInAnyLocker(product) {
    // Intentar colocar en el casillero actual
    let currentLocker = this.lockers[this.currentLockerIndex];
    let packedItem = this.tryPlaceProduct(product, currentLocker);
    
    if (packedItem) {
      this.placeProductInGrid(packedItem, currentLocker);
      currentLocker.packedProducts.push(packedItem);
      currentLocker.usedSlots += packedItem.slotsUsed;
      
      // Verificar si el casillero está lleno
      if (currentLocker.usedSlots === this.TOTAL_SLOTS) {
        currentLocker.isFull = true;
        console.log(`🎮 Casillero ${currentLocker.id} está LLENO! Creando nuevo casillero...`);
        this.createNewLocker();
        this.currentLockerIndex++;
      }
      
      return packedItem;
    }

    // Si no cabe en el casillero actual, intentar con el siguiente casillero existente
    for (let i = this.currentLockerIndex + 1; i < this.lockers.length; i++) {
      const nextLocker = this.lockers[i];
      packedItem = this.tryPlaceProduct(product, nextLocker);
      
      if (packedItem) {
        this.placeProductInGrid(packedItem, nextLocker);
        nextLocker.packedProducts.push(packedItem);
        nextLocker.usedSlots += packedItem.slotsUsed;
        
        // Verificar si este casillero se llenó
        if (nextLocker.usedSlots === this.TOTAL_SLOTS) {
          nextLocker.isFull = true;
          console.log(`🎮 Casillero ${nextLocker.id} está LLENO! Creando nuevo casillero...`);
          this.createNewLocker();
        }
        
        return packedItem;
      }
    }

    // Si no cabe en ningún casillero existente, crear uno nuevo solo si el actual está lleno
    if (currentLocker.isFull) {
      console.log(`📦 Producto ${product.name} no cabe en ningún casillero existente. Creando nuevo casillero...`);
      this.createNewLocker();
      this.currentLockerIndex++;
      
      currentLocker = this.lockers[this.currentLockerIndex];
      packedItem = this.tryPlaceProduct(product, currentLocker);
      
      if (packedItem) {
        this.placeProductInGrid(packedItem, currentLocker);
        currentLocker.packedProducts.push(packedItem);
        currentLocker.usedSlots += packedItem.slotsUsed;
        return packedItem;
      }
    }

    return null; // No se pudo colocar en ningún casillero
  }

  tryPlaceProduct(product, locker) {
    const { dimensions } = product;
    
    // Calcular cuántos slots necesita en cada dimensión (mínimo 1 slot)
    const slotsNeeded = {
      x: Math.max(1, Math.ceil(dimensions.length / this.SLOT_SIZE)),
      y: Math.max(1, Math.ceil(dimensions.width / this.SLOT_SIZE)),
      z: Math.max(1, Math.ceil(dimensions.height / this.SLOT_SIZE))
    };

    // Generar todas las orientaciones posibles
    const orientations = this.generateOrientations(slotsNeeded);
    
    // Probar cada orientación
    for (const orientation of orientations) {
      const position = this.findBestPosition(orientation, locker);
      if (position) {
        return {
          product,
          position,
          orientation,
          slotsUsed: orientation.x * orientation.y * orientation.z,
          volume: dimensions.length * dimensions.width * dimensions.height
        };
      }
    }

    return null; // No se pudo colocar
  }

  generateOrientations(slotsNeeded) {
    const { x, y, z } = slotsNeeded;
    return [
      { x, y, z },
      { x, z, y },
      { y, x, z },
      { y, z, x },
      { z, x, y },
      { z, y, x }
    ];
  }

  findBestPosition(orientation, locker) {
    // Buscar la posición más baja (z más pequeño) y más cerca del origen
    for (let z = 0; z <= this.GRID_DIMENSIONS.z - orientation.z; z++) {
      for (let y = 0; y <= this.GRID_DIMENSIONS.y - orientation.y; y++) {
        for (let x = 0; x <= this.GRID_DIMENSIONS.x - orientation.x; x++) {
          if (this.canPlaceAt(x, y, z, orientation, locker)) {
            return { x, y, z };
          }
        }
      }
    }
    return null;
  }

  canPlaceAt(x, y, z, orientation, locker) {
    for (let dx = 0; dx < orientation.x; dx++) {
      for (let dy = 0; dy < orientation.y; dy++) {
        for (let dz = 0; dz < orientation.z; dz++) {
          if (locker.grid[x + dx][y + dy][z + dz] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }

  placeProductInGrid(packedItem, locker) {
    const { position, orientation } = packedItem;
    const { x, y, z } = position;
    
    for (let dx = 0; dx < orientation.x; dx++) {
      for (let dy = 0; dy < orientation.y; dy++) {
        for (let dz = 0; dz < orientation.z; dz++) {
          locker.grid[x + dx][y + dy][z + dz] = packedItem.product.id;
        }
      }
    }
  }

  calculatePackingScore(totalUsedSlots, totalSlots, failedProducts, rejectedProducts) {
    if (totalUsedSlots === 0) return 0;
    
    const volumeEfficiency = (totalUsedSlots / totalSlots) * 100;
    
    // Penalizar productos fallidos y rechazados
    const failurePenalty = failedProducts.length * 5;
    const rejectionPenalty = rejectedProducts.length * 10;
    
    // Bonus por eficiencia alta
    const efficiencyBonus = volumeEfficiency > 80 ? 20 : 0;
    
    const score = Math.max(0, Math.min(100, volumeEfficiency - failurePenalty - rejectionPenalty + efficiencyBonus));
    return Math.round(score);
  }

  printGridVisualization() {
    console.log('\n🎯 VISUALIZACIÓN DE TODOS LOS CASILLEROS:');
    console.log('═'.repeat(80));
    
    this.lockers.forEach((locker, lockerIndex) => {
      const efficiency = ((locker.usedSlots / this.TOTAL_SLOTS) * 100).toFixed(1);
      const status = locker.isFull ? '✅ LLENO' : '⬜ PARCIAL';
      
      console.log(`\n📦 CASILLERO ${locker.id} (${locker.usedSlots}/${this.TOTAL_SLOTS} slots - ${efficiency}% eficiencia) ${status}`);
      console.log('─'.repeat(60));
      
      // Mostrar dimensiones del grid
      console.log(`📐 Grid: ${this.GRID_DIMENSIONS.x}×${this.GRID_DIMENSIONS.y}×${this.GRID_DIMENSIONS.z} (${this.SLOT_SIZE}cm por slot)`);
      console.log(`📏 Tamaño total: ${this.MAX_DIMENSIONS.x}×${this.MAX_DIMENSIONS.y}×${this.MAX_DIMENSIONS.z}cm`);
      
      // Visualización 3D por niveles
      for (let z = 0; z < this.GRID_DIMENSIONS.z; z++) {
        console.log(`\n📐 Nivel Z=${z} (Altura ${z * this.SLOT_SIZE}-${(z + 1) * this.SLOT_SIZE}cm):`);
        console.log('   Y→');
        for (let y = 0; y < this.GRID_DIMENSIONS.y; y++) {
          let row = `   ${y} `;
          for (let x = 0; x < this.GRID_DIMENSIONS.x; x++) {
            const slot = locker.grid[x][y][z];
            if (slot === null) {
              row += '⬜ '; // Slot vacío
            } else {
              // Mostrar identificador del producto (primeras 2 letras)
              const productId = slot.substring(0, 2).toUpperCase();
              row += `${productId} `;
            }
          }
          console.log(row);
        }
        console.log('     0  1  2  ← X');
      }
      
      // Mostrar productos en este casillero con más detalle
      if (locker.packedProducts.length > 0) {
        console.log(`\n📦 PRODUCTOS EN ${locker.id.toUpperCase()}:`);
        console.log('─'.repeat(50));
        locker.packedProducts.forEach((item, index) => {
          const slotsInfo = `${item.orientation.x}×${item.orientation.y}×${item.orientation.z}`;
          const positionInfo = `(${item.position.x},${item.position.y},${item.position.z})`;
          console.log(`   ${index + 1}. ${item.product.name.padEnd(15)} | ${item.product.id.padEnd(10)} | ${slotsInfo.padEnd(8)} | ${positionInfo.padEnd(12)} | ${item.volume} cm³`);
        });
      }
      
      // Mostrar espacios vacíos
      const emptySlots = this.TOTAL_SLOTS - locker.usedSlots;
      if (emptySlots > 0) {
        console.log(`\n⬜ ESPACIOS VACÍOS: ${emptySlots} slots disponibles`);
      }
      
      console.log('═'.repeat(80));
    });
    
    // Resumen general
    console.log('\n📊 RESUMEN GENERAL:');
    console.log('─'.repeat(40));
    const totalUsed = this.lockers.reduce((sum, locker) => sum + locker.usedSlots, 0);
    const totalSlots = this.lockers.length * this.TOTAL_SLOTS;
    const overallEfficiency = ((totalUsed / totalSlots) * 100).toFixed(1);
    
    console.log(`   📦 Total casilleros: ${this.lockers.length}`);
    console.log(`   ✅ Casilleros llenos: ${this.lockers.filter(l => l.isFull).length}`);
    console.log(`   ⬜ Casilleros parciales: ${this.lockers.filter(l => !l.isFull).length}`);
    console.log(`   📊 Eficiencia total: ${overallEfficiency}%`);
    console.log(`   🎯 Slots utilizados: ${totalUsed}/${totalSlots}`);
  }
}

// Productos de prueba ajustados para el nuevo grid 3×3×2
const testProducts = [
  {
    id: 'small_box',
    name: 'Small Box',
    dimensions: { length: 8, width: 6, height: 4 },
    quantity: 3,
    volume: 8 * 6 * 4
  },
  {
    id: 'medium_item',
    name: 'Medium Item',
    dimensions: { length: 15, width: 12, height: 8 },
    quantity: 2,
    volume: 15 * 12 * 8
  },
  {
    id: 'large_item',
    name: 'Large Item',
    dimensions: { length: 25, width: 15, height: 10 },
    quantity: 1,
    volume: 25 * 15 * 10
  },
  {
    id: 'tiny_item',
    name: 'Tiny Item',
    dimensions: { length: 2, width: 3, height: 1 },
    quantity: 5,
    volume: 2 * 3 * 1
  },
  {
    id: 'wide_item',
    name: 'Wide Item',
    dimensions: { length: 20, width: 18, height: 5 },
    quantity: 2,
    volume: 20 * 18 * 5
  },
  {
    id: 'tall_item',
    name: 'Tall Item',
    dimensions: { length: 8, width: 8, height: 18 },
    quantity: 1,
    volume: 8 * 8 * 18
  },
  {
    id: 'book_item',
    name: 'Book Item',
    dimensions: { length: 12, width: 8, height: 6 },
    quantity: 4,
    volume: 12 * 8 * 6
  },
  {
    id: 'phone_item',
    name: 'Phone Item',
    dimensions: { length: 6, width: 3, height: 12 },
    quantity: 3,
    volume: 6 * 3 * 12
  },
  {
    id: 'too_large_x',
    name: 'Too Large X',
    dimensions: { length: 35, width: 10, height: 10 },
    quantity: 1,
    volume: 35 * 10 * 10
  },
  {
    id: 'too_large_y',
    name: 'Too Large Y',
    dimensions: { length: 10, width: 35, height: 10 },
    quantity: 1,
    volume: 10 * 35 * 10
  }
];

console.log('🧪 Probando algoritmo de Cuadrícula 3D RÁPIDO (Grid 3×3×3 = 27 slots, 15cm por slot)');
console.log('\n📦 Productos de prueba:');
testProducts.forEach(product => {
  const slotsNeeded = {
    x: Math.max(1, Math.ceil(product.dimensions.length / 15)),
    y: Math.max(1, Math.ceil(product.dimensions.width / 15)),
    z: Math.max(1, Math.ceil(product.dimensions.height / 15))
  };
  console.log(`   ${product.name}: ${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height}cm, ${product.quantity} unidades, ${product.volume} cm³ (slots: ${slotsNeeded.x}×${slotsNeeded.y}×${slotsNeeded.z})`);
});

console.log('\n🎯 Iniciando empaquetado...\n');

const startTime = Date.now();
const gridPackingService = new Grid3DPackingService();
const result = gridPackingService.packProducts3D(testProducts);
const endTime = Date.now();

console.log('\n📊 RESULTADOS FINALES:');
console.log(`   ⏱️  Tiempo de ejecución: ${endTime - startTime}ms`);
console.log(`   📦 Casilleros creados: ${result.totalLockers}`);
console.log(`   ✅ Productos empaquetados: ${result.lockers.reduce((sum, locker) => sum + locker.packedProducts.length, 0)}`);
console.log(`   ❌ Productos fallidos: ${result.failedProducts.length}`);
console.log(`   🚫 Productos rechazados: ${result.rejectedProducts.length}`);
    console.log(`   📦 Slots totales usados: ${result.lockers.reduce((sum, locker) => sum + locker.usedSlots, 0)}/${result.totalLockers * 27}`);
console.log(`   📊 Eficiencia total: ${result.totalEfficiency.toFixed(1)}%`);
console.log(`   🎯 Score: ${result.packingScore}`);

if (result.rejectedProducts.length > 0) {
  console.log('\n🚫 PRODUCTOS RECHAZADOS (muy grandes):');
  result.rejectedProducts.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.product.name} - ${item.product.dimensions.length}×${item.product.dimensions.width}×${item.product.dimensions.height}cm`);
    console.log(`      Razón: ${item.reason}`);
  });
}

if (result.failedProducts.length > 0) {
  console.log('\n❌ PRODUCTOS NO EMPAQUETADOS:');
  result.failedProducts.forEach((product, index) => {
    console.log(`   ${index + 1}. ${product.name} - ${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height}cm`);
  });
}

// Mostrar visualización de todos los casilleros
gridPackingService.printGridVisualization();

console.log('\n✅ Test completado'); 