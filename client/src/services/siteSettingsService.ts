import API_URL from '../config/api';
import authService from './authService';

export interface SiteSettings {
  _id?: string;
  heroTitle: string;
  heroDescription: string;
  heroCtaText: string;
  promoBannerEnabled: boolean;
  promoBannerMessage: string;
  contactEmail: string;
  footerTagline: string;
  aboutUsDescription: string;
}

class SiteSettingsService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async getSettings(): Promise<SiteSettings> {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Error al obtener la configuración del sitio');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching site settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: Partial<SiteSettings>): Promise<{ message: string; settings: SiteSettings }> {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(settings)
      });
      if (!response.ok) {
        throw new Error('Error al actualizar la configuración del sitio');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating site settings:', error);
      throw error;
    }
  }
}

export default new SiteSettingsService();
