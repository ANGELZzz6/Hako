export interface Product3D {
  id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  volume: number;
}

export interface Bin3D {
  id: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  maxVolume: number;
  usedVolume: number;
  items: PackedItem[];
}

export interface PackedItem {
  product: Product3D;
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    length: number;
    width: number;
    height: number;
  };
  volume: number;
}

export interface PackingResult {
  bins: Bin3D[];
  totalEfficiency: number;
  unusedVolume: number;
  packingScore: number;
}

class BinPackingService {
  private readonly LOCKER_DIMENSIONS = {
    length: 50, // cm
    width: 50,  // cm
    height: 50  // cm
  };

  private readonly LOCKER_VOLUME = 125000; // cm³

  /**
   * Algoritmo de Bin Packing 3D mejorado - First Fit Decreasing con búsqueda exhaustiva
   * 1. Ordena productos por volumen (más grande primero)
   * 2. Coloca cada producto en el primer casillero donde quepa
   * 3. Si no cabe en ningún casillero existente, crea uno nuevo
   * 4. Busca posiciones de manera más inteligente para aprovechar mejor el espacio
   */
  packProducts3D(products: Product3D[]): PackingResult {
    console.log('🎯 Iniciando algoritmo de Bin Packing 3D mejorado');
    console.log('📦 Productos a empaquetar:', products);
    
    if (products.length === 0) {
      console.log('❌ No hay productos para empaquetar');
      return {
        bins: [],
        totalEfficiency: 0,
        unusedVolume: 0,
        packingScore: 0
      };
    }

    // 1. Crear lista de todos los productos (incluyendo cantidad)
    const allProducts: Product3D[] = [];
    for (const product of products) {
      for (let i = 0; i < product.quantity; i++) {
        allProducts.push({ ...product, quantity: 1 });
      }
    }

    // 2. Ordenar por volumen descendente (más grande primero)
    allProducts.sort((a, b) => b.volume - a.volume);
    console.log('📊 Productos ordenados por volumen (más grande primero):', allProducts.map(p => `${p.name}: ${p.volume} cm³`));
    
    const bins: Bin3D[] = [];
    let totalEfficiency = 0;
    let totalUnusedVolume = 0;

    // 3. Procesar cada producto en orden
    for (const product of allProducts) {
      console.log(`\n🔄 Procesando: ${product.name} (${product.volume} cm³)`);
      
      let placed = false;
      
      // Intentar colocar en casilleros existentes
      for (let i = 0; i < bins.length; i++) {
        const bin = bins[i];
        console.log(`📦 Intentando casillero ${i + 1} (${bin.usedVolume}/${bin.maxVolume} cm³)`);
        
        const packedItem = this.tryPlaceProductOptimized(product, bin);
        if (packedItem) {
          bin.items.push(packedItem);
          bin.usedVolume += packedItem.volume;
          console.log(`✅ Colocado en casillero ${i + 1} en posición (${packedItem.position.x}, ${packedItem.position.y}, ${packedItem.position.z})`);
          placed = true;
          break;
        } else {
          console.log(`❌ No cabe en casillero ${i + 1}`);
        }
      }
      
      // Si no cabe en ningún casillero existente, crear uno nuevo
      if (!placed) {
        console.log(`📦 Creando nuevo casillero para: ${product.name}`);
          const newBin = this.createNewBin();
        const packedItem = this.tryPlaceProductOptimized(product, newBin);
          
          if (packedItem) {
            newBin.items.push(packedItem);
            newBin.usedVolume += packedItem.volume;
            bins.push(newBin);
          console.log(`✅ Colocado en nuevo casillero en posición (${packedItem.position.x}, ${packedItem.position.y}, ${packedItem.position.z})`);
        } else {
          console.log(`❌ ERROR: No se pudo colocar ${product.name} ni siquiera en un casillero vacío`);
        }
      }
    }

    console.log(`\n🏷️ Resultado final: ${bins.length} casilleros creados`);

    // Calcular métricas de eficiencia
    bins.forEach((bin, index) => {
      const binEfficiency = (bin.usedVolume / bin.maxVolume) * 100;
      totalEfficiency += binEfficiency;
      totalUnusedVolume += (bin.maxVolume - bin.usedVolume);
      console.log(`📊 Casillero ${index + 1}: ${binEfficiency.toFixed(1)}% eficiencia, ${bin.usedVolume} cm³ usado, ${bin.items.length} productos`);
    });

    const averageEfficiency = bins.length > 0 ? totalEfficiency / bins.length : 0;
    const packingScore = this.calculatePackingScore(bins, products);

    const result = {
      bins,
      totalEfficiency: averageEfficiency,
      unusedVolume: totalUnusedVolume,
      packingScore
    };

    console.log('📈 Resultado final:', result);
    return result;
  }

