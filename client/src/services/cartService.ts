import { ENDPOINTS } from '../config/api';
import authService from './authService';

export interface CartItem {
  id_producto: {
    _id: string;
    nombre: string;
    precio: number;
    imagen_url: string;
    descripcion?: string;
  };
  cantidad: number;
  precio_unitario: number;
  nombre_producto: string;
  imagen_producto: string;
}

export interface Cart {
  _id: string;
  id_usuario: string | {
    _id: string;
    nombre: string;
    email: string;
  };
  items: CartItem[];
  total: number;
  creado_en: string;
  actualizado_en: string;
}

class CartService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async getCart(): Promise<Cart> {
    try {
      const response = await fetch(ENDPOINTS.CART, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Error al obtener el box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async addToCart(productId: string, quantity: number = 1): Promise<Cart> {
    try {
      const response = await fetch(ENDPOINTS.CART, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ productId, quantity }),
      });
      if (!response.ok) throw new Error('Error al agregar al box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async updateCartItem(productId: string, quantity: number): Promise<Cart> {
    try {
      const response = await fetch(`${ENDPOINTS.CART}/item/${productId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error('Error al actualizar el box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async removeFromCart(productId: string): Promise<Cart> {
    try {
      const response = await fetch(`${ENDPOINTS.CART}/item/${productId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Error al eliminar del box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async clearCart(): Promise<Cart> {
    try {
      const response = await fetch(ENDPOINTS.CART, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Error al vaciar el box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Métodos para administradores
  async getAllCarts(): Promise<Cart[]> {
    try {
      const response = await fetch(`${ENDPOINTS.CART}/admin/all`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Error al obtener todos los boxes');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getCartStats(): Promise<{
    totalCarts: number;
    activeCarts: number;
    totalItems: number;
    totalValue: number;
  }> {
    try {
      const response = await fetch(`${ENDPOINTS.CART}/admin/stats`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Error al obtener estadísticas');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export default new CartService(); 