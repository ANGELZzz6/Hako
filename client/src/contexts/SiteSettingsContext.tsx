import React, { createContext, useContext, useState, useEffect } from 'react';
import siteSettingsService from '../services/siteSettingsService';
import type { SiteSettings } from '../services/siteSettingsService';

interface SiteSettingsContextType {
  settings: SiteSettings | null;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: SiteSettings = {
  heroTitle: 'Descubre el futuro del coleccionismo',
  heroDescription: 'Encuentra las figuras más exclusivas y las últimas reservas en nuestra tienda.',
  heroCtaText: 'Ver productos',
  promoBannerEnabled: false,
  promoBannerMessage: '¡Bienvenido a Hako! Recoge tus productos en nuestros casilleros.',
  contactEmail: 'contacto@hako.com',
  footerTagline: 'Tu tienda de confianza para coleccionables.',
  aboutUsDescription: 'Somos apasionados por el coleccionismo trayendo lo mejor de Japón a tus manos.'
};

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  error: null,
  refreshSettings: async () => { },
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await siteSettingsService.getSettings();
      setSettings(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching site settings in context:', err);
      setError(err.message || 'Error loading site config');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading, error, refreshSettings: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
