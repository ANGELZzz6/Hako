import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

export interface DebugLog {
  id: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  details?: any;
  userId?: string;
  userAgent?: string;
  url?: string;
}

class DebugService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Enviar log de debug al servidor
  async sendDebugLog(log: DebugLog): Promise<void> {
    try {
      const response = await fetch(`${ENDPOINTS.DEBUG}/log`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(log),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al enviar log de debug');
      }
    } catch (error) {
      console.error('Error enviando log de debug:', error);
      // No lanzar error para evitar loops infinitos
    }
  }

  // Enviar múltiples logs de debug
  async sendDebugLogs(logs: DebugLog[]): Promise<void> {
    try {
      const response = await fetch(`${ENDPOINTS.DEBUG}/logs/batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ logs }),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al enviar logs de debug');
      }
    } catch (error) {
      console.error('Error enviando logs de debug:', error);
    }
  }

  // Obtener logs de debug del servidor (solo admin)
  async getDebugLogs(): Promise<DebugLog[]> {
    try {
      const response = await fetch(`${ENDPOINTS.DEBUG}/logs`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener logs de debug');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo logs de debug:', error);
      return [];
    }
  }

  // Limpiar logs antiguos del servidor
  async clearOldLogs(daysOld: number = 7): Promise<void> {
    try {
      const response = await fetch(`${ENDPOINTS.DEBUG}/logs/clear`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ daysOld }),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al limpiar logs antiguos');
      }
    } catch (error) {
      console.error('Error limpiando logs antiguos:', error);
    }
  }

  // Obtener estadísticas de debugging
  async getDebugStats(): Promise<{
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    lastError?: string;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.DEBUG}/stats`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de debug');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo estadísticas de debug:', error);
      return {
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      };
    }
  }
}

export default new DebugService();
