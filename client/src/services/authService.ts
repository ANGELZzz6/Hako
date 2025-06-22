import { ENDPOINTS } from '../config/api';

export interface User {
  _id: string;
  nombre: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user: User;
  message: string;
}

class AuthService {
  async login(email: string, contraseña: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, contraseña }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en el inicio de sesión');
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async register(nombre: string, email: string, contraseña: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, email, contraseña }),
      });

      if (!response.ok) throw new Error('Error en el registro');
      const data = await response.json();
      // El backend solo devuelve mensaje, no usuario ni token
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('user');
  }
}

export default new AuthService(); 