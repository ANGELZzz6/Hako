import { ENDPOINTS } from '../config/api';
import authService from './authService';

const USER_API_URL = '/api/users';

export interface User {
  _id: string;
  id?: string;
  nombre: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  genero?: string;
  bio?: string;
}

export interface CreateUserData {
  nombre: string;
  email: string;
  contraseña: string;
}

export interface UpdateUserData {
  nombre?: string;
  email?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  genero?: string;
  bio?: string;
}

class UserService {
  private getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/all`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener usuarios');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<{ message: string; user: User }> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al actualizar usuario';
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

  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al eliminar usuario';
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

  async toggleUserStatus(id: string): Promise<{ message: string; user: User }> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/${id}/toggle-status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        // Manejar errores específicos de rate limiting
        if (response.status === 429) {
          throw new Error('Demasiadas peticiones. Por favor, espera un momento antes de intentar de nuevo.');
        }
        
        // Intentar parsear el error como JSON, si falla usar el texto
        let errorMessage = 'Error al cambiar estado del usuario';
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

  async getUserById(id: string): Promise<User> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/profile/${id}`, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener usuario');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async changePassword(actual: string, nueva: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/change-password`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ actual, nueva })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cambiar la contraseña');
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getSavedCards() {
    const response = await fetch(`${USER_API_URL}/saved-cards`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('No se pudieron obtener las tarjetas guardadas');
    return await response.json();
  }

  async saveCard(cardData: { cardId: string, lastFour: string, cardType: string, issuer?: string }) {
    const response = await fetch(`${USER_API_URL}/save-card`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(cardData)
    });
    if (!response.ok) throw new Error('No se pudo guardar la tarjeta');
    return await response.json();
  }
}

export default new UserService(); 