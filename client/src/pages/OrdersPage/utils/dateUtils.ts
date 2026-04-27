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
  try {
    const localDate = createColombiaDate(dateString);
    return localDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  } catch (error) {
    console.error('❌ Error en formatAppointmentDate:', error);
    return dateString;
  }
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



  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  if (isToday) {
    const filteredSlots = timeSlots.filter(time => {
      const [hours, minutes] = time.split(':');
      const slotHour = parseInt(hours);
      const slotMinute = parseInt(minutes);

      // Tarea 6: Buffer de 1 hora (60 minutos)
      const slotTotalMinutes = slotHour * 60 + slotMinute;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      return (slotTotalMinutes - currentTotalMinutes) >= 60;
    });

    return filteredSlots;
  }


  return timeSlots;
};

export const getTimeUntilAppointment = (appointment: any): string => {
  try {
    const dateOnly = appointment.scheduledDate.includes('T')
      ? appointment.scheduledDate.split('T')[0]
      : appointment.scheduledDate;
    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
    // Medellin/Bogota es UTC-5. Para obtener el objeto Date correcto:
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));

    const now = new Date();
    const timeDifference = appointmentDateTime.getTime() - now.getTime();

    if (timeDifference <= 0) {
      return 'En curso o expirada';
    }

    const totalMinutes = Math.floor(timeDifference / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      return `${days} día${days > 1 ? 's' : ''}${remainingHours > 0 ? `, ${remainingHours} hora${remainingHours > 1 ? 's' : ''}` : ''}`;
    } else if (totalHours > 0) {
      return `${totalHours}h ${remainingMinutes}m`;
    } else if (remainingMinutes > 0) {
      return `${remainingMinutes}m`;
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


    const expiredAppointments = appointments.filter(appointment => {
if (appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
        return false;
      }

      const isExpired = isAppointmentExpired(appointment);

      return isExpired;
    });

    return expiredAppointments.length > 0;

  } catch (error) {
    console.error('❌ Error en hasExpiredAppointments:', error);
    return false;
  }
}; 