import React, { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import type { TimeSlot, CreateAppointmentData, AppointmentItem } from '../services/appointmentService';
import type { Locker3D } from '../services/gridPackingService';

interface AppointmentSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (appointmentData: CreateAppointmentData[]) => void; // Cambiado a array
  orderId: string;
  itemsToPickup: Array<{
    lockerIndex: number;
    quantity: number;
    products: { name: string; count: number; productId?: string }[];
    lockerNumber?: number;
  }>;
  loading?: boolean;
  existingAppointment?: any; // Para agregar productos a una reserva existente
  onAddProducts?: (appointmentId: string, newProducts: any[]) => void; // Callback para agregar productos
  onlyNewLockers?: boolean; // Solo mostrar casilleros nuevos (para reserva inteligente)
  onlyExistingLockers?: boolean; // Solo hay casilleros existentes (no nuevos)
  existingLockersCount?: number; // Cantidad de casilleros existentes
}

// Nueva interfaz para manejar fecha/hora por casillero
interface LockerSchedule {
  lockerNumber: number;
  date: string;
  timeSlot: string;
  products: Array<{
    name: string;
    count: number;
    productId?: string;
  }>;
}

const LOCKER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  isOpen,
  onClose,
  onSchedule,
  orderId,
  itemsToPickup,
  loading = false,
  existingAppointment = null,
  onAddProducts = null,
  onlyNewLockers = false,
  onlyExistingLockers = false,
  existingLockersCount = 0
}) => {
  // Estado para manejar fecha/hora por casillero
  const [lockerSchedules, setLockerSchedules] = useState<LockerSchedule[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    console.log('🔍 AppointmentScheduler - itemsToPickup recibidos:', itemsToPickup);
    
    // Si es una reserva existente, cargar los datos
    if (existingAppointment) {
      console.log('📅 Cargando datos de reserva existente');
      // Mantener lógica existente para agregar productos
      setLockerSchedules([{
        lockerNumber: existingAppointment.itemsToPickup[0]?.lockerNumber || 1,
        date: existingAppointment.scheduledDate,
        timeSlot: existingAppointment.timeSlot,
        products: itemsToPickup.flatMap(item => item.products)
      }]);
    } else {
      console.log('🆕 Inicializando nueva reserva con múltiples casilleros');
      // Inicializar con fecha/hora por defecto para cada casillero
      const schedules: LockerSchedule[] = [];
      const uniqueLockers = new Set<number>();
      
      itemsToPickup.forEach((item, index) => {
        const lockerNumber = item.lockerNumber || 1;
        console.log(`📦 Procesando item ${index}: lockerNumber = ${lockerNumber}`);
        
        if (!uniqueLockers.has(lockerNumber)) {
          uniqueLockers.add(lockerNumber);
          console.log(`✅ Agregando nuevo casillero ${lockerNumber}`);
          
          // Fecha por defecto (mañana)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const productsForThisLocker = itemsToPickup
            .filter(i => (i.lockerNumber || 1) === lockerNumber)
            .flatMap(i => i.products);
          
          console.log(`📋 Productos para casillero ${lockerNumber}:`, productsForThisLocker);
          
          schedules.push({
            lockerNumber,
            date: tomorrow.toISOString().split('T')[0],
            timeSlot: '08:00',
            products: productsForThisLocker
          });
        } else {
          console.log(`⏭️ Casillero ${lockerNumber} ya procesado, saltando`);
        }
      });
      
      console.log('🎯 LockerSchedules finales:', schedules);
      setLockerSchedules(schedules);
    }
  }, [itemsToPickup, existingAppointment]);

  // Generar fechas disponibles (próximos 7 días)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Generar horarios de 1 hora (por ejemplo, 08:00, 09:00, ..., 19:00)
  const getHourlyTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 19; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: true,
        occupiedLockers: [],
        availableLockers: 12,
        totalLockers: 12
      });
    }
    return slots;
  };

  // Cargar horarios disponibles cuando se selecciona una fecha
  const loadTimeSlots = async (date: string) => {
    try {
      setLoadingSlots(true);
      setTimeSlots(getHourlyTimeSlots());
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      alert('Error al cargar horarios disponibles');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Actualizar fecha para un casillero específico
  const handleDateChange = (lockerNumber: number, date: string) => {
    setLockerSchedules(prev => 
      prev.map(schedule => 
        schedule.lockerNumber === lockerNumber 
          ? { ...schedule, date }
          : schedule
      )
    );
    
    // Cargar horarios para la nueva fecha
    loadTimeSlots(date);
  };

  // Actualizar hora para un casillero específico
  const handleTimeChange = (lockerNumber: number, timeSlot: string) => {
    setLockerSchedules(prev => 
      prev.map(schedule => 
        schedule.lockerNumber === lockerNumber 
          ? { ...schedule, timeSlot }
          : schedule
      )
    );
  };

  const handleSchedule = () => {
    console.log('🚀 handleSchedule iniciado');
    console.log('📊 lockerSchedules actuales:', lockerSchedules);
    
    // Validar que todos los casilleros tengan fecha y hora seleccionada
    const invalidSchedules = lockerSchedules.filter(
      schedule => !schedule.date || !schedule.timeSlot
    );
    
    if (invalidSchedules.length > 0) {
      console.log('❌ Schedules inválidos:', invalidSchedules);
      alert('Por favor selecciona fecha y hora para todos los casilleros');
      return;
    }

    // Si es una reserva existente, agregar productos
    if (existingAppointment && onAddProducts) {
      console.log('📅 Agregando productos a reserva existente');
      onAddProducts(existingAppointment._id, itemsToPickup);
      return;
    }

    console.log('🆕 Creando múltiples reservas nuevas');
    // Crear múltiples reservas, una por casillero
    const appointmentsData: CreateAppointmentData[] = [];
    
    lockerSchedules.forEach((schedule, index) => {
      console.log(`📦 Procesando schedule ${index} para casillero ${schedule.lockerNumber}`);
      
      // Crear itemsToPickup para este casillero
      const itemsToPickup: AppointmentItem[] = [];
      
      schedule.products.forEach(prod => {
        for (let i = 0; i < prod.count; i++) {
          itemsToPickup.push({
            product: prod.productId || '',
            quantity: 1,
            lockerNumber: schedule.lockerNumber
          });
        }
      });

      console.log(`✅ ItemsToPickup para casillero ${schedule.lockerNumber}:`, itemsToPickup);

      appointmentsData.push({
        orderId,
        scheduledDate: schedule.date,
        timeSlot: schedule.timeSlot,
        itemsToPickup
      });
    });

    // Debug: Ver qué datos se están enviando
    console.log('🔍 Datos que se envían al backend:', {
      totalAppointments: appointmentsData.length,
      appointments: appointmentsData.map(app => ({
        lockerNumber: app.itemsToPickup[0]?.lockerNumber,
        date: app.scheduledDate,
        time: app.timeSlot,
        products: app.itemsToPickup.length
      }))
    });

    console.log('📤 Llamando onSchedule con:', appointmentsData);
    onSchedule(appointmentsData);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-calendar-check me-2"></i>
              {existingAppointment ? 'Agregar Productos a Reserva' : 
               onlyExistingLockers ? 'Agregar Nuevos Productos' :
               onlyNewLockers ? 'Reservar Casilleros Nuevos' : 'Reservar Casillero'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {existingAppointment ? (
              // Lógica existente para agregar productos a una reserva
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="bi bi-calendar me-1"></i>
                    Fecha de Reserva
                  </label>
                  <div className="form-control-plaintext">
                    {new Date(existingAppointment.scheduledDate).toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="bi bi-clock me-1"></i>
                    Hora de Reserva
                  </label>
                  <div className="form-control-plaintext">
                    {formatTime(existingAppointment.timeSlot)}
                  </div>
                </div>
              </div>
            ) : (
              // Nueva lógica para reservas por casillero
              <div>
                <div className="alert alert-info mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>
                    {onlyExistingLockers ? 'Agregar Productos a Casilleros Existentes:' :
                     onlyNewLockers ? 'Reserva de Casilleros Nuevos:' : 'Reserva por Casillero:'}
                  </strong> 
                  {onlyExistingLockers 
                    ? ` Los productos nuevos se agregarán a los ${existingLockersCount} casillero(s) ya reservado(s). No necesitas crear nuevas reservas.`
                    : onlyNewLockers 
                    ? ' Los productos para casilleros existentes se han agregado automáticamente. Solo necesitas reservar los casilleros nuevos.'
                    : ' Cada casillero puede tener su propia fecha y hora de reserva.'
                  }
                </div>
                
                {lockerSchedules.map((schedule, index) => (
                  <div key={schedule.lockerNumber} className="card mb-3">
                    <div className={`card-header ${onlyExistingLockers ? 'bg-success' : 'bg-primary'} text-white`}>
                      <h6 className="mb-0">
                        <i className="bi bi-box me-2"></i>
                        Casillero {schedule.lockerNumber}
                        {onlyExistingLockers && <span className="badge bg-light text-dark ms-2">Existente</span>}
                      </h6>
                    </div>
                    <div className="card-body">
                      {!onlyExistingLockers && (
                        <div className="row">
                          {/* Selección de Fecha */}
                          <div className="col-md-6 mb-3">
                            <label className="form-label">
                              <i className="bi bi-calendar me-1"></i>
                              Fecha
                            </label>
                            <select
                              className="form-select"
                              value={schedule.date}
                              onChange={(e) => handleDateChange(schedule.lockerNumber, e.target.value)}
                              disabled={loading}
                            >
                              {getAvailableDates().map(date => (
                                <option key={date} value={date}>
                                  {new Date(date).toLocaleDateString('es-CO', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Selección de Hora */}
                          <div className="col-md-6 mb-3">
                            <label className="form-label">
                              <i className="bi bi-clock me-1"></i>
                              Hora
                            </label>
                            <div>
                              {loadingSlots ? (
                                <div className="text-center py-2">
                                  <div className="spinner-border spinner-border-sm me-2"></div>
                                  Cargando horarios...
                                </div>
                              ) : (
                                <div className="row g-2">
                                  {timeSlots.map((slot) => (
                                    <div key={slot.time} className="col-6">
                                      <button
                                        type="button"
                                        className={`btn w-100 ${
                                          schedule.timeSlot === slot.time
                                            ? 'btn-primary'
                                            : slot.available
                                            ? 'btn-outline-primary'
                                            : 'btn-outline-secondary disabled'
                                        }`}
                                        onClick={() => slot.available && handleTimeChange(schedule.lockerNumber, slot.time)}
                                        disabled={!slot.available || loading}
                                      >
                                        {formatTime(slot.time)}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Productos en este casillero */}
                      <div className="mt-3">
                        <label className="form-label">
                          <i className="bi bi-box-seam me-1"></i>
                          {onlyExistingLockers ? 'Productos a agregar:' : 'Productos en este casillero:'}
                        </label>
                        <div className="border rounded p-2 bg-light">
                          {schedule.products.map((prod, i) => (
                            <span key={i} className="badge bg-secondary me-1 mb-1">
                              {prod.count} × {prod.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSchedule}
              disabled={(!onlyExistingLockers && lockerSchedules.some(schedule => !schedule.date || !schedule.timeSlot)) || loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  {existingAppointment || onlyExistingLockers ? 'Agregando...' : 'Agendando...'}
                </>
              ) : (
                <>
                  <i className="bi bi-calendar-check me-1"></i>
                  {existingAppointment || onlyExistingLockers ? 'Agregar Productos' : 'Agendar Cita'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduler; 