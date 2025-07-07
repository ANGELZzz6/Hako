import API_URL from '../config/api';
import authService from './authService';

export interface PaymentItem {
  id: string;
  title: string;
  picture_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Payment {
  _id: string;
  mp_payment_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  status_detail: string;
  amount: number;
  currency: string;
  payment_method: {
    type: string;
    id?: string;
  };
  external_reference: string;
  user_id: {
    _id: string;
    nombre: string;
    email: string;
  };
  purchased_items: PaymentItem[];
  date_created: string;
  date_approved?: string;
  description?: string;
  live_mode: boolean;
  createdAt: string;
  updatedAt: string;
}

class PaymentManagementService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async getAllPayments(): Promise<Payment[]> {
    try {
      const response = await fetch(`${API_URL}/payment/admin/all`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Error al obtener pagos');
      }
      
      const paymentsData = await response.json();
      return paymentsData;
    } catch (error) {
      console.error('Error en getAllPayments:', error);
      throw error;
    }
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    try {
      const response = await fetch(`${API_URL}/payment/admin/${paymentId}`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener el pago');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en getPaymentById:', error);
      throw error;
    }
  }

  async getPaymentStats(): Promise<{
    totalPayments: number;
    approvedPayments: number;
    pendingPayments: number;
    rejectedPayments: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    try {
      const response = await fetch(`${API_URL}/payment/admin/stats`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en getPaymentStats:', error);
      throw error;
    }
  }

  async updatePaymentStatus(paymentId: string, status: string): Promise<Payment> {
    try {
      const response = await fetch(`${API_URL}/payment/admin/${paymentId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar estado del pago');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en updatePaymentStatus:', error);
      throw error;
    }
  }

  async deletePayment(paymentId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/payment/admin/${paymentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar el pago');
      }
    } catch (error) {
      console.error('Error en deletePayment:', error);
      throw error;
    }
  }
}

export default new PaymentManagementService(); 