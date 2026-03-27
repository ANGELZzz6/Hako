const SiteSettings = require('../models/SiteSettings');

// Recuperar configuraciones del sitio
exports.getSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne({ singleton: 'config' });
    
    // Si no existe, crear la configuración por defecto
    if (!settings) {
      settings = new SiteSettings();
      await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error obteniendo la configuración del sitio:', error);
    res.status(500).json({ message: 'Error al obtener la configuración' });
  }
};

// Actualizar configuración
exports.updateSettings = async (req, res) => {
  try {
    const { 
      heroTitle, 
      heroDescription, 
      heroCtaText, 
      promoBannerEnabled, 
      promoBannerMessage, 
      contactEmail, 
      footerTagline, 
      aboutUsDescription 
    } = req.body;

    let settings = await SiteSettings.findOne({ singleton: 'config' });
    
    if (!settings) {
      settings = new SiteSettings();
    }

    // Assigning updated fields if they are provided
    if (heroTitle !== undefined) settings.heroTitle = heroTitle;
    if (heroDescription !== undefined) settings.heroDescription = heroDescription;
    if (heroCtaText !== undefined) settings.heroCtaText = heroCtaText;
    if (promoBannerEnabled !== undefined) settings.promoBannerEnabled = promoBannerEnabled;
    if (promoBannerMessage !== undefined) settings.promoBannerMessage = promoBannerMessage;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (footerTagline !== undefined) settings.footerTagline = footerTagline;
    if (aboutUsDescription !== undefined) settings.aboutUsDescription = aboutUsDescription;

    await settings.save();

    res.json({ message: 'Configuración actualizada con éxito', settings });
  } catch (error) {
    console.error('Error actualizando la configuración del sitio:', error);
    res.status(500).json({ message: 'Error interno del servidor actualizando configuración' });
  }
};
