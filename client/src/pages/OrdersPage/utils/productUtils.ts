import { LOCKER_MAX_VOLUME, LOCKER_MAX_SLOTS, SLOT_SIZE } from '../constants';

export const getDimensiones = (item: any) => {
  console.log('🔍 getDimensiones llamado con:', {
    itemId: item._id,
    hasDimensiones: !!item.dimensiones,
    dimensiones: item.dimensiones,
    hasVariants: !!item.variants,
    variants: item.variants,
    hasProduct: !!item.product,
    productVariants: item.product?.variants,
    productDimensiones: item.product?.dimensiones
  });

  // Si el item tiene dimensiones propias (ya calculadas en el backend), usarlas
  if (item.dimensiones) {
    console.log('✅ Usando dimensiones propias del item:', item.dimensiones);
    return item.dimensiones;
  }

  // Si el item tiene variantes seleccionadas y el producto tiene variantes, intentar calcular dimensiones de la variante
  if (item.variants && item.product?.variants?.enabled && item.product.variants.attributes) {
    console.log('🔍 Procesando variantes para dimensiones');

    // Buscar atributos que definen dimensiones
    const dimensionAttributes = item.product.variants.attributes.filter((a: any) => a.definesDimensions);
    console.log('📏 Atributos que definen dimensiones:', dimensionAttributes);

    // Si hay múltiples atributos que definen dimensiones, usar el primero que tenga dimensiones válidas
    for (const attr of dimensionAttributes) {
      const selectedValue = item.variants[attr.name];
      console.log(`🔍 Atributo ${attr.name}, valor seleccionado:`, selectedValue);

      if (selectedValue) {
        const option = attr.options.find((opt: any) => opt.value === selectedValue);
        console.log(`🔍 Opción encontrada para ${attr.name}:`, option);

        if (option && option.dimensiones &&
          option.dimensiones.largo &&
          option.dimensiones.ancho &&
          option.dimensiones.alto) {
          console.log('✅ Usando dimensiones de la variante:', option.dimensiones);
          return option.dimensiones;
        }
      }
    }
  }

  // Si no, usar dimensiones del producto base
  console.log('⚠️ Usando dimensiones del producto base:', item.product?.dimensiones);
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

  console.log('🔍 Buscando casilleros ocupados para fecha:', date, 'hora:', timeSlot);
  console.log('🔍 Reserva que se está editando:', appointmentId);

  // Obtener casilleros ocupados por el usuario en la fecha y hora seleccionada
  const occupiedLockers = new Set<number>();

  myAppointments.forEach(appointment => {
    // Excluir la reserva actual que se está editando
    if (appointment._id === appointmentId) {
      console.log('⏭️ Excluyendo reserva actual:', appointment._id);
      return;
    }

    // Solo considerar reservas activas para la misma fecha y hora
    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
      // Usar la función createLocalDate para comparar fechas correctamente
      const dateOnly = appointment.scheduledDate.includes('T')
        ? appointment.scheduledDate.split('T')[0]
        : appointment.scheduledDate;
      const appointmentDateLocal = dateOnly;

      console.log('🔍 Comparando reserva:', appointment._id);
      console.log('   Fecha original de la reserva:', appointment.scheduledDate);
      console.log('   Fecha de la reserva (local):', appointmentDateLocal);
      console.log('   Fecha mostrada de la reserva:', appointmentDateLocal);
      console.log('   Hora de la reserva:', appointment.timeSlot);
      console.log('   Fecha seleccionada:', date);
      console.log('   Hora seleccionada:', timeSlot);
      console.log('   ¿Coinciden fecha y hora?', appointmentDateLocal === date && appointment.timeSlot === timeSlot);

      if (appointmentDateLocal === date && appointment.timeSlot === timeSlot) {
        console.log('❌ Casillero ocupado por reserva:', appointment._id);
        // Agregar todos los casilleros usados en esta reserva
        appointment.itemsToPickup.forEach((item: any) => {
          occupiedLockers.add(item.lockerNumber);
          console.log('   Casillero ocupado:', item.lockerNumber);
        });
      }
    }
  });

  console.log('🔒 Casilleros ocupados encontrados:', Array.from(occupiedLockers));

  // Retornar solo los casilleros que no están ocupados
  const availableLockers = allLockers.filter(locker => !occupiedLockers.has(locker));
  console.log('✅ Casilleros disponibles:', availableLockers);

  return availableLockers;
}; 