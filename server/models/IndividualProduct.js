const mongoose = require('mongoose');

const individualProductSchema = new mongoose.Schema({
  // Usuario propietario
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Orden original
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Producto base
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Índice individual dentro de la orden (1, 2, 3, etc.)
  individualIndex: {
    type: Number,
    required: true
  },
  
  // Estado del producto individual
  status: {
    type: String,
    enum: ['available', 'reserved', 'claimed', 'picked_up'],
    default: 'available'
  },
  
  // Casillero asignado (si está reservado o reclamado)
  assignedLocker: {
    type: Number,
    min: 1,
    max: 12
  },
  
  // Precio unitario
  unitPrice: {
    type: Number,
    required: true
  },
  
  // Dimensiones del producto (copiadas del producto original)
  dimensiones: {
    largo: {
      type: Number,
      min: [0, 'El largo no puede ser negativo'],
      description: 'Largo del producto en centímetros'
    },
    ancho: {
      type: Number,
      min: [0, 'El ancho no puede ser negativo'],
      description: 'Ancho del producto en centímetros'
    },
    alto: {
      type: Number,
      min: [0, 'El alto no puede ser negativo'],
      description: 'Alto del producto en centímetros'
    },
    peso: {
      type: Number,
      min: [0, 'El peso no puede ser negativo'],
      description: 'Peso del producto en gramos'
    }
  },
  
  // Fechas importantes
  reservedAt: Date,
  claimedAt: Date,
  pickedUpAt: Date,
  
  // Información del pago que generó este producto individual
  payment: {
    mp_payment_id: String,
    status: String
  },
  
  // Variantes seleccionadas para este producto individual
  variants: {
    type: Map,
    of: String,
    default: undefined,
    description: 'Variantes seleccionadas para este producto (ej: { "Talla": "XL", "Color": "Rojo" })'
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
individualProductSchema.index({ user: 1 });
individualProductSchema.index({ order: 1 });
individualProductSchema.index({ product: 1 });
individualProductSchema.index({ status: 1 });
individualProductSchema.index({ assignedLocker: 1 });
individualProductSchema.index({ user: 1, status: 1 });

// Método para verificar si está disponible
individualProductSchema.methods.isAvailable = function() {
  return this.status === 'available';
};

// Método para verificar si está reservado
individualProductSchema.methods.isReserved = function() {
  return this.status === 'reserved';
};

// Método para verificar si está reclamado
individualProductSchema.methods.isClaimed = function() {
  return this.status === 'claimed';
};

// Método para verificar si está recogido
individualProductSchema.methods.isPickedUp = function() {
  return this.status === 'picked_up';
};

// Método para verificar si el producto tiene dimensiones
individualProductSchema.methods.tieneDimensiones = function() {
  return this.dimensiones && 
         this.dimensiones.largo && 
         this.dimensiones.ancho && 
         this.dimensiones.alto;
};

// Método para calcular el volumen del producto
individualProductSchema.methods.getVolumen = function() {
  if (this.dimensiones && this.dimensiones.largo && this.dimensiones.ancho && this.dimensiones.alto) {
    return this.dimensiones.largo * this.dimensiones.ancho * this.dimensiones.alto;
  }
  return 0;
};

/**
 * Obtiene las dimensiones del producto individual, considerando variantes si existen
 * @returns {Object|null} Las dimensiones correspondientes o null si no hay dimensiones
 */
individualProductSchema.methods.getVariantOrProductDimensions = function() {
  // Si el producto individual tiene variantes y el producto base tiene variantes habilitadas
  if (this.variants && this.variants.size > 0) {
    // Necesitamos poblar el producto para acceder a sus variantes
    if (this.populated('product') && this.product.variants && this.product.variants.enabled) {
      const selectedVariants = Object.fromEntries(this.variants);
      console.log('🔍 IndividualProduct.getVariantOrProductDimensions - selectedVariants:', selectedVariants);
      const variantDimensiones = this.product.getVariantOrProductDimensions(selectedVariants);
      console.log('🔍 IndividualProduct.getVariantOrProductDimensions - variantDimensiones:', variantDimensiones);
      return variantDimensiones;
    }
  }
  // Si no hay variantes o no se puede calcular, usar las dimensiones del producto base poblado
  if (this.populated('product') && this.product.dimensiones) {
    return this.product.dimensiones;
  }
  // Fallback a las dimensiones estáticas copiadas
  return this.dimensiones;
};

/**
 * Obtiene el volumen del producto individual, considerando variantes si existen
 * @returns {number} El volumen correspondiente
 */
individualProductSchema.methods.getVariantOrProductVolume = function() {
  const dimensiones = this.getVariantOrProductDimensions();
  if (dimensiones && dimensiones.largo && dimensiones.ancho && dimensiones.alto) {
    return dimensiones.largo * dimensiones.ancho * dimensiones.alto;
  }
  return 0;
};

module.exports = mongoose.model('IndividualProduct', individualProductSchema); 