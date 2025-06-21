const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    precio: {
        type: Number,
        required: true,
        min: 0
    },
    descripcion: {
        type: String,
        required: true
    },
    imagen_url: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['premium', 'gamer', 'anime', 'kawaii', 'retro', 'sorpresa', 'manga', 'arte', 'limited', 'popular', 'coleccionista']
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema); 