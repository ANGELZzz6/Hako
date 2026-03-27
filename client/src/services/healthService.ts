import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

export interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memory: {
    used: string;
    total: string;
    external: string;
  };
  database: {
    status: string;
    connectionState: number;
    host: string;
    port: number;
    name: string;
  };
  services: {
    mercadoPago: string;
    cloudinary: string;
    email: string;
  };
}

class HealthService {
  private getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getDetailedHealth(): Promise<HealthData> {
    try {
      const response = await fetch(`${ENDPOINTS.HEALTH}/detailed`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error fetching health status');
      }
      
      handle401(response);
      return await response.json();
    } catch (error) {
      console.error('Error fetching health status:', error);
      throw error;
    }
  }
}

export default new HealthService();
