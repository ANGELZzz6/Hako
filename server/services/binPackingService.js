/**
 * Servicio de Bin Packing 3D para calcular si caben productos en casilleros
 * Basado en el algoritmo First Fit Decreasing con optimización 3D
 */

class BinPackingService {
  constructor() {
    this.LOCKER_DIMENSIONS = {
      width: 50,   // cm
      height: 50,  // cm
      depth: 50    // cm
    };
  }

  /**
   * Calcula el volumen de un producto
   */
  calculateVolume(product) {
    if (!product.dimensiones) return 0;
    return product.dimensiones.largo * product.dimensiones.ancho * product.dimensiones.alto;
  }

  /**
   * Obtiene todas las orientaciones posibles de un producto (rotaciones 3D)
   */
  getProductOrientations(product) {
    if (!product.dimensiones) return [];
    
    const { largo, ancho, alto } = product.dimensiones;
    const orientations = [
      { width: largo, height: ancho, depth: alto },
      { width: largo, height: alto, depth: ancho },
      { width: ancho, height: largo, depth: alto },
      { width: ancho, height: alto, depth: largo },
      { width: alto, height: largo, depth: ancho },
      { width: alto, height: ancho, depth: largo }
    ];

    // Eliminar orientaciones duplicadas
    const uniqueOrientations = [];
    orientations.forEach(orientation => {
      const exists = uniqueOrientations.some(existing => 
        existing.width === orientation.width &&
        existing.height === orientation.height &&
        existing.depth === orientation.depth
      );
      if (!exists) {
        uniqueOrientations.push(orientation);
      }
    });

    return uniqueOrientations;
  }

  /**
   * Verifica si un producto cabe en una posición específica del casillero
   */
  canFitInPosition(product, position, locker) {
    const orientations = this.getProductOrientations(product);
    
    for (const orientation of orientations) {
      // Verificar que no se salga de los límites del casillero
      if (position.x + orientation.width > this.LOCKER_DIMENSIONS.width ||
          position.y + orientation.height > this.LOCKER_DIMENSIONS.height ||
          position.z + orientation.depth > this.LOCKER_DIMENSIONS.depth) {
        continue;
      }

      // Verificar que no se superponga con productos existentes
      let canFit = true;
      for (const existingProduct of locker.products) {
        if (this.productsOverlap(
          { x: position.x, y: position.y, z: position.z, ...orientation },
          existingProduct
        )) {
          canFit = false;
          break;
        }
      }

      if (canFit) {
        return {
          fits: true,
          orientation: orientation,
          position: position
        };
      }
    }

    return { fits: false };
  }

  /**
   * Verifica si dos productos se superponen
   */
  productsOverlap(product1, product2) {
    return !(product1.x + product1.width <= product2.x ||
             product2.x + product2.width <= product1.x ||
             product1.y + product1.height <= product2.y ||
             product2.y + product2.height <= product1.y ||
             product1.z + product1.depth <= product2.z ||
             product2.z + product2.depth <= product1.z);
  }

  /**
   * Encuentra la mejor posición para un producto en el casillero
   */
  findBestPosition(product, locker) {
    const positions = this.generateCandidatePositions(locker);
    
    for (const position of positions) {
      const result = this.canFitInPosition(product, position, locker);
      if (result.fits) {
        return result;
      }
    }

    return { fits: false };
  }

  /**
   * Genera posiciones candidatas para colocar productos
   */
  generateCandidatePositions(locker) {
    const positions = [];
    
    // Si el casillero está vacío, empezar en el origen
    if (locker.products.length === 0) {
      positions.push({ x: 0, y: 0, z: 0 });
      return positions;
    }

    // Generar posiciones basadas en los productos existentes
    for (const existingProduct of locker.products) {
      // Posición a la derecha del producto
      positions.push({
        x: existingProduct.x + existingProduct.width,
        y: existingProduct.y,
        z: existingProduct.z
      });

      // Posición arriba del producto
      positions.push({
        x: existingProduct.x,
        y: existingProduct.y + existingProduct.height,
        z: existingProduct.z
      });

      // Posición detrás del producto
      positions.push({
        x: existingProduct.x,
        y: existingProduct.y,
        z: existingProduct.z + existingProduct.depth
      });

      // Posición diagonal (esquina)
      positions.push({
        x: existingProduct.x + existingProduct.width,
        y: existingProduct.y + existingProduct.height,
        z: existingProduct.z
      });

      positions.push({
        x: existingProduct.x + existingProduct.width,
        y: existingProduct.y,
        z: existingProduct.z + existingProduct.depth
      });

      positions.push({
        x: existingProduct.x,
        y: existingProduct.y + existingProduct.height,
        z: existingProduct.z + existingProduct.depth
      });

      // Posición diagonal completa
      positions.push({
        x: existingProduct.x + existingProduct.width,
        y: existingProduct.y + existingProduct.height,
        z: existingProduct.z + existingProduct.depth
      });
    }

    // Filtrar posiciones válidas (dentro de los límites)
    return positions.filter(pos => 
      pos.x >= 0 && pos.y >= 0 && pos.z >= 0 &&
      pos.x < this.LOCKER_DIMENSIONS.width &&
      pos.y < this.LOCKER_DIMENSIONS.height &&
      pos.z < this.LOCKER_DIMENSIONS.depth
    );
  }

