import { ENDPOINTS } from '../config/api';

export interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock: number;
}

class ProductService {
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await fetch(ENDPOINTS.PRODUCTS);
      if (!response.ok) throw new Error('Error al obtener productos');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/${id}`);
      if (!response.ok) throw new Error('Error al obtener el producto');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/category/${category}`);
      if (!response.ok) throw new Error('Error al obtener productos por categoría');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export default new ProductService(); 