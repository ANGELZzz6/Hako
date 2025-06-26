import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import type { User, AuthResponse } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, contraseña: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  register: (nombre: string, email: string, contraseña: string) => Promise<AuthResponse>;
  verifyCode: (email: string, code: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = authService.getCurrentUser();
        if (user && authService.isAuthenticated()) {
          // Validar token con el servidor
          const isValid = await authService.validateToken();
          if (isValid) {
            setCurrentUser(user);
          } else {
            authService.logout();
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
        authService.logout();
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, contraseña: string) => {
    try {
      const response = await authService.login(email, contraseña);
      
      if (response.verificacionPendiente) {
        // Si requiere verificación, no establecer usuario aún
        return;
      }
      
      if (response.token && response.user) {
        setCurrentUser(response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (googleToken: string) => {
    try {
      const response = await authService.loginWithGoogle(googleToken);
      if (response.token && response.user) {
        setCurrentUser(response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (nombre: string, email: string, contraseña: string): Promise<AuthResponse> => {
    try {
      const response = await authService.register(nombre, email, contraseña);
      // El registro no establece automáticamente la sesión
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      const response = await authService.verifyCode(email, code);
      if (response.token && response.user) {
        setCurrentUser(response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    loginWithGoogle,
    register,
    verifyCode,
    logout,
    isAdmin: currentUser?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 