  /**
   * Calcula el estado actual de un casillero con Bin Packing
   */
  calculateLockerStatus(lockerNumber, orders) {
    const locker = {
      number: lockerNumber,
      dimensions: this.LOCKER_DIMENSIONS,
      products: [],
      usedVolume: 0,
      maxVolume: this.LOCKER_DIMENSIONS.width * this.LOCKER_DIMENSIONS.height * this.LOCKER_DIMENSIONS.depth
    };

    // Procesar productos de las órdenes
    for (const order of orders) {
      for (const item of order.items) {
        if (item.assigned_locker === lockerNumber && item.product?.dimensiones) {
          const productVolume = this.calculateVolume(item.product);
          
          // Intentar colocar el producto en el casillero
          const placement = this.findBestPosition(item.product, locker);
          
          if (placement.fits) {
            // Agregar el producto al casillero
            locker.products.push({
              id: item.product._id,
              name: item.product.nombre,
              quantity: item.quantity,
              volume: productVolume,
              x: placement.position.x,
              y: placement.position.y,
              z: placement.position.z,
              width: placement.orientation.width,
              height: placement.orientation.height,
              depth: placement.orientation.depth,
              orderId: order._id
            });
            
            locker.usedVolume += productVolume * item.quantity;
          }
        }
      }
    }

    const usagePercentage = Math.round((locker.usedVolume / locker.maxVolume) * 100);
    
    return {
      lockerNumber,
      usedVolume: locker.usedVolume,
      maxVolume: locker.maxVolume,
      usagePercentage,
      isFull: locker.usedVolume >= locker.maxVolume,
      products: locker.products,
      canFitMore: this.canFitMoreProducts(locker)
    };
  }

  /**
   * Verifica si se pueden agregar más productos al casillero
   */
  canFitMoreProducts(locker) {
    // Crear un producto de prueba pequeño para verificar si hay espacio
    const testProduct = {
      dimensiones: {
        largo: 5,  // 5cm x 5cm x 5cm = producto muy pequeño
        ancho: 5,
        alto: 5
      }
    };

    const placement = this.findBestPosition(testProduct, locker);
    return placement.fits;
  }

  /**
   * Verifica si un producto específico cabe en un casillero
   */
  canFitProduct(lockerNumber, orders, newProduct) {
    const locker = {
      number: lockerNumber,
      dimensions: this.LOCKER_DIMENSIONS,
      products: []
    };

    // Reconstruir el estado actual del casillero
    for (const order of orders) {
      for (const item of order.items) {
        if (item.assigned_locker === lockerNumber && item.product?.dimensiones) {
          const placement = this.findBestPosition(item.product, locker);
          if (placement.fits) {
            locker.products.push({
              x: placement.position.x,
              y: placement.position.y,
              z: placement.position.z,
              width: placement.orientation.width,
              height: placement.orientation.height,
              depth: placement.orientation.depth
            });
          }
        }
      }
    }

    // Intentar colocar el nuevo producto
    const placement = this.findBestPosition(newProduct, locker);
    return {
      canFit: placement.fits,
      position: placement.fits ? placement.position : null,
      orientation: placement.fits ? placement.orientation : null
    };
  }

  /**
   * Encuentra el mejor casillero para un producto
   */
  findBestLockerForProduct(orders, newProduct) {
    const lockerScores = [];

    for (let lockerNumber = 1; lockerNumber <= 12; lockerNumber++) {
      const result = this.canFitProduct(lockerNumber, orders, newProduct);
      
      if (result.canFit) {
        // Calcular score basado en eficiencia de espacio
        const lockerStatus = this.calculateLockerStatus(lockerNumber, orders);
        const score = 100 - lockerStatus.usagePercentage; // Menor uso = mejor score
        
        lockerScores.push({
          lockerNumber,
          score,
          usagePercentage: lockerStatus.usagePercentage,
          canFit: true
        });
      }
    }

    // Ordenar por score (mejor primero)
    lockerScores.sort((a, b) => b.score - a.score);
    
    return {
      success: lockerScores.length > 0,
      bestLocker: lockerScores.length > 0 ? lockerScores[0] : null,
      allAvailable: lockerScores
    };
  }

  /**
   * Obtiene estadísticas detalladas de todos los casilleros
   */
  getAllLockersStatus(orders) {
    const lockersStatus = [];
    
    for (let i = 1; i <= 12; i++) {
      const status = this.calculateLockerStatus(i, orders);
      lockersStatus.push(status);
    }

    const totalUsedVolume = lockersStatus.reduce((sum, locker) => sum + locker.usedVolume, 0);
    const totalMaxVolume = lockersStatus.reduce((sum, locker) => sum + locker.maxVolume, 0);
    const usedLockers = lockersStatus.filter(locker => locker.products.length > 0).length;

    return {
      generalStats: {
        totalLockers: 12,
        usedLockers,
        availableLockers: 12 - usedLockers,
        totalUsedVolume,
        totalMaxVolume,
        overallEfficiency: Math.round((totalUsedVolume / totalMaxVolume) * 100)
      },
      lockers: lockersStatus
    };
  }
}

module.exports = new BinPackingService(); 