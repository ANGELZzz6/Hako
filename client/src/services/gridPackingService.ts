// Servicio de empaquetado por slots 3D (cuadrícula)

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

export interface PackedItem {
  product: Product3D;
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number };
  slotsUsed: number;
  volume: number;
}

export interface Locker3D {
  id: string;
  grid: (string | null)[][][];
  packedProducts: PackedItem[];
  usedSlots: number;
  isFull: boolean;
}

export interface PackingResult {
  lockers: Locker3D[];
  failedProducts: Product3D[];
  rejectedProducts: { product: Product3D; reason: string }[];
  totalEfficiency: number;
  totalUnusedSlots: number;
  packingScore: number;
  totalLockers: number;
}

class GridPackingService {
  SLOT_SIZE = 15; // cm
  GRID_DIMENSIONS = { x: 3, y: 3, z: 3 }; // 3x3x3 = 27 slots
  TOTAL_SLOTS = this.GRID_DIMENSIONS.x * this.GRID_DIMENSIONS.y * this.GRID_DIMENSIONS.z;
  MAX_DIMENSIONS = {
    x: this.GRID_DIMENSIONS.x * this.SLOT_SIZE,
    y: this.GRID_DIMENSIONS.y * this.SLOT_SIZE,
    z: this.GRID_DIMENSIONS.z * this.SLOT_SIZE,
  };

  packProducts3D(products: Product3D[]): PackingResult {
    let lockers: Locker3D[] = [];
    const createNewLocker = () => {
      const locker: Locker3D = {
        id: `locker_${lockers.length + 1}`,
        grid: this.initializeGrid(),
        packedProducts: [],
        usedSlots: 0,
        isFull: false,
      };
      lockers.push(locker);
      return locker;
    };

    if (products.length === 0) {
      return {
        lockers: [],
        failedProducts: [],
        rejectedProducts: [],
        totalEfficiency: 0,
        totalUnusedSlots: 0,
        packingScore: 0,
        totalLockers: 0,
      };
    }

    // Expandir productos por cantidad
    const allProducts: Product3D[] = [];
    for (const product of products) {
      for (let i = 0; i < product.quantity; i++) {
        allProducts.push({ ...product, quantity: 1 });
      }
    }

    const failedProducts: Product3D[] = [];
    const rejectedProducts: { product: Product3D; reason: string }[] = [];

    // Ordenar productos por volumen (más grandes primero)
    allProducts.sort((a, b) => b.volume - a.volume);

    // Empaquetar productos
    for (const product of allProducts) {
      // Validar tamaño del producto
      const validation = this.validateProductSize(product);
      if (!validation.valid) {
        rejectedProducts.push({ product, reason: validation.reason });
        continue;
      }

      // Intentar colocar en todos los casilleros existentes
      let packed = false;
      for (const locker of lockers) {
        const packedItem = this.tryPlaceProduct(product, locker);
        if (packedItem) {
          this.placeProductInGrid(packedItem, locker);
          locker.packedProducts.push(packedItem);
          locker.usedSlots += packedItem.slotsUsed;
          if (locker.usedSlots === this.TOTAL_SLOTS) {
            locker.isFull = true;
          }
          packed = true;
          break;
        }
      }
      // Si no cabe en ninguno, crear un nuevo casillero y probar
      if (!packed) {
        const newLocker = createNewLocker();
        const packedItem = this.tryPlaceProduct(product, newLocker);
        if (packedItem) {
          this.placeProductInGrid(packedItem, newLocker);
          newLocker.packedProducts.push(packedItem);
          newLocker.usedSlots += packedItem.slotsUsed;
          if (newLocker.usedSlots === this.TOTAL_SLOTS) {
            newLocker.isFull = true;
          }
        } else {
          // No cabe ni en un casillero vacío
          failedProducts.push(product);
        }
      }
    }

    // Calcular estadísticas totales
    const totalUsedSlots = lockers.reduce((sum, locker) => sum + locker.usedSlots, 0);
    const totalSlots = lockers.length * this.TOTAL_SLOTS;
    const totalEfficiency = totalSlots > 0 ? (totalUsedSlots / totalSlots) * 100 : 0;
    const totalUnusedSlots = totalSlots - totalUsedSlots;
    const packingScore = this.calculatePackingScore(totalUsedSlots, totalSlots, failedProducts, rejectedProducts);

    return {
      lockers,
      failedProducts,
      rejectedProducts,
      totalEfficiency,
      totalUnusedSlots,
      packingScore,
      totalLockers: lockers.length,
    };
  }

  initializeGrid() {
    const grid = [];
    for (let x = 0; x < this.GRID_DIMENSIONS.x; x++) {
      grid[x] = [];
      for (let y = 0; y < this.GRID_DIMENSIONS.y; y++) {
        grid[x][y] = [];
        for (let z = 0; z < this.GRID_DIMENSIONS.z; z++) {
          grid[x][y][z] = null;
        }
      }
    }
    return grid;
  }

