import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

export interface TimeSlot {
  time: string;
  available: boolean;
  occupiedLockers: number[];
  availableLockers?: number;
  totalLockers?: number;
}

export interface AppointmentItem {
  product: string;
  quantity: number;
  lockerNumber: number;
}

export interface Appointment {
  _id: string;
  user: any;
  order: any;
  scheduledDate: string;
  timeSlot: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  itemsToPickup: Array<{
    product: {
      _id: string;
      nombre: string;
      imagen_url: string;
      descripcion?: string;
    };
    quantity: number;
    lockerNumber: number;
  }>;
  notes?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'user' | 'admin' | 'system';
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentData {
  orderId: string;
  scheduledDate: string;
  timeSlot: string;
  itemsToPickup: AppointmentItem[];
}

class AppointmentService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Obtener horarios disponibles para una fecha
  async getAvailableTimeSlots(date: string): Promise<{
    date: string;
    timeSlots: TimeSlot[];
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/available-slots/${date}`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener horarios disponibles');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Crear una nueva cita
  async createAppointment(data: CreateAppointmentData): Promise<{
    message: string;
    appointment: {
      id: string;
      scheduledDate: string;
      timeSlot: string;
      status: string;
    };
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la cita');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Agregar productos a una reserva existente
  async addProductsToAppointment(appointmentId: string, products: Array<{
    productId: string;
    quantity: number;
    lockerNumber: number;
  }>): Promise<{
    message: string;
    appointment: {
      id: string;
      scheduledDate: string;
      timeSlot: string;
      status: string;
      totalProducts: number;
    };
    addedProducts: number;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/my-appointments/${appointmentId}/add-products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ products }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al agregar productos a la reserva');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Crear múltiples reservas (una por casillero)
  async createMultipleAppointments(appointmentsData: CreateAppointmentData[]): Promise<{
    message: string;
    appointments: Array<{
      id: string;
      scheduledDate: string;
      timeSlot: string;
      status: string;
      lockerNumber: number;
    }>;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/multiple`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ appointments: appointmentsData }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear las reservas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener citas del usuario
  async getMyAppointments(): Promise<Appointment[]> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/my-appointments`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener tus citas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener una cita específica del usuario
  async getMyAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/my-appointments/${appointmentId}`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener la cita');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Cancelar una cita del usuario
  async cancelAppointment(appointmentId: string, reason?: string): Promise<{
    message: string;
    appointment: {
      id: string;
      status: string;
      cancelledAt: string;
    };
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/my-appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cancelar la cita');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // ===== ADMIN METHODS =====

  // Obtener todas las citas (admin)
  async getAllAppointments(params?: {
    status?: string;
    date?: string;
  }): Promise<Appointment[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.date) queryParams.append('date', params.date);

      const url = `${ENDPOINTS.APPOINTMENTS}/admin${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener todas las citas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Actualizar estado de una cita (admin)
  async updateAppointmentStatus(appointmentId: string, status: Appointment['status'], notes?: string): Promise<{
    message: string;
    appointment: {
      id: string;
      status: string;
      user: string;
      scheduledDate: string;
      timeSlot: string;
    };
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/admin/${appointmentId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el estado de la cita');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener estadísticas de citas (admin)
  async getAppointmentStats(): Promise<{
    total: number;
    today: number;
    byStatus: {
      scheduled: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      no_show: number;
    };
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/admin/stats`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de citas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Eliminar una cita (admin)
  async deleteAppointment(appointmentId: string): Promise<{
    message: string;
    deletedAppointment: {
      id: string;
      user: string;
      scheduledDate: string;
      timeSlot: string;
      status: string;
    };
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.APPOINTMENTS}/admin/${appointmentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar la cita');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

const appointmentService = new AppointmentService();
export default appointmentService; 