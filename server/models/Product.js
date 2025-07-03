const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },
    precio: {
        type: Number,
        required: [true, 'El precio es obligatorio'],
        min: [0, 'El precio no puede ser negativo'],
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: 'El precio debe ser mayor o igual a 0'
        }
    },
    stock: {
        type: Number,
        required: [true, 'El stock es obligatorio'],
        min: [0, 'El stock no puede ser negativo'],
        default: 0
    },
    imagen_url: {
        type: String,
        required: [true, 'La URL de la imagen es obligatoria'],
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: 'La URL de la imagen debe ser válida'
        }
    },
    images: [{
        type: String,
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+/.test(v);
            },
            message: 'La URL de la imagen debe ser válida'
        }
    }],
    adminRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comentario: { type: String, maxlength: 500 },
        rating: { type: Number, min: 1, max: 5 },
        fecha: { type: Date, default: Date.now }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isDestacado: {
        type: Boolean,
        default: false,
        description: 'Indica si el producto aparece en la sección de productos destacados'
    },
    isOferta: {
        type: Boolean,
        default: false,
        description: 'Indica si el producto está en oferta'
    },
    precioOferta: {
        type: Number,
        min: [0, 'El precio de oferta no puede ser negativo'],
        validate: {
            validator: function(v) {
                if (this.isOferta && v >= this.precio) {
                    return false;
                }
                return true;
            },
            message: 'El precio de oferta debe ser menor al precio original'
        },
        description: 'Precio especial cuando el producto está en oferta'
    },
    porcentajeDescuento: {
        type: Number,
        min: [0, 'El porcentaje de descuento no puede ser negativo'],
        max: [100, 'El porcentaje de descuento no puede exceder 100%'],
        description: 'Porcentaje de descuento aplicado al producto'
    },
    categoria: {
        type: String,
        required: [true, 'La categoría es obligatoria'],
        trim: true,
    },
    variants: {
        enabled: {
            type: Boolean,
            default: false,
            description: 'Indica si el producto tiene variantes personalizables'
        },
        attributes: [{
            name: {
                type: String,
                required: true,
                trim: true,
                description: 'Nombre del atributo (ej: Talla, Color, Tela)'
            },
            required: {
                type: Boolean,
                default: true,
                description: 'Indica si este atributo es obligatorio'
            },
            options: [{
                value: {
                    type: String,
                    required: true,
                    trim: true,
                    description: 'Valor de la opción (ej: XL, Rojo, Algodón)'
                },
                price: {
                    type: Number,
                    default: 0,
                    min: [0, 'El precio adicional no puede ser negativo'],
                    description: 'Precio adicional por esta opción (0 = precio base)'
                },
                stock: {
                    type: Number,
                    default: 0,
                    min: [0, 'El stock no puede ser negativo'],
                    description: 'Stock específico para esta variante'
                },
                isActive: {
                    type: Boolean,
                    default: true,
                    description: 'Indica si esta opción está disponible'
                }
            }]
        }]
    }
}, {
    timestamps: { 
        createdAt: 'fecha_creacion', 
        updatedAt: 'fecha_actualizacion' 
    }
});

// Índices para mejor rendimiento
productSchema.index({ nombre: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ precio: 1 });
productSchema.index({ isDestacado: 1 });
productSchema.index({ isOferta: 1 });
productSchema.index({ isActive: 1, isDestacado: 1 });
productSchema.index({ isActive: 1, isOferta: 1 });

// Método para verificar si hay stock disponible
productSchema.methods.hasStock = function(quantity = 1) {
    return this.stock >= quantity;
};

// Método para reducir stock
productSchema.methods.reduceStock = function(quantity = 1) {
    if (this.hasStock(quantity)) {
        this.stock -= quantity;
        return true;
    }
    return false;
};

// Método para aumentar stock
productSchema.methods.addStock = function(quantity = 1) {
    this.stock += quantity;
    return this.stock;
};

// Método para obtener el precio final (con oferta si aplica)
productSchema.methods.getPrecioFinal = function() {
    if (this.isOferta && this.precioOferta && this.precioOferta < this.precio) {
        return this.precioOferta;
    }
    return this.precio;
};

// Método para calcular el porcentaje de descuento
productSchema.methods.getPorcentajeDescuento = function() {
    if (this.isOferta && this.precioOferta && this.precioOferta < this.precio) {
        return Math.round(((this.precio - this.precioOferta) / this.precio) * 100);
    }
    return this.porcentajeDescuento || 0;
};

// Método para verificar si el producto tiene descuento activo
productSchema.methods.tieneDescuento = function() {
    return this.isOferta && this.precioOferta && this.precioOferta < this.precio;
};

module.exports = mongoose.model('Product', productSchema, 'productos'); 