  /**
   * Intenta colocar un producto en un casillero específico con algoritmo optimizado
   * Busca posiciones de manera más inteligente para aprovechar mejor el espacio
   */
  private tryPlaceProductOptimized(product: Product3D, bin: Bin3D): PackedItem | null {
    const { dimensions } = product;
    const { dimensions: binDimensions } = bin;
    
    // Generar todas las orientaciones posibles
    const orientations = this.generateOrientations(dimensions);

    for (const orientation of orientations) {
      // Verificar que la orientación quepa en el casillero
      if (orientation.length > binDimensions.length ||
          orientation.width > binDimensions.width ||
          orientation.height > binDimensions.height) {
        continue;
      }
      
      // Buscar una posición válida para esta orientación
      const position = this.findBestPositionOptimized(orientation, bin);
      if (position) {
        return {
          product,
          position,
          orientation,
          volume: orientation.length * orientation.width * orientation.height
        };
      }
    }
    
    return null;
  }

  /**
   * Busca la mejor posición para una orientación específica
   * Usa un algoritmo más inteligente que busca posiciones cerca de productos existentes
   */
  private findBestPositionOptimized(orientation: { length: number; width: number; height: number }, bin: Bin3D): { x: number; y: number; z: number } | null {
    const { dimensions } = bin;
    const positions: { x: number; y: number; z: number }[] = [];
    
    // Si el casillero está vacío, empezar en el origen
    if (bin.items.length === 0) {
      positions.push({ x: 0, y: 0, z: 0 });
    } else {
      // Generar posiciones candidatas basadas en los productos existentes
      for (const existingItem of bin.items) {
        const existingPos = existingItem.position;
        const existingOri = existingItem.orientation;
        
        // Posición a la derecha del producto existente
        positions.push({
          x: existingPos.x + existingOri.length,
          y: existingPos.y,
          z: existingPos.z
        });
        
        // Posición arriba del producto existente
        positions.push({
          x: existingPos.x,
          y: existingPos.y + existingOri.width,
          z: existingPos.z
        });
        
        // Posición encima del producto existente
        positions.push({
          x: existingPos.x,
          y: existingPos.y,
          z: existingPos.z + existingOri.height
        });
        
        // Posición diagonal (esquina)
        positions.push({
          x: existingPos.x + existingOri.length,
          y: existingPos.y + existingOri.width,
          z: existingPos.z
        });
        
        positions.push({
          x: existingPos.x + existingOri.length,
          y: existingPos.y,
          z: existingPos.z + existingOri.height
        });
        
        positions.push({
          x: existingPos.x,
          y: existingPos.y + existingOri.width,
          z: existingPos.z + existingOri.height
        });
        
        // Posición diagonal completa
        positions.push({
          x: existingPos.x + existingOri.length,
          y: existingPos.y + existingOri.width,
          z: existingPos.z + existingOri.height
        });
      }
      
      // Agregar posiciones en el origen y bordes como fallback
      positions.push({ x: 0, y: 0, z: 0 });
      positions.push({ x: 0, y: 0, z: 0 });
      positions.push({ x: 0, y: 0, z: 0 });
    }
    
    // Filtrar posiciones válidas y probarlas
    const validPositions = positions.filter(pos => 
      pos.x >= 0 && pos.y >= 0 && pos.z >= 0 &&
      pos.x + orientation.length <= dimensions.length &&
      pos.y + orientation.width <= dimensions.width &&
      pos.z + orientation.height <= dimensions.height
    );
    
    // Probar cada posición válida
    for (const position of validPositions) {
      if (this.isPositionValid(position.x, position.y, position.z, orientation, bin)) {
        return position;
      }
    }
    
    // Si no se encontró posición válida en las candidatas, hacer búsqueda exhaustiva
    return this.findValidPositionExhaustive(orientation, bin);
  }

