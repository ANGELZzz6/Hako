export const statusLabels: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado - Selecciona casillero',
  ready_for_pickup: 'Listo para recoger',
  picked_up: 'Recogido',
  cancelled: 'Cancelado',
};

export const statusColors: Record<string, string> = {
  pending: 'warning',
  paid: 'primary',
  ready_for_pickup: 'info',
  picked_up: 'success',
  cancelled: 'danger',
};

export const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm en cm³
export const LOCKER_MAX_SLOTS = 27; // 3x3x3 slots
export const SLOT_SIZE = 15; // cm - debe coincidir con gridPackingService 