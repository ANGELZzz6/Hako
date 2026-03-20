export const createLocalDate = (dateString: string): Date => {
  console.log('🔍 createLocalDate llamado con:', dateString);
  
  try {
    // Si la fecha viene en formato ISO (con T y Z), extraer solo la parte de la fecha
    if (dateString.includes('T') && dateString.includes('Z')) {
      console.log('🔍 Fecha detectada como ISO UTC, extrayendo solo la fecha');
      
      // Extraer solo la parte de la fecha (YYYY-MM-DD)
      const dateOnly = dateString.split('T')[0];
      console.log('🔍 Fecha extraída:', dateOnly);
      
      const [year, month, day] = dateOnly.split('-');
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Validar que los valores sean válidos
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        console.error('❌ Valores de fecha inválidos:', { year: yearNum, month: monthNum, day: dayNum });
        throw new Error('Valores de fecha inválidos');
      }
      
      // SOLUCIÓN: Crear fecha en zona horaria de Colombia (UTC-5)
      // Usar Date.UTC y luego ajustar a Colombia
      const utcDate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
      console.log('🔍 Fecha UTC creada:', utcDate.toISOString());
      
      // Ajustar a zona horaria de Colombia (UTC-5)
      const colombiaOffset = -5 * 60; // -5 horas en minutos
      const colombiaDate = new Date(utcDate.getTime() + (colombiaOffset * 60 * 1000));
      
      console.log(`🔍 createLocalDate: ${dateString} -> ${colombiaDate.toISOString()} (${colombiaDate.toLocaleDateString()})`);
      console.log(`🔍 createLocalDate: año=${yearNum}, mes=${monthNum}, día=${dayNum}`);
      console.log(`🔍 createLocalDate: fecha creada=${colombiaDate.toString()}`);
      console.log(`🔍 Zona horaria forzada: Colombia (UTC-5)`);
      
      return colombiaDate;
    }
    
    // Si la fecha viene en formato "YYYY-MM-DD", crear una fecha local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Validar que los valores sean válidos
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        console.error('❌ Valores de fecha inválidos:', { year: yearNum, month: monthNum, day: dayNum });
        throw new Error('Valores de fecha inválidos');
      }
      
      // Crear la fecha usando el constructor que respeta la zona horaria local
      // NOTA: month - 1 porque los meses en JavaScript van de 0 a 11
      const date = new Date(yearNum, monthNum - 1, dayNum);
      
      // Verificar que la fecha sea válida
      if (isNaN(date.getTime())) {
        console.error('❌ Fecha inválida creada:', date);
        throw new Error('Fecha inválida creada');
      }
      
      console.log(`🔍 createLocalDate: ${dateString} -> ${date.toISOString()} (${date.toLocaleDateString()})`);
      console.log(`🔍 createLocalDate: año=${yearNum}, mes=${monthNum}, día=${dayNum}`);
      console.log(`🔍 createLocalDate: fecha creada=${date.toString()}`);
      
      return date;
    }
    
    // Si ya es una fecha completa, usarla tal como está
    const date = new Date(dateString);
    
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) {
      console.error('❌ Fecha inválida:', dateString);
      throw new Error('Fecha inválida');
    }
    
    console.log(`🔍 createLocalDate: ${dateString} -> ${date.toISOString()} (${date.toLocaleDateString()})`);
    return date;
  } catch (error) {
    console.error('❌ Error en createLocalDate:', error);
    // Retornar fecha actual como fallback
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
export const createColombiaDate = (dateString: string): Date => {
  console.log('🇨🇴 createColombiaDate llamado con:', dateString);
  
  try {
    // Si la fecha viene en formato ISO (con T y Z), extraer solo la parte de la fecha
    if (dateString.includes('T') && dateString.includes('Z')) {
      console.log('🇨🇴 Fecha detectada como ISO UTC, extrayendo solo la fecha');
      
      // Extraer solo la parte de la fecha (YYYY-MM-DD)
      const dateOnly = dateString.split('T')[0];
      console.log('🇨🇴 Fecha extraída:', dateOnly);
      
      const [year, month, day] = dateOnly.split('-');
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      // Crear fecha en zona horaria de Colombia (UTC-5)
      // Método más directo: crear fecha local y ajustar
      const localDate = new Date(yearNum, monthNum - 1, dayNum);
      
      // Ajustar a zona horaria de Colombia
      // Colombia está en UTC-5, pero JavaScript Date ya maneja la zona horaria local
      // Solo necesitamos asegurar que se interprete como fecha local
      const colombiaDate = new Date(localDate.getTime());
      
      console.log(`🇨🇴 createColombiaDate: ${dateString} -> ${colombiaDate.toISOString()} (${colombiaDate.toLocaleDateString()})`);
      console.log(`🇨🇴 Zona horaria: Colombia (UTC-5)`);
      
      return colombiaDate;
    }
    
    // Para otros formatos, usar la función normal
    return createLocalDate(dateString);
  } catch (error) {
    console.error('❌ Error en createColombiaDate:', error);
    return new Date();
  }
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
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
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
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    console.log(`🔍 isAppointmentExpired para reserva ${appointment._id}:`);
    console.log(`   Fecha: ${appointment.scheduledDate}`);
    console.log(`   Hora: ${appointment.timeSlot}`);
    console.log(`   DateTime completo: ${appointmentDateTime.toISOString()}`);
    console.log(`   DateTime local: ${appointmentDateTime.toLocaleString()}`);
    console.log(`   Hora actual: ${now.toISOString()}`);
    console.log(`   ¿Está vencida? ${appointmentDateTime < now}`);
    
    return appointmentDateTime < now;
  } catch (error) {
    console.error('❌ Error en isAppointmentExpired:', error);
    return false;
  }
};

export const canModifyAppointment = (appointment: any): boolean => {
  try {
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    return hoursDifference >= 1;
  } catch (error) {
    console.error('❌ Error en canModifyAppointment:', error);
    return false;
  }
};

export const canAddProductsToAppointment = (appointment: any): boolean => {
  try {
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const now = new Date();
    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    return hoursDifference >= 1;
  } catch (error) {
    console.error('❌ Error en canAddProductsToAppointment:', error);
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