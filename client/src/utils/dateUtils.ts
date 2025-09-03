import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';

// Configurar plugins de dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

// Configurar zona horaria de Colombia
const COLOMBIA_TIMEZONE = 'America/Bogota';

export class DateUtils {
  /**
   * Obtener la fecha actual en formato YYYY-MM-DD
   */
  static getCurrentDate(): string {
    return dayjs().tz(COLOMBIA_TIMEZONE).format('YYYY-MM-DD');
  }

  /**
   * Obtener la fecha y hora actual en formato ISO
   */
  static getCurrentDateTime(): string {
    return dayjs().tz(COLOMBIA_TIMEZONE).toISOString();
  }

  /**
   * Formatear fecha para mostrar al usuario
   */
  static formatDateForDisplay(dateString: string): string {
    return dayjs(dateString).tz(COLOMBIA_TIMEZONE).format('dddd, D [de] MMMM [de] YYYY');
  }

  /**
   * Formatear fecha y hora para mostrar al usuario
   */
  static formatDateTimeForDisplay(dateString: string, timeString: string): string {
    const dateTime = dayjs(`${dateString} ${timeString}`).tz(COLOMBIA_TIMEZONE);
    return dateTime.format('dddd, D [de] MMMM [de] YYYY [a las] HH:mm');
  }

  /**
   * Verificar si una fecha es hoy
   */
  static isToday(dateString: string): boolean {
    const today = dayjs().tz(COLOMBIA_TIMEZONE).format('YYYY-MM-DD');
    return dateString === today;
  }

  /**
   * Verificar si una fecha es en el futuro
   */
  static isFuture(dateString: string): boolean {
    const today = dayjs().tz(COLOMBIA_TIMEZONE).format('YYYY-MM-DD');
    return dayjs(dateString).isAfter(dayjs(today));
  }

  /**
   * Verificar si una fecha es en el pasado
   */
  static isPast(dateString: string): boolean {
    const today = dayjs().tz(COLOMBIA_TIMEZONE).format('YYYY-MM-DD');
    return dayjs(dateString).isBefore(dayjs(today));
  }

  /**
   * Verificar si una hora ya pasó hoy
   */
  static isTimePastToday(timeString: string): boolean {
    const now = dayjs().tz(COLOMBIA_TIMEZONE);
    const today = now.format('YYYY-MM-DD');
    const timeToday = dayjs(`${today} ${timeString}`).tz(COLOMBIA_TIMEZONE);
    
    return timeToday.isBefore(now);
  }

  /**
   * Obtener la próxima fecha disponible (mínimo mañana)
   */
  static getNextAvailableDate(): string {
    const tomorrow = dayjs().tz(COLOMBIA_TIMEZONE).add(1, 'day');
    return tomorrow.format('YYYY-MM-DD');
  }

  /**
   * Obtener la fecha máxima permitida (7 días en el futuro)
   */
  static getMaxAllowedDate(): string {
    const maxDate = dayjs().tz(COLOMBIA_TIMEZONE).add(7, 'days');
    return maxDate.format('YYYY-MM-DD');
  }

  /**
   * Filtrar horarios disponibles para hoy (eliminar horas pasadas)
   */
  static filterAvailableTimeSlotsForToday(timeSlots: string[]): string[] {
    if (!this.isToday(this.getCurrentDate())) {
      return timeSlots;
    }

    return timeSlots.filter(timeSlot => !this.isTimePastToday(timeSlot));
  }

  /**
   * Validar si una fecha está dentro del rango permitido
   */
  static isDateInAllowedRange(dateString: string): boolean {
    const today = dayjs().tz(COLOMBIA_TIMEZONE).format('YYYY-MM-DD');
    const maxDate = this.getMaxAllowedDate();
    
    return dayjs(dateString).isAfter(dayjs(today).subtract(1, 'day')) && 
           dayjs(dateString).isBefore(dayjs(maxDate).add(1, 'day'));
  }

  /**
   * Obtener días de la semana en español
   */
  static getWeekDays(): string[] {
    return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  }

  /**
   * Obtener meses en español
   */
  static getMonths(): string[] {
    return [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
  }

  /**
   * Convertir fecha de string a objeto dayjs
   */
  static parseDate(dateString: string): dayjs.Dayjs {
    return dayjs(dateString).tz(COLOMBIA_TIMEZONE);
  }

  /**
   * Convertir fecha y hora de strings a objeto dayjs
   */
  static parseDateTime(dateString: string, timeString: string): dayjs.Dayjs {
    return dayjs(`${dateString} ${timeString}`).tz(COLOMBIA_TIMEZONE);
  }

  /**
   * Obtener diferencia en días entre dos fechas
   */
  static getDaysDifference(date1: string, date2: string): number {
    return dayjs(date1).diff(dayjs(date2), 'day');
  }

  /**
   * Obtener diferencia en horas entre dos fechas/horas
   */
  static getHoursDifference(dateTime1: string, dateTime2: string): number {
    return dayjs(dateTime1).diff(dayjs(dateTime2), 'hour');
  }

  /**
   * Formatear fecha para input de tipo date
   */
  static formatForDateInput(dateString: string): string {
    return dayjs(dateString).format('YYYY-MM-DD');
  }

  /**
   * Formatear hora para input de tipo time
   */
  static formatForTimeInput(timeString: string): string {
    return dayjs(timeString, 'HH:mm').format('HH:mm');
  }

  /**
   * Validar formato de fecha YYYY-MM-DD
   */
  static isValidDateFormat(dateString: string): boolean {
    return dayjs(dateString, 'YYYY-MM-DD', true).isValid();
  }

  /**
   * Validar formato de hora HH:MM
   */
  static isValidTimeFormat(timeString: string): boolean {
    return dayjs(timeString, 'HH:mm', true).isValid();
  }

  /**
   * Obtener timestamp actual
   */
  static getCurrentTimestamp(): number {
    return dayjs().tz(COLOMBIA_TIMEZONE).valueOf();
  }

  /**
   * Formatear timestamp a fecha legible
   */
  static formatTimestamp(timestamp: number): string {
    return dayjs(timestamp).tz(COLOMBIA_TIMEZONE).format('DD/MM/YYYY HH:mm');
  }
}

export default DateUtils;
