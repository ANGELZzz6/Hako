// Interpreta cualquier fecha como Colombia (UTC-5)
// Soporta: "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.sssZ"
export const createLocalDate = (dateString: string): Date => {
  try {
    // Extraer parte de fecha YYYY-MM-DD
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return new Date(dateString);
    }

    const [year, month, day] = dateOnly.split('-').map(Number);
    // Medianoche Colombia = 05:00 UTC
    return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
  } catch {
    return new Date();
  }
};

// Función para formatear fechas de manera consistente
export const formatAppointmentDate = (dateString: string): string => {
  console.log('🔍 formatAppointmentDate debug:', {
    input: dateString,
    type: typeof dateString,
    isISO: dateString.includes('T') && dateString.includes('Z'),
    isDateOnly: /^\d{4}-\d{2}-\d{2}$/.test(dateString)
  });

  try {
    // Usar la función específica para Colombia
    const localDate = createColombiaDate(dateString);

    console.log('🔍 formatAppointmentDate debug:', {
      input: dateString,
      localDate: localDate.toISOString(),
      localDateLocal: localDate.toLocaleDateString(),
      localDateLocalTime: localDate.toLocaleString(),
      formatted: localDate.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })
    });

    return localDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  } catch (error) {
    console.error('❌ Error en formatAppointmentDate:', error);
    // Retornar la fecha original como fallback
    return dateString;
  }
};

// Función de prueba para entender el problema de fechas
export const debugDateIssue = (dateString: string, timeSlot: string) => {
  console.log('🧪 DEBUG: Analizando problema de fecha');
  console.log('🧪 Fecha del backend:', dateString);
  console.log('🧪 Hora del slot:', timeSlot);

  // Crear fecha local usando la función de Colombia
  const localDate = createColombiaDate(dateString);
  console.log('🧪 Fecha local creada (Colombia):', localDate.toLocaleDateString());

  // Crear fecha con hora
  const [hours, minutes] = timeSlot.split(':');
  const appointmentDateTime = new Date(localDate);
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  console.log('🧪 Fecha + hora:', appointmentDateTime.toLocaleString());
  console.log('🧪 Fecha + hora ISO:', appointmentDateTime.toISOString());

  // Comparar con fecha actual
  const now = new Date();
  console.log('🧪 Fecha actual:', now.toLocaleDateString());
  console.log('🧪 Hora actual:', now.toLocaleTimeString());

  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
  const minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

  console.log('🧪 Diferencia de tiempo:', `${hoursDifference}h ${minutesDifference}m`);

  return {
    localDate: localDate.toLocaleDateString(),
    appointmentDateTime: appointmentDateTime.toLocaleString(),
    timeDifference: `${hoursDifference}h ${minutesDifference}m`
  };
};

// Función específica para crear fechas en zona horaria de Colombia
export const createColombiaDate = createLocalDate;

export const getAvailableDates = (penalizedDates: string[] = []) => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const isPenalized = penalizedDates.includes(dateStr);

    // MEJORADA: Información más detallada sobre penalizaciones
    let penaltyInfo = null;
    if (isPenalized) {
      penaltyInfo = {
        reason: 'Reserva vencida',
        message: 'No puedes reservar para esta fecha debido a una reserva vencida anterior',
        expiresIn: '24 horas desde la penalización'
      };
    }

    dates.push({
      value: dateStr,
      label: date.toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      isToday: i === 0,
      isPenalized,
      penaltyInfo
    });
  }

  return dates;
};

