export interface OrderItem {
  _id?: string; // ID del producto individual
  product: {
    _id: string;
    nombre: string;
    precio: number;
    imagen_url: string;
    descripcion?: string;
    dimensiones?: {
      largo: number;
      ancho: number;
      alto: number;
      peso: number;
    };
    volumen?: number;
    tieneDimensiones?: boolean;
  };
  dimensiones?: {
    largo: number;
    ancho: number;
    alto: number;
    peso: number;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  claimed_quantity?: number;
  assigned_locker?: number;
  remaining_quantity?: number;
  orderId?: string;
  orderCreatedAt?: string;
  isClaimed?: boolean;
  isReserved?: boolean;
  originalItemId?: string;
  individualIndex?: number;
  totalInOrder?: number;
  variants?: Record<string, string>; // <--- Añadido para variantes seleccionadas
}

export interface Order {
  _id: string;
  user: string | {
    _id: string;
    nombre: string;
    email: string;
  };
  items: OrderItem[];
  status: 'pending' | 'paid' | 'ready_for_pickup' | 'picked_up' | 'cancelled';
  payment: {
    mp_payment_id: string;
    status: string;
    method: string;
    amount: number;
    currency: string;
  };
  external_reference: string;
  total_amount: number;
  locker: {
    number: number;
    selected_at: string;
    picked_up_at?: string;
  };
  paid_at: string;
  createdAt: string;
  updatedAt: string;
} 