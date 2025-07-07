import { ENDPOINTS } from '../config/api';
import authService from './authService';
import { handle401 } from '../utils/handle401';

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
  handle401(response);
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
  handle401(response);
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
  handle401(response);
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
  handle401(response);
  return await response.json();
};

export const deleteTicket = async (id: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    let errorMessage = 'Error al eliminar ticket de soporte';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      const textError = await response.text();
      errorMessage = textError || errorMessage;
    }
    throw new Error(errorMessage);
  }
  handle401(response);
  return await response.json();
};

export const getAdmins = async () => {
  const response = await fetch(`${ENDPOINTS.AUTH}/admins`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Error al obtener admins');
  handle401(response);
  return await response.json();
};

export const addInternalNote = async (id: string, note: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}/internal-note`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ note }),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Error al agregar nota interna');
  handle401(response);
  return await response.json();
};

export const assignResponsable = async (id: string, responsable: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}/responsable`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ responsable }),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Error al asignar responsable');
  handle401(response);
  return await response.json();
};

export const closeByUser = async (id: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}/close-by-user`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Error al cerrar ticket');
  handle401(response);
  return await response.json();
};

export const rateTicket = async (id: string, stars: number, comment: string) => {
  const response = await fetch(`${ENDPOINTS.SUPPORT}/${id}/rating`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ stars, comment }),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Error al enviar valoración');
  handle401(response);
  return await response.json();
};

export default {
  createTicket,
  getTickets,
  replyTicket,
  changeStatus,
  deleteTicket,
  getAdmins,
  addInternalNote,
  assignResponsable,
  closeByUser,
  rateTicket,
}; 