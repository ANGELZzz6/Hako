const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  // Single document enforcement
  singleton: {
    type: String,
    default: 'config',
    unique: true
  },

  // Hero Section
  heroTitle: {
    type: String,
    default: 'Descubre el futuro del coleccionismo'
  },
  heroDescription: {
    type: String,
    default: 'Encuentra las figuras más exclusivas y las últimas reservas en nuestra tienda.'
  },
  heroCtaText: {
    type: String,
    default: 'Ver productos'
  },

  // Promotional Banner
  promoBannerEnabled: {
    type: Boolean,
    default: false
  },
  promoBannerMessage: {
    type: String,
    default: '¡Bienvenido a Hako! Recoge tus productos en nuestros casilleros.'
  },

  // Footer & Contact
  contactEmail: {
    type: String,
    default: 'contacto@hako.com'
  },
  footerTagline: {
    type: String,
    default: 'Tu tienda de confianza para coleccionables.'
  },
  aboutUsDescription: {
    type: String,
    default: 'Somos apasionados por el coleccionismo trayendo lo mejor de Japón a tus manos.'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
