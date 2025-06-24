import { ENDPOINTS } from '../config/api';

export interface User {
  id: string;
  nombre: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user?: User;
  message: string;
  verificacionPendiente?: boolean;
  token?: string;
}

class AuthService {
  private getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  setToken(token: string) {
    // Usar sessionStorage en lugar de localStorage para mayor seguridad
    // El token se elimina cuando se cierra la pestaña/navegador
    sessionStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    return sessionStorage.getItem('authToken');
  }

  private removeToken() {
    sessionStorage.removeItem('authToken');
  }

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
      
      // No guardar usuario hasta que se complete la verificación
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

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en el registro');
      
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async verifyCode(email: string, code: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Código incorrecto o expirado');
      
      // Guardar token y usuario solo tras verificación exitosa
      if (data.token && data.user) {
        this.setToken(data.token);
        // Guardar solo información no sensible del usuario
        const safeUser = {
          id: data.user.id,
          nombre: data.user.nombre,
          email: data.user.email,
          role: data.user.role
        };
        sessionStorage.setItem('user', JSON.stringify(safeUser));
      }
      
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  logout(): void {
    this.removeToken();
    sessionStorage.removeItem('user');
    // Limpiar cualquier otro dato de sesión
    sessionStorage.clear();
  }

  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.logout(); // Limpiar datos corruptos
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Método para hacer requests autenticados
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = this.getAuthHeaders();
    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  }

  // Método para verificar si el token es válido
  async validateToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      // Aquí podrías hacer una llamada al backend para validar el token
      // Por ahora, solo verificamos que existe
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      this.logout();
      return false;
    }
  }

  // Método para renovar token (si implementas refresh tokens)
  async refreshToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      // Implementar lógica de refresh token aquí
      // Por ahora, retornamos false
      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      return false;
    }
  }

  async loginWithGoogle(googleToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${ENDPOINTS.AUTH}/google-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en el inicio de sesión con Google');
      if (data.token && data.user) {
        this.setToken(data.token);
        const safeUser = {
          id: data.user.id,
          nombre: data.user.nombre,
          email: data.user.email,
          role: data.user.role
        };
        sessionStorage.setItem('user', JSON.stringify(safeUser));
      }
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export default new AuthService(); 