export const getAvailableTimeSlotsForDate = (date: string) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Verificar si es hoy comparando con la primera fecha disponible
  const availableDates = getAvailableDates();
  const isToday = date === availableDates[0].value;

  console.log('🕐 Verificando horarios para fecha:', date);
  console.log('🕐 Fecha actual:', availableDates[0].value);
  console.log('🕐 Hora actual:', `${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
  console.log('🕐 ¿Es hoy?:', isToday);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  if (isToday) {
    const filteredSlots = timeSlots.filter(time => {
      const [hours, minutes] = time.split(':');
      const slotHour = parseInt(hours);
      const slotMinute = parseInt(minutes);

      const isFuture = slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);

      console.log(`🕐 ${time}: hora=${slotHour}, minuto=${slotMinute}, ¿es futuro?=${isFuture}`);

      return isFuture;
    });

    console.log('🕐 Horarios filtrados para hoy:', filteredSlots);
    return filteredSlots;
  }

  console.log('🕐 No es hoy, retornando todos los horarios:', timeSlots);
  return timeSlots;
};

export const getTimeUntilAppointment = (appointment: any): string => {
  try {
    const dateOnly = appointment.scheduledDate.includes('T')
      ? appointment.scheduledDate.split('T')[0]
      : appointment.scheduledDate;
    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));

    const now = new Date();

    console.log('🔍 getTimeUntilAppointment debug:', {
      originalDate: appointment.scheduledDate,
      timeSlot: appointment.timeSlot,
      appointmentDateTime: appointmentDateTime.toISOString(),
      appointmentDateTimeLocal: appointmentDateTime.toLocaleString(),
      now: now.toISOString(),
      nowLocal: now.toLocaleString(),
      timeDifference: appointmentDateTime.getTime() - now.getTime()
    });

    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
    const minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursDifference > 0) {
      return `${hoursDifference}h ${minutesDifference}m`;
    } else if (minutesDifference > 0) {
      return `${minutesDifference}m`;
    } else {
      return 'Menos de 1 minuto';
    }
  } catch (error) {
    console.error('❌ Error en getTimeUntilAppointment:', error);
    return 'Error al calcular tiempo';
  }
};

export const isAppointmentExpired = (appointment: any): boolean => {
  try {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') return false;

    const now = new Date();
    // Obtener fecha base en Colombia (medianoche = 05:00 UTC)
    const dateOnly = appointment.scheduledDate.includes('T')
      ? appointment.scheduledDate.split('T')[0]
      : appointment.scheduledDate;
    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
    // Convertir hora Colombia a UTC: hora Colombia + 5 = hora UTC
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));

    return appointmentDateTime < now;
  } catch {
    return false;
  }
};

export const canModifyAppointment = (appointment: any): boolean => {
  try {
    const dateOnly = appointment.scheduledDate.includes('T')
      ? appointment.scheduledDate.split('T')[0]
      : appointment.scheduledDate;
    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));
    const now = new Date();
    return (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60) >= 1;
  } catch {
    return false;
  }
};

export const canAddProductsToAppointment = (appointment: any): boolean => {
  try {
    const dateOnly = appointment.scheduledDate.includes('T')
      ? appointment.scheduledDate.split('T')[0]
      : appointment.scheduledDate;
    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));
    const now = new Date();
    return (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60) >= 1;
  } catch {
    return false;
  }
};

// Función para verificar si hay reservas vencidas en una lista
export const hasExpiredAppointments = (appointments: any[]): boolean => {
  try {
    console.log('🔍 Verificando reservas vencidas en lista de', appointments.length, 'reservas');

    const now = new Date();
    console.log('⏰ Hora actual:', now.toISOString(), now.toLocaleString());

    const expiredAppointments = appointments.filter(appointment => {
      if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
        console.log(`📅 Reserva ${appointment._id}: Status ${appointment.status} - No verificando`);
        return false;
      }

      const isExpired = isAppointmentExpired(appointment);
      console.log(`📅 Reserva ${appointment._id}: ${appointment.scheduledDate} ${appointment.timeSlot} - ¿Vencida? ${isExpired}`);

      return isExpired;
    });

    console.log(`🔍 Encontradas ${expiredAppointments.length} reservas vencidas de ${appointments.length} total`);
    return expiredAppointments.length > 0;

  } catch (error) {
    console.error('❌ Error en hasExpiredAppointments:', error);
    return false;
  }
}; 