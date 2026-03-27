// Configuración de API para desarrollo local
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ENDPOINTS = {
  PRODUCTS: `${API_URL}/products`,
  AUTH: `${API_URL}/users`,
  CART: `${API_URL}/cart`,
  ORDERS: `${API_URL}/orders`,
  SUPPORT: `${API_URL}/support`,
  APPOINTMENTS: `${API_URL}/appointments`,
  LOCKER_ASSIGNMENTS: `${API_URL}/locker-assignments`,
  DEBUG: `${API_URL}/debug`,
  QR: `${API_URL}/qr`,
  HEALTH: `${API_URL}/health`,
};

// Header requerido para saltar la advertencia de ngrok en desarrollo
const isNgrok = API_URL.includes('ngrok-free.app');

const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (isNgrok) {
    init = init || {};
    init.headers = {
      'ngrok-skip-browser-warning': 'true',
      ...init.headers,
    };
  }
  return originalFetch(input, init);
};

export default API_URL;