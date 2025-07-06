// Servicio para pagos con Mercado Pago

export interface MPItem {
  id?: string; // ID del producto para poder eliminarlo del carrito después
  title: string;
  quantity: number;
  unit_price: number;
  picture_url?: string;
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

export interface MPPreferenceResponse {
  id: string;
  init_point: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
  status_detail: string;
  external_reference?: string;
  transaction_amount: number;
  payment_method: any;
  payer: any;
}

export interface PaymentData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  installments: number;
  transaction_amount: number;
  description: string;
  payer: MPPayer;
}

export interface PSEData {
  email: string;
  personType: 'natural' | 'juridica';
  identificationType: string;
  identificationNumber: string;
  financialInstitution: string;
  // Campos opcionales con valores por defecto
  zipCode?: string;
  streetName?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  federalUnit?: string;
  phoneAreaCode?: string;
  phoneNumber?: string;
}

export interface PaymentResult {
  id: string;
  status: string;
  status_detail: string;
  external_resource_url?: string;
}

const API_URL = '/api/payment';

const paymentService = {
  async createPreference(items: MPItem[], payer: MPPayer): Promise<MPPreferenceResponse> {
    const response = await fetch(`${API_URL}/create_preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, payer })
    });
    if (!response.ok) throw new Error('Error al crear preferencia de pago');
    return await response.json();
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await fetch(`${API_URL}/status/${paymentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error al consultar estado del pago');
    return await response.json();
  },

  async testPaymentStatus(status: string, statusDetail: string): Promise<PaymentStatus> {
    const response = await fetch(`${API_URL}/test-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, status_detail: statusDetail })
    });
    if (!response.ok) throw new Error('Error al probar estado del pago');
    return await response.json();
  },

  async payWithSavedCard(cardId: string, amount: number, payer: MPPayer): Promise<any> {
    const response = await fetch(`${API_URL}/pay_with_saved_card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, amount, payer })
    });
    if (!response.ok) throw new Error('Error al procesar el pago con tarjeta guardada');
    return await response.json();
  },

  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    const response = await fetch(`${API_URL}/process_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Si el servidor devuelve información específica del error de pago
      if (errorData.status && errorData.status_detail) {
        return {
          id: 'ERROR_' + Date.now(),
          status: errorData.status,
          status_detail: errorData.status_detail
        };
      }
      
      throw new Error(errorData.error || 'Error al procesar el pago');
    }
    
    return await response.json();
  },

  async testProcessPayment(paymentData: PaymentData): Promise<PaymentResult> {
    const response = await fetch(`${API_URL}/test-process-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error('Error al probar el procesamiento del pago');
    return await response.json();
  },

  async processPSEPayment(pseData: PSEData, items: MPItem[], payer: MPPayer): Promise<PaymentResult> {
    // Primero crear una preferencia PSE
    const preferenceResponse = await fetch(`${API_URL}/create_pse_preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: items.reduce((total, item) => total + (item.unit_price * item.quantity), 0),
        description: `Compra desde Hako Store - ${items.map(item => item.title).join(', ')}`,
        payerEmail: pseData.email,
        payerName: `${payer.name || ''} ${payer.surname || ''}`.trim() || 'Usuario'
      })
    });
    
    if (!preferenceResponse.ok) {
      const errorData = await preferenceResponse.json();
      
      // Si el servidor devuelve información específica del error
      if (errorData.status && errorData.status_detail) {
        return {
          id: 'ERROR_' + Date.now(),
          status: errorData.status,
          status_detail: errorData.status_detail
        };
      }
      
      throw new Error(errorData.message || 'Error al crear preferencia PSE');
    }
    
    const preference = await preferenceResponse.json();
    
    // Redirigir al usuario a la URL de pago de Mercado Pago
    if (preference.init_point) {
      window.location.href = preference.init_point;
      return {
        id: preference.preference_id,
        status: 'pending',
        status_detail: 'REDIRECTED'
      };
    }
    
    throw new Error('No se pudo obtener la URL de pago');
  }
};

export default paymentService; 