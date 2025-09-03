import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

export interface LockerProduct {
  productId: string;
  productName: string;
  individualProductId?: string;
  originalProductId?: string;
  variants: Record<string, string>; // Talla: L, Color: Rojo
  dimensions: {
    largo: number;
    ancho: number;
    alto: number;
    peso: number;
  };
  calculatedSlots: number; // Slots que realmente ocupa
  quantity: number;
  volume: number;
}

export interface LockerAssignment {
  _id: string;
  lockerNumber: number;
  userId: string;
  userName: string;
  userEmail: string;
  appointmentId: string;
  scheduledDate: string;
  timeSlot: string;
  status: 'reserved' | 'active' | 'completed' | 'cancelled';
  products: LockerProduct[];
  totalSlotsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLockerAssignmentRequest {
  lockerNumber: number;
  userId: string;
  userName: string;
  userEmail: string;
  appointmentId: string;
  scheduledDate: string;
  timeSlot: string;
  products: Omit<LockerProduct, 'calculatedSlots' | 'volume'>[];
}

export interface UpdateLockerAssignmentRequest {
  status?: string;
  products?: LockerProduct[];
  totalSlotsUsed?: number;
}

class LockerAssignmentService {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Crear nueva asignación de casillero
  async createAssignment(data: CreateLockerAssignmentRequest): Promise<LockerAssignment> {
    try {
      const response = await fetch(ENDPOINTS.LOCKER_ASSIGNMENTS, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la asignación del casillero');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error creating locker assignment:', error);
      throw new Error(error.message || 'Error al crear la asignación del casillero');
    }
  }

  // Obtener asignaciones por fecha y hora
  async getAssignmentsByDateTime(date: string, timeSlot: string): Promise<LockerAssignment[]> {
    try {
      const url = `${ENDPOINTS.LOCKER_ASSIGNMENTS}/by-datetime?date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener las asignaciones de casilleros');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error fetching locker assignments:', error);
      throw new Error(error.message || 'Error al obtener las asignaciones de casilleros');
    }
  }

  // Obtener asignación por número de casillero
  async getAssignmentByLocker(lockerNumber: number, date: string, timeSlot: string): Promise<LockerAssignment | null> {
    try {
      const url = `${ENDPOINTS.LOCKER_ASSIGNMENTS}/by-locker/${lockerNumber}?date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null; // Casillero no tiene asignación
      }

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener la asignación del casillero');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error fetching locker assignment:', error);
      throw new Error(error.message || 'Error al obtener la asignación del casillero');
    }
  }

  // Actualizar asignación
  async updateAssignment(id: string, data: UpdateLockerAssignmentRequest): Promise<LockerAssignment> {
    try {
      const response = await fetch(`${ENDPOINTS.LOCKER_ASSIGNMENTS}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la asignación del casillero');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error updating locker assignment:', error);
      throw new Error(error.message || 'Error al actualizar la asignación del casillero');
    }
  }

  // Cambiar estado de asignación
  async updateStatus(id: string, status: string): Promise<LockerAssignment> {
    try {
      const response = await fetch(`${ENDPOINTS.LOCKER_ASSIGNMENTS}/${id}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el estado de la asignación');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error updating assignment status:', error);
      throw new Error(error.message || 'Error al actualizar el estado de la asignación');
    }
  }

  // Eliminar asignación
  async deleteAssignment(id: string): Promise<void> {
    try {
      const response = await fetch(`${ENDPOINTS.LOCKER_ASSIGNMENTS}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la asignación del casillero');
      }
    } catch (error: any) {
      console.error('Error deleting locker assignment:', error);
      throw new Error(error.message || 'Error al eliminar la asignación del casillero');
    }
  }

  // Obtener todas las asignaciones (para admin)
  async getAllAssignments(filters?: {
    date?: string;
    timeSlot?: string;
    status?: string;
    lockerNumber?: number;
  }): Promise<LockerAssignment[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.date) queryParams.append('date', filters.date);
      if (filters?.timeSlot) queryParams.append('timeSlot', filters.timeSlot);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.lockerNumber) queryParams.append('lockerNumber', filters.lockerNumber.toString());

      const url = `${ENDPOINTS.LOCKER_ASSIGNMENTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener todas las asignaciones');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error fetching all locker assignments:', error);
      throw new Error(error.message || 'Error al obtener todas las asignaciones');
    }
  }

  // Sincronizar asignaciones desde citas existentes
  async syncFromAppointments(date: string): Promise<LockerAssignment[]> {
    try {
      const response = await fetch(`${ENDPOINTS.LOCKER_ASSIGNMENTS}/sync-from-appointments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ date }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401();
          throw new Error('No autorizado');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al sincronizar desde las citas');
      }

      const result = await response.json();
      return result.data;
    } catch (error: any) {
      console.error('Error syncing from appointments:', error);
      throw new Error(error.message || 'Error al sincronizar desde las citas');
    }
  }
}

const lockerAssignmentService = new LockerAssignmentService();
export default lockerAssignmentService;
