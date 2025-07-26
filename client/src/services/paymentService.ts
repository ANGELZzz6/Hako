// Servicio para pagos con Mercado Pago

import { handle401 } from '../utils/handle401';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Tipos para Checkout Pro
export interface MPItem {
  id?: string; // ID del producto para poder eliminarlo del carrito después
  title: string;
  unit_price: number;
  quantity?: number;
  variants?: Record<string, string>; // Variantes seleccionadas del producto
}

export interface MPPayer {
  email: string;
  name?: string;
  surname?: string;
  identification?: {
    type: string;
    number: string;
  };
}

export interface PreferenceResponse {
  success: boolean;
  preference_id: string;
  init_point: string;
  sandbox_init_point?: string;
  message: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  payment_method: any;
  payer: any;
}

const paymentService = {
  // Crear preferencia de pago (Checkout Pro)
  async createPreference(
    items: MPItem[], 
    payer: MPPayer, 
    externalReference?: string,
    userId?: string,
    selectedItems?: MPItem[]
  ): Promise<PreferenceResponse> {
    const response = await fetch(`${API_URL}/payment/create_preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        payer,
        external_reference: externalReference,
        user_id: userId,
        selected_items: selectedItems || items
      })
    });

    handle401(response);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear preferencia de pago');
    }

    return response.json();
  },

  // Obtener estado de un pago
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(`${API_URL}/payment/status/${paymentId}`);

    handle401(response);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al obtener estado del pago');
    }

    return response.json();
  },

  // Probar configuración
  async testConfig(): Promise<any> {
    const response = await fetch(`${API_URL}/payment/test-config`);

    handle401(response);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al probar configuración');
    }

    return response.json();
  },

  // Redirigir a Checkout Pro
  redirectToCheckout(initPoint: string): void {
    window.location.href = initPoint;
  }
};

export default paymentService; 