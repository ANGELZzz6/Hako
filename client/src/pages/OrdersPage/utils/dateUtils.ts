export const createLocalDate = (dateString: string): Date => {
  // Si la fecha viene en formato "YYYY-MM-DD", crear una fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  // Si ya es una fecha completa, usarla tal como está
  return new Date(dateString);
};

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
    dates.push({
      value: dateStr,
      label: date.toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      isToday: i === 0,
      isPenalized
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
  const appointmentDateTime = createLocalDate(appointment.scheduledDate);
  const [hours, minutes] = appointment.timeSlot.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const now = new Date();
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
};

export const isAppointmentExpired = (appointment: any): boolean => {
  if (appointment.status === 'cancelled' || appointment.status === 'completed') return false;
  const appointmentDateTime = createLocalDate(appointment.scheduledDate);
  const [hours, minutes] = appointment.timeSlot.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return appointmentDateTime < new Date();
};

export const canModifyAppointment = (appointment: any): boolean => {
  const appointmentDateTime = createLocalDate(appointment.scheduledDate);
  const [hours, minutes] = appointment.timeSlot.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const now = new Date();
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursDifference = timeDifference / (1000 * 60 * 60);
  
  return hoursDifference >= 1;
};

export const canAddProductsToAppointment = (appointment: any): boolean => {
  const appointmentDateTime = createLocalDate(appointment.scheduledDate);
  const [hours, minutes] = appointment.timeSlot.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  const now = new Date();
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursDifference = timeDifference / (1000 * 60 * 60);
  return hoursDifference >= 1;
}; 