  /**
   * Búsqueda exhaustiva de posiciones válidas
   */
  private findValidPositionExhaustive(orientation: { length: number; width: number; height: number }, bin: Bin3D): { x: number; y: number; z: number } | null {
    const { dimensions } = bin;
    
    // Probar posiciones en orden: desde la esquina (0,0,0) hacia adelante
    for (let x = 0; x <= dimensions.length - orientation.length; x++) {
      for (let y = 0; y <= dimensions.width - orientation.width; y++) {
        for (let z = 0; z <= dimensions.height - orientation.height; z++) {
          if (this.isPositionValid(x, y, z, orientation, bin)) {
            return { x, y, z };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Verifica si una posición específica es válida (no hay superposición)
   */
  private isPositionValid(x: number, y: number, z: number, orientation: { length: number; width: number; height: number }, bin: Bin3D): boolean {
    // Verificar que no se superponga con productos existentes
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

  /**
   * Verifica si dos cajas se superponen
   */
  private boxesOverlap(box1: { x: number; y: number; z: number; length: number; width: number; height: number }, 
                      box2: { x: number; y: number; z: number; length: number; width: number; height: number }): boolean {
    // Dos cajas se superponen si se solapan en todos los ejes
    const overlapX = !(box1.x + box1.length <= box2.x || box2.x + box2.length <= box1.x);
    const overlapY = !(box1.y + box1.width <= box2.y || box2.y + box2.width <= box1.y);
    const overlapZ = !(box1.z + box1.height <= box2.z || box2.z + box2.height <= box1.z);
    
    return overlapX && overlapY && overlapZ;
  }

  /**
   * Genera todas las orientaciones posibles de un producto (6 rotaciones)
   */
  private generateOrientations(dimensions: { length: number; width: number; height: number }) {
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

  /**
   * Crea un nuevo casillero vacío
   */
  private createNewBin(): Bin3D {
    return {
      id: `bin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dimensions: this.LOCKER_DIMENSIONS,
      maxVolume: this.LOCKER_VOLUME,
      usedVolume: 0,
      items: []
    };
  }

  /**
   * Calcula el score general del empaquetado (0-100)
   */
  private calculatePackingScore(bins: Bin3D[], products: Product3D[]): number {
    if (bins.length === 0) return 0;

    const totalProductVolume = products.reduce((sum, p) => sum + (p.volume * p.quantity), 0);
    const totalBinVolume = bins.reduce((sum, bin) => sum + bin.maxVolume, 0);
    const totalUsedVolume = bins.reduce((sum, bin) => sum + bin.usedVolume, 0);

    console.log('📊 Calculando score de empaquetado:');
    console.log(`   Volumen total de productos: ${totalProductVolume} cm³`);
    console.log(`   Volumen total de casilleros: ${totalBinVolume} cm³`);
    console.log(`   Volumen usado: ${totalUsedVolume} cm³`);

    // Eficiencia de volumen
    const volumeEfficiency = (totalUsedVolume / totalBinVolume) * 100;
    
    // Para productos muy pequeños, ajustar el score
    let adjustedEfficiency = volumeEfficiency;
    
    // Si los productos son muy pequeños (< 1% del bin), dar un score base
    if (volumeEfficiency < 1) {
      adjustedEfficiency = 60;
      console.log(`   Productos pequeños detectados, ajustando score a: ${adjustedEfficiency}`);
    }
    
    // Penalización por usar muchos casilleros
    const binPenalty = Math.max(0, (bins.length - 1) * 10);
    
    // Bonus por usar pocos casilleros eficientemente
    const binBonus = bins.length === 1 ? 20 : 0;
    
    // Score final
    const score = Math.max(0, Math.min(100, adjustedEfficiency - binPenalty + binBonus));
    
    console.log(`   Eficiencia de volumen: ${volumeEfficiency.toFixed(2)}%`);
    console.log(`   Eficiencia ajustada: ${adjustedEfficiency.toFixed(2)}%`);
    console.log(`   Penalización por casilleros: ${binPenalty}`);
    console.log(`   Bonus por eficiencia: ${binBonus}`);
    console.log(`   Score final: ${score}`);
    
    return Math.round(score);
  }

  /**
   * Convierte productos del formato de la aplicación al formato del algoritmo
   */
  convertProductsTo3D(items: any[]): Product3D[] {
    console.log('🔄 Convirtiendo productos a formato 3D:', items);
    
    const products3D = items.map(item => {
      const dimensions = item.dimensiones || item.product?.dimensiones;
      const volume = dimensions ? 
        dimensions.largo * dimensions.ancho * dimensions.alto : 
        0;

      const product3D = {
        id: item._id || item.id,
        name: item.product?.nombre || item.nombre || 'Producto',
        dimensions: {
          length: dimensions?.largo || 0,
          width: dimensions?.ancho || 0,
          height: dimensions?.alto || 0
        },
        quantity: item.quantity || 1,
        volume
      };

      console.log(`📦 Producto convertido:`, product3D);
      return product3D;
    });

    console.log('✅ Productos 3D convertidos:', products3D);
    return products3D;
  }

  /**
   * Obtiene estadísticas detalladas del empaquetado
   */
  getPackingStats(result: PackingResult) {
    return {
      totalBins: result.bins.length,
      averageEfficiency: Math.round(result.totalEfficiency),
      packingScore: result.packingScore,
      unusedVolume: result.unusedVolume,
      totalUsedVolume: result.bins.reduce((sum, bin) => sum + bin.usedVolume, 0),
      recommendations: this.generateRecommendations(result)
    };
  }

  /**
   * Genera recomendaciones para mejorar el empaquetado
   */
  private generateRecommendations(result: PackingResult): string[] {
    const recommendations: string[] = [];

    if (result.packingScore < 70) {
      recommendations.push('Considera reorganizar los productos para aprovechar mejor el espacio');
    }

    if (result.bins.length > 1) {
      recommendations.push('Los productos podrían caber en menos casilleros con mejor organización');
    }

    if (result.unusedVolume > 25000) {
      recommendations.push(`Hay ${Math.round(result.unusedVolume / 1000)}L de espacio sin usar`);
    }

    if (recommendations.length === 0) {
      recommendations.push('El empaquetado está optimizado');
    }

    return recommendations;
  }
}

export default new BinPackingService(); 