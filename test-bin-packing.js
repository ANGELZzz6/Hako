// Test del algoritmo de Bin Packing 3D ÓPTIMO con backtracking (caso pequeño)

function permute(arr) {
  if (arr.length <= 1) return [arr];
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permute(rest)) {
      result.push([arr[i], ...p]);
    }
  }
  return result;
}

class BinPackingService {
  constructor() {
    this.LOCKER_DIMENSIONS = { length: 50, width: 50, height: 50 };
    this.LOCKER_VOLUME = 125000;
  }

  packProducts3D(products) {
    console.log('🎯 Iniciando algoritmo de Bin Packing 3D ÓPTIMO (backtracking)');
    if (products.length === 0) {
      return { bins: [], totalEfficiency: 0, unusedVolume: 0, packingScore: 0 };
    }
    // Expandir productos por cantidad
    const allProducts = [];
    for (const product of products) {
      for (let i = 0; i < product.quantity; i++) {
        allProducts.push({ ...product, quantity: 1 });
      }
    }
    // Generar todas las permutaciones posibles del orden de los productos
    const allPermutations = permute(allProducts);
    let bestBins = null;
    let bestBinsCount = Infinity;
    let bestEfficiency = 0;
    let bestUnused = 0;
    for (const perm of allPermutations) {
      const { bins, totalEfficiency, unusedVolume } = this.packOnePermutation(perm);
      if (bins.length < bestBinsCount || (bins.length === bestBinsCount && totalEfficiency > bestEfficiency)) {
        bestBins = bins;
        bestBinsCount = bins.length;
        bestEfficiency = totalEfficiency;
        bestUnused = unusedVolume;
      }
      // Early exit si encontramos la mejor posible
      if (bestBinsCount === 1) break;
    }
    const packingScore = this.calculatePackingScore(bestBins, products);
    return {
      bins: bestBins,
      totalEfficiency: bestEfficiency,
      unusedVolume: bestUnused,
      packingScore
    };
  }

  packOnePermutation(products) {
    const bins = [];
    let totalEfficiency = 0;
    let totalUnusedVolume = 0;
    for (const product of products) {
      let placed = false;
      for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        const packedItem = this.tryPlaceProductExhaustive(product, bin);
        if (packedItem) {
          bin.items.push(packedItem);
          bin.usedVolume += packedItem.volume;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const newBin = this.createNewBin();
        const packedItem = this.tryPlaceProductExhaustive(product, newBin);
        if (packedItem) {
          newBin.items.push(packedItem);
          newBin.usedVolume += packedItem.volume;
          bins.push(newBin);
        }
      }
    }
    bins.forEach((bin) => {
      const binEfficiency = (bin.usedVolume / bin.maxVolume) * 100;
      totalEfficiency += binEfficiency;
      totalUnusedVolume += (bin.maxVolume - bin.usedVolume);
    });
    const averageEfficiency = bins.length > 0 ? totalEfficiency / bins.length : 0;
    return { bins, totalEfficiency: averageEfficiency, unusedVolume: totalUnusedVolume };
  }

  tryPlaceProductExhaustive(product, bin) {
    const { dimensions } = product;
    const { dimensions: binDimensions } = bin;
    const orientations = this.generateOrientations(dimensions);
    let best = null;
    for (const orientation of orientations) {
      if (orientation.length > binDimensions.length ||
          orientation.width > binDimensions.width ||
          orientation.height > binDimensions.height) {
        continue;
      }
      const positions = this.generateAllFreePositions(orientation, bin);
      for (const pos of positions) {
        if (this.isPositionValid(pos.x, pos.y, pos.z, orientation, bin)) {
          if (!best ||
            pos.z < best.position.z ||
            (pos.z === best.position.z && pos.y < best.position.y) ||
            (pos.z === best.position.z && pos.y === best.position.y && pos.x < best.position.x)) {
            best = {
              product,
              position: { ...pos },
              orientation,
              volume: orientation.length * orientation.width * orientation.height
            };
          }
        }
      }
    }
    return best;
  }

  generateAllFreePositions(orientation, bin) {
    const { dimensions } = bin;
    const positions = [{ x: 0, y: 0, z: 0 }];
    for (const item of bin.items) {
      const { position: pos, orientation: ori } = item;
      positions.push({ x: pos.x + ori.length, y: pos.y, z: pos.z });
      positions.push({ x: pos.x, y: pos.y + ori.width, z: pos.z });
      positions.push({ x: pos.x, y: pos.y, z: pos.z + ori.height });
      positions.push({ x: pos.x + ori.length, y: pos.y + ori.width, z: pos.z });
      positions.push({ x: pos.x + ori.length, y: pos.y, z: pos.z + ori.height });
      positions.push({ x: pos.x, y: pos.y + ori.width, z: pos.z + ori.height });
      positions.push({ x: pos.x + ori.length, y: pos.y + ori.width, z: pos.z + ori.height });
    }
    // Generar una cuadrícula de posiciones posibles dentro del casillero
    const step = 5; // 5cm de resolución, puedes ajustar para más precisión/velocidad
    for (let x = 0; x <= dimensions.length - orientation.length; x += step) {
      for (let y = 0; y <= dimensions.width - orientation.width; y += step) {
        for (let z = 0; z <= dimensions.height - orientation.height; z += step) {
          positions.push({ x, y, z });
        }
      }
    }
    // Eliminar posiciones duplicadas
    const uniquePositions = [];
    const seen = new Set();
    for (const pos of positions) {
      const key = `${pos.x},${pos.y},${pos.z}`;
      if (!seen.has(key)) {
        uniquePositions.push(pos);
        seen.add(key);
      }
    }
    return uniquePositions.filter(pos =>
      pos.x >= 0 && pos.y >= 0 && pos.z >= 0 &&
      pos.x + orientation.length <= dimensions.length &&
      pos.y + orientation.width <= dimensions.width &&
      pos.z + orientation.height <= dimensions.height
    );
  }

