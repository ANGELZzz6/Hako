import React, { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import type { TimeSlot, CreateAppointmentData } from '../services/appointmentService';

interface AppointmentSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (appointmentData: CreateAppointmentData) => void;
  orderId: string;
  itemsToPickup: Array<{
    lockerIndex: number;
    quantity: number;
    products: { name: string; count: number }[];
    lockerNumber?: number;
  }>;
  loading?: boolean;
}

const LOCKER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  isOpen,
  onClose,
  onSchedule,
  orderId,
  itemsToPickup,
  loading = false
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Estado para lockers seleccionados por grupo
  const [selectedLockers, setSelectedLockers] = useState<number[]>(() => itemsToPickup.map((item, idx) => item.lockerNumber || (idx + 1)));

  useEffect(() => {
    // Reset lockers seleccionados si cambia la cantidad de lockers a reservar
    setSelectedLockers(itemsToPickup.map((item, idx) => item.lockerNumber || (idx + 1)));
  }, [itemsToPickup]);

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
  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadTimeSlots = async (date: string) => {
    try {
      setLoadingSlots(true);
      // Si el backend soporta intervalos de 1 hora, úsalo. Si no, usa getHourlyTimeSlots localmente.
      // const result = await appointmentService.getAvailableTimeSlots(date);
      // setTimeSlots(result.timeSlots);
      setTimeSlots(getHourlyTimeSlots());
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      alert('Error al cargar horarios disponibles');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleLockerChange = (idx: number, value: number) => {
    setSelectedLockers(prev => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTimeSlot) {
      alert('Por favor selecciona una fecha y hora');
      return;
    }
    // Validar que no haya lockers repetidos
    const uniqueLockers = new Set(selectedLockers);
    if (uniqueLockers.size !== selectedLockers.length) {
      alert('No puedes seleccionar el mismo casillero para más de un grupo.');
      return;
    }
    const appointmentData: CreateAppointmentData = {
      orderId,
      scheduledDate: selectedDate,
      timeSlot: selectedTimeSlot,
      itemsToPickup: itemsToPickup.map((item, idx) => ({
        product: '', // No se usa, pero requerido por el backend, puedes poner ''
        quantity: item.quantity,
        lockerNumber: selectedLockers[idx]
      }))
    };
    onSchedule(appointmentData);
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
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-calendar-check me-2"></i>
              Reservar Casillero
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="row">
              {/* Selección de Fecha */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  <i className="bi bi-calendar me-1"></i>
                  Seleccionar Fecha
                </label>
                <select
                  className="form-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecciona una fecha</option>
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
                  Seleccionar Hora
                </label>
                {selectedDate ? (
                  <div>
                    {loadingSlots ? (
                      <div className="text-center py-3">
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
                                selectedTimeSlot === slot.time
                                  ? 'btn-primary'
                                  : slot.available
                                  ? 'btn-outline-primary'
                                  : 'btn-outline-secondary disabled'
                              }`}
                              onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                              disabled={!slot.available || loading}
                            >
                              {formatTime(slot.time)}
                              {slot.available ? (
                                <small className="d-block text-success">
                                  {(slot.availableLockers ?? (12 - slot.occupiedLockers.length))} casillero{(slot.availableLockers ?? (12 - slot.occupiedLockers.length)) > 1 ? 's' : ''} disponible{(slot.availableLockers ?? (12 - slot.occupiedLockers.length)) > 1 ? 's' : ''}
                                </small>
                              ) : (
                                <small className="d-block text-muted">
                                  Sin casilleros disponibles
                                </small>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted">
                    Selecciona una fecha primero
                  </div>
                )}
              </div>
            </div>



            {/* Resumen de Productos y selección de casillero */}
            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-box-seam me-1"></i>
                Casilleros a Reservar y Productos
              </label>
              <div className="border rounded p-3 bg-light">
                {itemsToPickup.map((item, index) => (
                  <div key={index} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span><strong>Casillero necesario #{item.lockerIndex}</strong></span>
                      <select
                        className="form-select w-auto d-inline-block"
                        value={selectedLockers[index]}
                        onChange={e => handleLockerChange(index, Number(e.target.value))}
                        style={{ minWidth: 120 }}
                      >
                        {LOCKER_NUMBERS.map(num => (
                          <option key={num} value={num} disabled={selectedLockers.includes(num) && selectedLockers[index] !== num}>
                            Casillero {num}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ms-2 small text-muted">
                      {item.products.map((prod, i) => (
                        <span key={i} className="me-2">
                          {prod.count} × {prod.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              disabled={!selectedDate || !selectedTimeSlot || loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Agendando...
                </>
              ) : (
                <>
                  <i className="bi bi-calendar-check me-1"></i>
                  Agendar Cita
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