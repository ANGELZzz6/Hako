// Servicio simple para manejo de casilleros
export interface LockerItem {
  id: string;
  name: string;
  volume: number; // en cm³
  quantity: number;
}

export interface LockerStatus {
  number: number;
  usedVolume: number;
  maxVolume: number;
  items: LockerItem[];
  usagePercentage: number;
  isFull: boolean;
  canFit: (additionalVolume: number) => boolean;
}

class SimpleLockerService {
  private readonly LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm = 125,000 cm³

  /**
   * Verifica si un casillero puede recibir más productos
   */
  canLockerFit(lockerNumber: number, currentItems: LockerItem[], additionalVolume: number): boolean {
    const currentVolume = currentItems.reduce((sum, item) => sum + (item.volume * item.quantity), 0);
    const totalVolume = currentVolume + additionalVolume;
    
    return totalVolume <= this.LOCKER_MAX_VOLUME;
  }

  /**
   * Calcula el estado actual de un casillero
   */
  getLockerStatus(lockerNumber: number, items: LockerItem[]): LockerStatus {
    const usedVolume = items.reduce((sum, item) => sum + (item.volume * item.quantity), 0);
    const usagePercentage = Math.round((usedVolume / this.LOCKER_MAX_VOLUME) * 100);
    
    return {
      number: lockerNumber,
      usedVolume,
      maxVolume: this.LOCKER_MAX_VOLUME,
      items,
      usagePercentage,
      isFull: usedVolume >= this.LOCKER_MAX_VOLUME,
      canFit: (additionalVolume: number) => this.canLockerFit(lockerNumber, items, additionalVolume)
    };
  }

  /**
   * Obtiene el estado de todos los casilleros
   */
  getAllLockersStatus(lockerAssignments: Map<number, LockerItem[]>): LockerStatus[] {
    const statuses: LockerStatus[] = [];
    
    // Para casilleros del 1 al 12
    for (let i = 1; i <= 12; i++) {
      const items = lockerAssignments.get(i) || [];
      statuses.push(this.getLockerStatus(i, items));
    }
    
    return statuses;
  }

  /**
   * Encuentra el mejor casillero para un producto
   */
  findBestLocker(lockerAssignments: Map<number, LockerItem[]>, productVolume: number): number | null {
    const availableLockers = [];
    
    for (let i = 1; i <= 12; i++) {
      const items = lockerAssignments.get(i) || [];
      if (this.canLockerFit(i, items, productVolume)) {
        const status = this.getLockerStatus(i, items);
        availableLockers.push({
          number: i,
          usagePercentage: status.usagePercentage
        });
      }
    }
    
    if (availableLockers.length === 0) {
      return null; // No hay casilleros disponibles
    }
    
    // Retornar el casillero con menor uso (más espacio disponible)
    availableLockers.sort((a, b) => a.usagePercentage - b.usagePercentage);
    return availableLockers[0].number;
  }

  /**
   * Convierte productos del formato de la aplicación
   */
  convertToLockerItems(items: any[]): LockerItem[] {
    return items.map(item => {
      const dimensions = item.dimensiones || item.product?.dimensiones;
      const volume = dimensions ? 
        dimensions.largo * dimensions.ancho * dimensions.alto : 
        0;

      return {
        id: item._id || item.id,
        name: item.product?.nombre || item.nombre || 'Producto',
        volume,
        quantity: item.quantity || 1
      };
    });
  }

  /**
   * Obtiene estadísticas generales
   */
  getStatistics(lockerAssignments: Map<number, LockerItem[]>) {
    const allStatuses = this.getAllLockersStatus(lockerAssignments);
    const usedLockers = allStatuses.filter(status => status.items.length > 0);
    const totalUsedVolume = allStatuses.reduce((sum, status) => sum + status.usedVolume, 0);
    const totalMaxVolume = allStatuses.reduce((sum, status) => sum + status.maxVolume, 0);
    
    return {
      totalLockers: 12,
      usedLockers: usedLockers.length,
      availableLockers: 12 - usedLockers.length,
      totalUsedVolume,
      totalMaxVolume,
      overallEfficiency: Math.round((totalUsedVolume / totalMaxVolume) * 100),
      lockersStatus: allStatuses
    };
  }

  /**
   * Valida si se puede agregar un producto a un casillero específico
   */
  validateLockerAssignment(lockerNumber: number, currentItems: LockerItem[], newItem: LockerItem): {
    valid: boolean;
    reason?: string;
    remainingSpace?: number;
  } {
    const currentVolume = currentItems.reduce((sum, item) => sum + (item.volume * item.quantity), 0);
    const newVolume = newItem.volume * newItem.quantity;
    const totalVolume = currentVolume + newVolume;
    
    if (totalVolume > this.LOCKER_MAX_VOLUME) {
      return {
        valid: false,
        reason: `El casillero ${lockerNumber} no tiene suficiente espacio. Necesitas ${newVolume} cm³ pero solo hay ${this.LOCKER_MAX_VOLUME - currentVolume} cm³ disponibles.`,
        remainingSpace: this.LOCKER_MAX_VOLUME - currentVolume
      };
    }
    
    return {
      valid: true,
      remainingSpace: this.LOCKER_MAX_VOLUME - totalVolume
    };
  }
}

export default new SimpleLockerService(); 