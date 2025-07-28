import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

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
  variants?: Record<string, string>;
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
      console.log('🛒 Obteniendo carrito desde:', ENDPOINTS.CART);
      console.log('Headers:', this.getHeaders());
      
      const response = await fetch(ENDPOINTS.CART, {
        headers: this.getHeaders(),
      });
      handle401(response);
      
      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta:', errorText);
        throw new Error('Error al obtener el box');
      }
      
      const cartData = await response.json();
      console.log('✅ Datos del carrito recibidos:', cartData);
      return cartData;
    } catch (error) {
      console.error('❌ Error en getCart:', error);
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
      handle401(response);
      if (!response.ok) throw new Error('Error al agregar al box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async addToCartWithVariants(cartItem: {
    productId: string;
    quantity: number;
    variants: Record<string, string>;
  }): Promise<Cart> {
    try {
      const response = await fetch(ENDPOINTS.CART, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(cartItem),
      });
      handle401(response);
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
      handle401(response);
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
      handle401(response);
      if (!response.ok) throw new Error('Error al eliminar del box');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async removeMultipleItems(productIds: string[]): Promise<Cart> {
    try {
      const response = await fetch(`${ENDPOINTS.CART}/items`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ productIds }),
      });
      handle401(response);
      if (!response.ok) throw new Error('Error al eliminar productos del box');
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
      handle401(response);
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
      handle401(response);
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
      handle401(response);
      if (!response.ok) throw new Error('Error al obtener estadísticas');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getCartHistory(cartId: string): Promise<any[]> {
    try {
      const response = await fetch(`${ENDPOINTS.CART}/admin/history/${cartId}`, {
        headers: this.getHeaders(),
      });
      handle401(response);
      if (!response.ok) throw new Error('Error al obtener historial');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export default new CartService(); 