  isPositionValid(x, y, z, orientation, bin) {
    for (const existingItem of bin.items) {
      if (this.boxesOverlap(
        { x, y, z, length: orientation.length, width: orientation.width, height: orientation.height },
        {
          x: existingItem.position.x,
          y: existingItem.position.y,
          z: existingItem.position.z,
          length: existingItem.orientation.length,
          width: existingItem.orientation.width,
          height: existingItem.orientation.height
        }
      )) {
        return false;
      }
    }
    return true;
  }

  boxesOverlap(box1, box2) {
    const overlapX = !(box1.x + box1.length <= box2.x || box2.x + box2.length <= box1.x);
    const overlapY = !(box1.y + box1.width <= box2.y || box2.y + box2.width <= box1.y);
    const overlapZ = !(box1.z + box1.height <= box2.z || box2.z + box2.height <= box1.z);
    return overlapX && overlapY && overlapZ;
  }

  generateOrientations(dimensions) {
    const { length, width, height } = dimensions;
    return [
      { length, width, height },
      { length, height, width },
      { width, length, height },
      { width, height, length },
      { height, length, width },
      { height, width, length }
    ];
  }

  createNewBin() {
    return {
      id: `bin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dimensions: this.LOCKER_DIMENSIONS,
      maxVolume: this.LOCKER_VOLUME,
      usedVolume: 0,
      items: []
    };
  }

  calculatePackingScore(bins, products) {
    if (bins.length === 0) return 0;
    const totalProductVolume = products.reduce((sum, p) => sum + (p.volume * p.quantity), 0);
    const totalBinVolume = bins.reduce((sum, bin) => sum + bin.maxVolume, 0);
    const totalUsedVolume = bins.reduce((sum, bin) => sum + bin.usedVolume, 0);
    const volumeEfficiency = (totalUsedVolume / totalBinVolume) * 100;
    let adjustedEfficiency = volumeEfficiency;
    if (volumeEfficiency < 1) adjustedEfficiency = 60;
    const binPenalty = Math.max(0, (bins.length - 1) * 10);
    const binBonus = bins.length === 1 ? 20 : 0;
    const score = Math.max(0, Math.min(100, adjustedEfficiency - binPenalty + binBonus));
    return Math.round(score);
  }
}

// Productos de prueba según los datos proporcionados
const testProducts = [
  {
    id: 'dress',
    name: 'Dress',
    dimensions: { length: 50, width: 50, height: 20 },
    quantity: 2,
    volume: 50 * 50 * 20 // 50,000 cm³
  },
  {
    id: 'shoes',
    name: 'Shoes',
    dimensions: { length: 20, width: 10, height: 40 },
    quantity: 2,
    volume: 20 * 10 * 40 // 8,000 cm³
  },
  {
    id: 'item3',
    name: 'Item3',
    dimensions: { length: 20, width: 10, height: 16 },
    quantity: 1,
    volume: 20 * 10 * 16 // 3,200 cm³
  }
];

console.log('🧪 Probando algoritmo de Bin Packing 3D ÓPTIMO con backtracking');
console.log('\n📦 Productos de prueba:');
testProducts.forEach(product => {
  console.log(`   ${product.name}: ${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height}cm, ${product.quantity} unidades, ${product.volume} cm³`);
});

console.log('\n🎯 Iniciando empaquetado...\n');

const binPackingService = new BinPackingService();
const result = binPackingService.packProducts3D(testProducts);

console.log('\n📊 RESULTADOS FINALES:');
console.log(`   Casilleros creados: ${result.bins.length}`);
console.log(`   Eficiencia total: ${result.totalEfficiency.toFixed(1)}%`);
console.log(`   Score: ${result.packingScore}`);
console.log(`   Volumen sin usar: ${result.unusedVolume.toLocaleString()} cm³`);

result.bins.forEach((bin, index) => {
  console.log(`\n📦 CASILLERO ${index + 1}:`);
  console.log(`   Productos: ${bin.items.length}`);
  console.log(`   Volumen usado: ${bin.usedVolume.toLocaleString()} cm³`);
  console.log(`   Volumen máximo: ${bin.maxVolume.toLocaleString()} cm³`);
  console.log(`   Eficiencia: ${((bin.usedVolume / bin.maxVolume) * 100).toFixed(1)}%`);
  console.log(`   Productos en este casillero:`);
  bin.items.forEach((item, itemIndex) => {
    console.log(`     ${itemIndex + 1}. ${item.product.name}`);
    console.log(`        Posición: (${item.position.x}, ${item.position.y}, ${item.position.z})`);
    console.log(`        Orientación: ${item.orientation.length}×${item.orientation.width}×${item.orientation.height} cm`);
    console.log(`        Volumen: ${item.volume.toLocaleString()} cm³`);
  });
});

console.log('\n✅ Test completado'); 