import { ENDPOINTS } from '../config/api';
import authService from './authService';

export interface ReviewUser {
  _id: string;
  nombre: string;
  email: string;
}

export interface Review {
  user: ReviewUser;
  comentario: string;
  rating: number;
  fecha: string;
}

export interface VariantOption {
  value: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface VariantAttribute {
  name: string;
  required: boolean;
  options: VariantOption[];
}

export interface ProductVariants {
  enabled: boolean;
  attributes: VariantAttribute[];
}

export interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen_url: string;
  images?: string[];
  adminRating?: number;
  reviews?: Review[];
  isActive: boolean;
  isDestacado?: boolean;
  isOferta?: boolean;
  precioOferta?: number;
  porcentajeDescuento?: number;
  variants?: ProductVariants;
  fecha_creacion: string;
  fecha_actualizacion: string;
  categoria: string;
}

export interface CreateProductData {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen_url: string;
  categoria: string;
}

export interface UpdateProductData {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  imagen_url?: string;
  isActive?: boolean;
  images?: string[];
  adminRating?: number;
  categoria?: string;
}

export interface ProductSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductSearchResponse {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class ProductService {
  private getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Obtener productos públicos (con paginación y búsqueda)
  async getProducts(params: ProductSearchParams = {}): Promise<ProductSearchResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await fetch(`${ENDPOINTS.PRODUCTS}?${queryParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener productos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener todos los productos (para administrador)
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/all`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener productos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener producto por ID
  async getProductById(id: string): Promise<Product> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener el producto');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Crear producto
  async createProduct(productData: CreateProductData): Promise<{ message: string; product: Product }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al crear producto';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear como JSON, usar el texto de la respuesta
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Actualizar producto
  async updateProduct(id: string, productData: UpdateProductData): Promise<{ message: string; product: Product }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al actualizar producto';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear como JSON, usar el texto de la respuesta
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Eliminar producto
  async deleteProduct(id: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al eliminar producto';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear como JSON, usar el texto de la respuesta
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Cambiar estado de producto
  async toggleProductStatus(id: string): Promise<{ message: string; product: Product }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/${id}/toggle-status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al cambiar estado del producto';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear como JSON, usar el texto de la respuesta
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Buscar productos
  async searchProducts(query: string, limit: number = 10): Promise<{ products: Product[]; total: number }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al buscar productos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Agregar reseña
  async addReview(productId: string, data: { comentario: string; rating: number }): Promise<void> {
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/${productId}/reviews`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al agregar reseña');
    }
  }

  // Editar reseña
  async editReview(productId: string, data: { comentario: string; rating: number }): Promise<void> {
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/${productId}/reviews`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al editar reseña');
    }
  }

  // Eliminar reseña
  async deleteReview(productId: string): Promise<void> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/${productId}/reviews`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar reseña');
      }
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener productos destacados
  async getDestacados(limit: number = 8): Promise<Product[]> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/destacados?limit=${limit}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener productos destacados');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener productos en oferta
  async getOfertas(limit: number = 12): Promise<Product[]> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/ofertas?limit=${limit}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener productos en oferta');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Cambiar estado de destacado
  async toggleDestacado(productId: string): Promise<{ message: string; product: Product }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/${productId}/destacado`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cambiar estado de destacado');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Cambiar estado de oferta
  async toggleOferta(productId: string, data?: { precioOferta?: number; porcentajeDescuento?: number }): Promise<{ message: string; product: Product }> {
    try {
      const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/${productId}/oferta`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data || {}),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cambiar estado de oferta');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Subir imagen del producto
  async uploadProductImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/upload-image`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }
    const data = await response.json();
    return data.url;
  }

  async getAllCategories(): Promise<string[]> {
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/categorias`);
    if (!response.ok) throw new Error('Error al obtener categorías');
    return await response.json();
  }

  async getProductsByCategory(categoria: string): Promise<Product[]> {
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/categorias/${encodeURIComponent(categoria)}/productos`);
    if (!response.ok) throw new Error('Error al obtener productos de la categoría');
    return await response.json();
  }

  async getAllSuggestions(): Promise<any[]> {
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/sugerencias`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener sugerencias');
    return await response.json();
  }

  async deleteSuggestion(id: string): Promise<void> {
    const response = await fetch(`${ENDPOINTS.PRODUCTS}/admin/sugerencias/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar sugerencia');
  }
}

export default new ProductService(); 