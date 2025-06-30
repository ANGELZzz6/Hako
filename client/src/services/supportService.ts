import { ENDPOINTS } from '../config/api';
import authService from './authService';

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const createTicket = async (subject: string, message: string) => {
  const response = await fetch(ENDPOINTS.SUPPORT, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ subject, message }),
    credentials: 'include',
  });
  if (!response.ok) {
    let errorMessage = 'Error al crear ticket de soporte';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return await response.json();
};

export const getTickets = async () => {
  const response = await fetch(ENDPOINTS.SUPPORT, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    let errorMessage = 'Error al obtener tickets de soporte';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return await response.json();
};

export const replyTicket = async (id: string, message: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}/reply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
    credentials: 'include',
  });
  if (!response.ok) {
    let errorMessage = 'Error al responder ticket de soporte';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return await response.json();
};

export const changeStatus = async (id: string, status: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
    credentials: 'include',
  });
  if (!response.ok) {
    let errorMessage = 'Error al cambiar estado del ticket';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return await response.json();
};

export default {
  createTicket,
  getTickets,
  replyTicket,
  changeStatus,
}; 