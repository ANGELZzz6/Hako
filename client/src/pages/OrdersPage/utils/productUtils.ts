import { LOCKER_MAX_VOLUME, SLOT_SIZE } from '../constants';

export const getDimensiones = (item: any) => {


  // Si el item tiene dimensiones propias (ya calculadas en el backend), usarlas
  if (item.dimensiones) {
    return item.dimensiones;
  }

  // Si el item tiene variantes seleccionadas y el producto tiene variantes, intentar calcular dimensiones de la variante
  if (item.variants && item.product?.variants?.enabled && item.product.variants.attributes) {


    const dimensionAttributes = item.product.variants.attributes.filter((a: any) => a.definesDimensions);

    // Si hay múltiples atributos que definen dimensiones, usar el primero que tenga dimensiones válidas
    for (const attr of dimensionAttributes) {
      const selectedValue = item.variants[attr.name];

      if (selectedValue) {
        const option = attr.options.find((opt: any) => opt.value === selectedValue);

        if (option && option.dimensiones &&
          option.dimensiones.largo &&
          option.dimensiones.ancho &&
          option.dimensiones.alto) {
          return option.dimensiones;
        }
      }
    }
  }

  return item.product?.dimensiones;
};

export const tieneDimensiones = (item: any) => {
  const d = getDimensiones(item);
  return d && d.largo && d.ancho && d.alto;
};

export const getVolumen = (item: any) => {
  const d = getDimensiones(item);
  return d && d.largo && d.ancho && d.alto ? d.largo * d.ancho * d.alto : 0;
};

export const calculateSlotsNeeded = (dimensions: { largo: number; ancho: number; alto: number }) => {
  const slotsX = Math.max(1, Math.ceil(dimensions.largo / SLOT_SIZE));
  const slotsY = Math.max(1, Math.ceil(dimensions.ancho / SLOT_SIZE));
  const slotsZ = Math.max(1, Math.ceil(dimensions.alto / SLOT_SIZE));
  return slotsX * slotsY * slotsZ;
};

export const calculateLockerVolume = (lockerNumber: number, lockerAssignments: Map<number, any>) => {
  const assignment = lockerAssignments.get(lockerNumber);
  return assignment ? assignment.totalVolume : 0;
};

export const hasLockerSpace = (lockerNumber: number, additionalVolume: number, lockerAssignments: Map<number, any>) => {
  const currentVolume = calculateLockerVolume(lockerNumber, lockerAssignments);
  return (currentVolume + additionalVolume) <= LOCKER_MAX_VOLUME;
};

export const getLockerUsagePercentage = (lockerNumber: number, lockerAssignments: Map<number, any>) => {
  const currentVolume = calculateLockerVolume(lockerNumber, lockerAssignments);
  return Math.round((currentVolume / LOCKER_MAX_VOLUME) * 100);
};

export const getAvailableLockersForEdit = (
  date: string,
  timeSlot: string,
  appointmentId: string,
  myAppointments: any[]
) => {
  const allLockers = Array.from({ length: 12 }, (_, i) => i + 1);

  // Si no hay fecha o hora seleccionada, mostrar todos los casilleros
  if (!date || !timeSlot) {
    return allLockers;
  }

  // Obtener casilleros ocupados por el usuario en la fecha y hora seleccionada
  const occupiedLockers = new Set<number>();

  myAppointments.forEach(appointment => {
    // Excluir la reserva actual que se está editando
    if (appointment._id === appointmentId) {
      return;
    }

    // Solo considerar reservas activas para la misma fecha y hora
    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
      // Usar la función createLocalDate para comparar fechas correctamente
      const dateOnly = appointment.scheduledDate.includes('T')
        ? appointment.scheduledDate.split('T')[0]
        : appointment.scheduledDate;
      const appointmentDateLocal = dateOnly;

      if (appointmentDateLocal === date && appointment.timeSlot === timeSlot) {
        // Agregar todos los casilleros usados en esta reserva
        appointment.itemsToPickup.forEach((item: any) => {
          occupiedLockers.add(item.lockerNumber);
        });
      }
    }
  });

  // Retornar solo los casilleros que no están ocupados
  const availableLockers = allLockers.filter(locker => !occupiedLockers.has(locker));

  return availableLockers;
}; 