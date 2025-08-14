import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

export interface QRCode {
  qr_id: string;
  qr_url: string;
  status: 'disponible' | 'vencido' | 'recogido';
  vencimiento: string;
  generado_en: string;
  recogido_en?: string;
  order: any;
  appointment: any;
}

export interface GenerateQRResponse {
  success: boolean;
  message: string;
  qr: {
    qr_id: string;
    qr_url: string;
    status: string;
    vencimiento: string;
  };
}

class QRService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Generar un nuevo código QR para una cita
  async generateQR(appointmentId: string): Promise<GenerateQRResponse> {
    try {
      const response = await fetch(`${ENDPOINTS.QR}/generate/${appointmentId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar QR');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al generar QR:', error);
      throw error;
    }
  }

  async getQRByAppointment(appointmentId: string): Promise<{ success: boolean; qr: QRCode }> {
    try {
      const response = await fetch(`${ENDPOINTS.QR}/appointment/${appointmentId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener QR');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al obtener QR de la cita:', error);
      throw error;
    }
  }

  // Obtener información de un QR específico
  async getQRInfo(qrId: string): Promise<{ success: boolean; qr: QRCode }> {
    try {
      const response = await fetch(`${ENDPOINTS.QR}/info/${qrId}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener información del QR');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error al obtener información del QR:', error);
      throw error;
    }
  }

  // Obtener todos los QR del usuario
  async getUserQRs(): Promise<{ success: boolean; qrs: QRCode[] }> {
    try {
      const response = await fetch(`${ENDPOINTS.QR}/user`, {
        headers: this.getHeaders(),
      });
      
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener QRs del usuario');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error al obtener QRs del usuario:', error);
      throw error;
    }
  }

  // Verificar si un QR está vencido
  isQRExpired(qr: QRCode): boolean {
    const now = new Date();
    const expirationDate = new Date(qr.vencimiento);
    return now > expirationDate;
  }

  // Verificar si un QR puede ser usado
  canQRBeUsed(qr: QRCode): boolean {
    return qr.status === 'disponible' && !this.isQRExpired(qr);
  }

  // Obtener el estado visual del QR
  getQRStatus(qr: QRCode): { text: string; className: string } {
    if (qr.status === 'recogido') {
      return { text: 'Recogido', className: 'bg-success' };
    }
    
    if (qr.status === 'vencido' || this.isQRExpired(qr)) {
      return { text: 'Vencido', className: 'bg-danger' };
    }
    
    return { text: 'Disponible', className: 'bg-primary' };
  }
}

export default new QRService();
