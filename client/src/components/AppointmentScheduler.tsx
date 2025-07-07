import React, { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import type { TimeSlot, CreateAppointmentData } from '../services/appointmentService';

interface AppointmentSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (appointmentData: CreateAppointmentData) => void;
  orderId: string;
  itemsToPickup: Array<{
    product: string;
    quantity: number;
    lockerNumber: number;
  }>;
  loading?: boolean;
}

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

  // Cargar horarios disponibles cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadTimeSlots = async (date: string) => {
    try {
      setLoadingSlots(true);
      const result = await appointmentService.getAvailableTimeSlots(date);
      setTimeSlots(result.timeSlots);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      alert('Error al cargar horarios disponibles');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTimeSlot) {
      alert('Por favor selecciona una fecha y hora');
      return;
    }

    const appointmentData: CreateAppointmentData = {
      orderId,
      scheduledDate: selectedDate,
      timeSlot: selectedTimeSlot,
      itemsToPickup
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
                                  {slot.availableLockers} casillero{slot.availableLockers > 1 ? 's' : ''} disponible{slot.availableLockers > 1 ? 's' : ''}
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



            {/* Resumen de Productos */}
            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-box-seam me-1"></i>
                Productos a Recoger
              </label>
              <div className="border rounded p-3 bg-light">
                {itemsToPickup.map((item, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <span>Producto {index + 1}</span>
                    <span className="badge bg-primary">
                      {item.quantity} unidad{item.quantity > 1 ? 'es' : ''} - Casillero {item.lockerNumber}
                    </span>
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