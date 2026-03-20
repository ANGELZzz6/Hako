// Configuración de API para desarrollo local
const API_URL = 'http://localhost:5000/api';

export const ENDPOINTS = {
  PRODUCTS: `${API_URL}/products`,
  AUTH: `${API_URL}/users`,
  CART: `${API_URL}/cart`,
  ORDERS: `${API_URL}/orders`,
  SUPPORT: `${API_URL}/support`,
  APPOINTMENTS: `${API_URL}/appointments`,
  DEBUG: `${API_URL}/debug`,
  QR: `${API_URL}/qr`,
};

export default API_URL; 