  validateProductSize(product: Product3D) {
    const { length, width, height } = product.dimensions;
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

  tryPlaceProductInAnyLocker(product: Product3D, lockers: Locker3D[], currentLockerIndex: number, createNewLocker: () => Locker3D): PackedItem | null {
    let currentLocker = lockers[currentLockerIndex];
    let packedItem = this.tryPlaceProduct(product, currentLocker);
    if (packedItem) {
      this.placeProductInGrid(packedItem, currentLocker);
      currentLocker.packedProducts.push(packedItem);
      currentLocker.usedSlots += packedItem.slotsUsed;
      if (currentLocker.usedSlots === this.TOTAL_SLOTS) {
        currentLocker.isFull = true;
        createNewLocker();
      }
      return packedItem;
    }
    // Intentar en otros casilleros existentes
    for (let i = 0; i < lockers.length; i++) {
      if (i === currentLockerIndex) continue;
      const locker = lockers[i];
      packedItem = this.tryPlaceProduct(product, locker);
      if (packedItem) {
        this.placeProductInGrid(packedItem, locker);
        locker.packedProducts.push(packedItem);
        locker.usedSlots += packedItem.slotsUsed;
        if (locker.usedSlots === this.TOTAL_SLOTS) {
          locker.isFull = true;
          createNewLocker();
        }
        return packedItem;
      }
    }
    // Si no cabe y el actual está lleno, crear uno nuevo y probar
    if (currentLocker.isFull) {
      createNewLocker();
      currentLocker = lockers[lockers.length - 1];
      packedItem = this.tryPlaceProduct(product, currentLocker);
      if (packedItem) {
        this.placeProductInGrid(packedItem, currentLocker);
        currentLocker.packedProducts.push(packedItem);
        currentLocker.usedSlots += packedItem.slotsUsed;
        return packedItem;
      }
    }
    return null;
  }

  tryPlaceProduct(product: Product3D, locker: Locker3D): PackedItem | null {
    const { length, width, height } = product.dimensions;
    const slotsNeeded = {
      x: Math.max(1, Math.ceil(length / this.SLOT_SIZE)),
      y: Math.max(1, Math.ceil(width / this.SLOT_SIZE)),
      z: Math.max(1, Math.ceil(height / this.SLOT_SIZE)),
    };
    const orientations = this.generateOrientations(slotsNeeded);
    for (const orientation of orientations) {
      const pos = this.findBestPosition(orientation, locker);
      if (pos) {
        return {
          product,
          position: pos,
          orientation,
          slotsUsed: orientation.x * orientation.y * orientation.z,
          volume: length * width * height,
        };
      }
    }
    return null;
  }

  generateOrientations(slotsNeeded: { x: number; y: number; z: number }) {
    // Todas las permutaciones de ejes
    return [
      { x: slotsNeeded.x, y: slotsNeeded.y, z: slotsNeeded.z },
      { x: slotsNeeded.x, y: slotsNeeded.z, z: slotsNeeded.y },
      { x: slotsNeeded.y, y: slotsNeeded.x, z: slotsNeeded.z },
      { x: slotsNeeded.y, y: slotsNeeded.z, z: slotsNeeded.x },
      { x: slotsNeeded.z, y: slotsNeeded.x, z: slotsNeeded.y },
      { x: slotsNeeded.z, y: slotsNeeded.y, z: slotsNeeded.x },
    ];
  }

  findBestPosition(orientation: { x: number; y: number; z: number }, locker: Locker3D) {
    for (let x = 0; x <= this.GRID_DIMENSIONS.x - orientation.x; x++) {
      for (let y = 0; y <= this.GRID_DIMENSIONS.y - orientation.y; y++) {
        for (let z = 0; z <= this.GRID_DIMENSIONS.z - orientation.z; z++) {
          if (this.canPlaceAt(x, y, z, orientation, locker)) {
            return { x, y, z };
          }
        }
      }
    }
    return null;
  }

  canPlaceAt(x: number, y: number, z: number, orientation: { x: number; y: number; z: number }, locker: Locker3D) {
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

  placeProductInGrid(packedItem: PackedItem, locker: Locker3D) {
    const { x, y, z } = packedItem.position;
    const { x: sx, y: sy, z: sz } = packedItem.orientation;
    for (let dx = 0; dx < sx; dx++) {
      for (let dy = 0; dy < sy; dy++) {
        for (let dz = 0; dz < sz; dz++) {
          locker.grid[x + dx][y + dy][z + dz] = packedItem.product.id;
        }
      }
    }
  }

  calculatePackingScore(totalUsedSlots: number, totalSlots: number, failedProducts: Product3D[], rejectedProducts: { product: Product3D; reason: string }[]) {
    const volumeEfficiency = totalSlots > 0 ? (totalUsedSlots / totalSlots) * 100 : 0;
    const failurePenalty = failedProducts.length * 5;
    const rejectionPenalty = rejectedProducts.length * 10;
    const efficiencyBonus = volumeEfficiency > 80 ? 20 : 0;
    const score = Math.max(0, Math.min(100, volumeEfficiency - failurePenalty - rejectionPenalty + efficiencyBonus));
    return Math.round(score);
  }
}

export default new GridPackingService(); 