import type { LockerProduct } from './lockerAssignmentService';

export interface ProductDimensions {
  largo: number;
  ancho: number;
  alto: number;
  peso: number;
}

export interface CalculatedProduct {
  productId: string;
  productName: string;
  individualProductId?: string;
  originalProductId?: string;
  variants: Record<string, string>;
  dimensions: ProductDimensions;
  calculatedSlots: number;
  quantity: number;
  volume: number;
}

class LockerCalculationService {
  private readonly SLOT_SIZE = 15; // Cada slot mide 15cm x 15cm x 15cm

  // Calcular dimensiones de un producto considerando variantes
  calculateProductDimensions(item: any): ProductDimensions {
    // PRIORIDAD 1: Usar dimensiones del backend si están disponibles
    if (item.dimensiones && this.isValidDimensions(item.dimensiones)) {
      return item.dimensiones;
    }

    // PRIORIDAD 2: Usar dimensiones calculadas por el backend
    if (item.calculatedDimensiones && this.isValidDimensions(item.calculatedDimensiones)) {
      return item.calculatedDimensiones;
    }

    // PRIORIDAD 3: Usar dimensiones del producto individual
    if (item.individualProductDimensions && this.isValidDimensions(item.individualProductDimensions)) {
      return item.individualProductDimensions;
    }

    // PRIORIDAD 4: Usar dimensiones del producto original
    if (item.originalProductDimensions && this.isValidDimensions(item.originalProductDimensions)) {
      return item.originalProductDimensions;
    }

    // PRIORIDAD 5: Procesar variantes para obtener dimensiones específicas
    const variantDimensions = this.getVariantDimensions(item);
    if (variantDimensions) {
      return variantDimensions;
    }

    // PRIORIDAD 6: Usar dimensiones del producto base
    if (item.product?.dimensiones && this.isValidDimensions(item.product.dimensiones)) {
      return item.product.dimensiones;
    }

    // PRIORIDAD 7: Usar dimensiones del producto individual
    if (item.individualProduct?.dimensiones && this.isValidDimensions(item.individualProduct.dimensiones)) {
      return item.individualProduct.dimensiones;
    }

    // PRIORIDAD 8: Usar dimensiones del producto original
    if (item.originalProduct?.dimensiones && this.isValidDimensions(item.originalProduct.dimensiones)) {
      return item.originalProduct.dimensiones;
    }

    // Fallback: dimensiones por defecto
    console.warn('No se pudieron obtener dimensiones válidas, usando valores por defecto');
    return { largo: 15, ancho: 15, alto: 15, peso: 0 };
  }

  // Obtener dimensiones de variantes específicas
  private getVariantDimensions(item: any): ProductDimensions | null {
    // Buscar variantes en diferentes estructuras
    const variants = item.variants || 
                    (item as any).selectedVariants || 
                    (item as any).productVariants ||
                    (item.individualProduct as any)?.variants ||
                    (item.originalProduct as any)?.variants;

    if (!variants || Object.keys(variants).length === 0) {
      return null;
    }

    // Buscar el producto que tenga variantes habilitadas
    const productWithVariants = item.product || 
                               (item.individualProduct as any)?.product || 
                               item.originalProduct;

    if (!productWithVariants?.variants?.enabled || !productWithVariants.variants.attributes) {
      return null;
    }

    // Buscar atributos que definen dimensiones
    const dimensionAttributes = productWithVariants.variants.attributes.filter(
      (a: any) => a.definesDimensions
    );

    if (dimensionAttributes.length === 0) {
      return null;
    }

    // Procesar cada atributo que define dimensiones
    for (const attr of dimensionAttributes) {
      const selectedValue = variants[attr.name];
      
      if (selectedValue) {
        const option = attr.options.find((opt: any) => opt.value === selectedValue);
        
        if (option && option.dimensiones && this.isValidDimensions(option.dimensiones)) {
          console.log(`✅ Usando dimensiones de la variante ${attr.name}: ${selectedValue}`, option.dimensiones);
          return option.dimensiones;
        }
      }
    }

    return null;
  }

