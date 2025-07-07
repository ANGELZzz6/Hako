import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';
import type { OrderItem, Order } from '../types/order';

class OrderService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Obtener productos comprados por el usuario
  async getMyPurchasedProducts(): Promise<OrderItem[]> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/purchased-products`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener tus productos comprados');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener el pedido activo del usuario
  async getMyOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/mine`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener tu pedido');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener historial de pedidos
  async getMyOrderHistory(): Promise<Order[]> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/history`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener historial de pedidos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Seleccionar casillero
  async selectLocker(orderId: string, lockerNumber: number): Promise<Order> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}/select-locker`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ lockerNumber }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al seleccionar casillero');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Marcar como recogido
  async markAsPickedUp(orderId: string): Promise<Order> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}/pickup`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al marcar como recogido');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener productos disponibles para reclamar
  async getAvailableProducts(orderId: string): Promise<{
    orderId: string;
    items: OrderItem[];
    total_unclaimed: number;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}/available-products`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener productos disponibles');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Reclamar productos específicos
  async claimProducts(orderId: string, selectedItems: Array<{
    itemIndex: number;
    quantity: number;
    lockerNumber: number;
  }>): Promise<{
    message: string;
    order: Order;
    lockerAssignments: Array<{
      locker: number;
      volume: number;
      volumePercentage: number;
    }>;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}/claim-products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ selectedItems }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reclamar productos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Reclamar productos desde el inventario
  async claimProductsFromInventory(selectedItems: Array<{
    itemIndex: number;
    quantity: number;
    lockerNumber: number;
  }>): Promise<{
    message: string;
    lockerAssignments: Array<{
      locker: number;
      volume: number;
      volumePercentage: number;
    }>;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/claim-from-inventory`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ selectedItems }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reclamar productos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Reclamar productos individuales
  async claimIndividualProducts(selectedItems: Array<{
    individualProductId: string;
    lockerNumber: number;
  }>): Promise<{
    message: string;
    lockerAssignments: Array<{
      locker: number;
      volume: number;
      volumePercentage: number;
    }>;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/claim-individual-products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ selectedItems }),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reclamar productos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener un pedido por ID
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener el pedido');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener todos los pedidos (admin)
  async getAllOrders(): Promise<Order[]> {
    try {
      const response = await fetch(ENDPOINTS.ORDERS, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener todos los pedidos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener casilleros disponibles (admin)
  async getAvailableLockers(): Promise<{
    total: number;
    occupied: number[];
    available: number[];
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/lockers`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener casilleros disponibles');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener estado detallado de casilleros (admin)
  async getLockerStatus(): Promise<{
    total: number;
    lockers: Array<{
      number: number;
      status: 'available' | 'occupied';
      order?: {
        id: string;
        status: string;
        user: any;
        createdAt: string;
      };
    }>;
    summary: {
      available: number;
      occupied: number;
    };
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/admin/lockers/status`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al obtener estado de casilleros');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Liberar casillero manualmente (admin)
  async releaseLocker(orderId: string): Promise<{
    message: string;
    order: Order;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/admin/orders/${orderId}/release-locker`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al liberar casillero');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Borrar pedido (admin)
  async deleteOrder(orderId: string): Promise<{
    message: string;
    deletedOrderId: string;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      handle401(response);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al borrar pedido');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Actualizar estado de pedido (admin)
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    try {
      const response = await fetch(`${ENDPOINTS.ORDERS}/${orderId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });
      handle401(response);
      
      if (!response.ok) {
        throw new Error('Error al actualizar estado del pedido');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export default new OrderService(); 