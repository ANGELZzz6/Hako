import { ENDPOINTS } from '../config/api';
import authService from './authService';

export interface CartItem {
  product: {
    _id: string;
    name: string;
    price: number;
    image: string;
  };
  quantity: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
  total: number;
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
      if (!response.ok) throw new Error('Error al obtener el carrito');
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
      if (!response.ok) throw new Error('Error al agregar al carrito');
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
      if (!response.ok) throw new Error('Error al actualizar el carrito');
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
      if (!response.ok) throw new Error('Error al eliminar del carrito');
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
      if (!response.ok) throw new Error('Error al vaciar el carrito');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export default new CartService(); 