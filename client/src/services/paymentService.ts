// Servicio para pagos con Mercado Pago

export interface MPItem {
  title: string;
  quantity: number;
  unit_price: number;
  picture_url?: string;
}

export interface MPPayer {
  email: string;
}

export interface MPPreferenceResponse {
  id: string;
  init_point: string;
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
  }
};

export default paymentService; 