  // Validar que las dimensiones sean válidas
  private isValidDimensions(dimensions: any): boolean {
    return dimensions && 
           typeof dimensions.largo === 'number' && dimensions.largo > 0 &&
           typeof dimensions.ancho === 'number' && dimensions.ancho > 0 &&
           typeof dimensions.alto === 'number' && dimensions.alto > 0;
  }

  // Calcular cuántos slots ocupa un producto
  calculateSlots(dimensions: ProductDimensions): number {
    const slotsX = Math.ceil(dimensions.largo / this.SLOT_SIZE);
    const slotsY = Math.ceil(dimensions.ancho / this.SLOT_SIZE);
    const slotsZ = Math.ceil(dimensions.alto / this.SLOT_SIZE);
    
    const totalSlots = slotsX * slotsY * slotsZ;
    
    console.log(`📏 Cálculo de slots para ${dimensions.largo}×${dimensions.ancho}×${dimensions.alto}:`, {
      slotsX, slotsY, slotsZ, totalSlots,
      formula: `${slotsX} × ${slotsY} × ${slotsZ} = ${totalSlots} slots`
    });
    
    return totalSlots;
  }

  // Calcular volumen de un producto
  calculateVolume(dimensions: ProductDimensions): number {
    return dimensions.largo * dimensions.ancho * dimensions.alto;
  }

  // Procesar un item completo y calcular todas sus propiedades
  processProductItem(item: any): CalculatedProduct {
    const dimensions = this.calculateProductDimensions(item);
    const calculatedSlots = this.calculateSlots(dimensions);
    const volume = this.calculateVolume(dimensions);

    // Obtener variantes si existen
    const variants = item.variants || 
                    (item as any).selectedVariants || 
                    (item as any).productVariants ||
                    (item.individualProduct as any)?.variants ||
                    (item.originalProduct as any)?.variants || {};

    // Obtener nombre del producto
    const productName = item.product?.nombre || 
                       ((item.individualProduct as any)?.product?.nombre) || 
                       ((item.originalProduct as any)?.nombre) || 
                       'Producto sin nombre';

    // Obtener IDs
    const productId = item.product?._id || 
                     ((item.individualProduct as any)?._id) || 
                     ((item.originalProduct as any)?._id) || 
                     'unknown';

    const individualProductId = (item.individualProduct as any)?._id;
    const originalProductId = (item.originalProduct as any)?._id;

    const result: CalculatedProduct = {
      productId,
      productName,
      individualProductId,
      originalProductId,
      variants,
      dimensions,
      calculatedSlots,
      quantity: item.quantity || 1,
      volume
    };

    console.log(`✅ Producto procesado: ${productName}`, {
      dimensions: result.dimensions,
      calculatedSlots: result.calculatedSlots,
      volume: result.volume,
      variants: result.variants
    });

    return result;
  }

  // Calcular slots totales para múltiples productos
  calculateTotalSlots(products: CalculatedProduct[]): number {
    return products.reduce((total, product) => {
      return total + (product.calculatedSlots * product.quantity);
    }, 0);
  }

  // Verificar si un casillero puede acomodar los productos
  canFitInLocker(products: CalculatedProduct[], maxSlots: number = 27): boolean {
    const totalSlots = this.calculateTotalSlots(products);
    return totalSlots <= maxSlots;
  }

  // Obtener información de slots para visualización 3D
  getSlotsInfo(products: CalculatedProduct[]): {
    totalSlots: number;
    maxSlots: number;
    efficiency: number;
    canFit: boolean;
    breakdown: Array<{
      productName: string;
      slots: number;
      quantity: number;
      totalSlots: number;
    }>;
  } {
    const maxSlots = 27; // 3x3x3 = 27 slots
    const totalSlots = this.calculateTotalSlots(products);
    const efficiency = (totalSlots / maxSlots) * 100;

    const breakdown = products.map(product => ({
      productName: product.productName,
      slots: product.calculatedSlots,
      quantity: product.quantity,
      totalSlots: product.calculatedSlots * product.quantity
    }));

    return {
      totalSlots,
      maxSlots,
      efficiency: Math.round(efficiency * 100) / 100,
      canFit: totalSlots <= maxSlots,
      breakdown
    };
  }
}

const lockerCalculationService = new LockerCalculationService();
export default lockerCalculationService;
