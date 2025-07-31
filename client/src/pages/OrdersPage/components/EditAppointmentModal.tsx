import React from 'react';
import { getAvailableDates, getAvailableTimeSlotsForDate, createLocalDate } from '../utils/dateUtils';
import { getAvailableLockersForEdit } from '../utils/productUtils';

interface EditAppointmentModalProps {
  isOpen: boolean;
  appointment: any;
  editAppointmentDate: string;
  editAppointmentTime: string;
  editAppointmentLocker: number;
  penalizedDates: string[];
  myAppointments: any[];
  updatingAppointment: boolean;
  onClose: () => void;
  onUpdate: (appointmentId: string, data: any) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onLockerChange: (locker: number) => void;
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  isOpen,
  appointment,
  editAppointmentDate,
  editAppointmentTime,
  editAppointmentLocker,
  penalizedDates,
  myAppointments,
  updatingAppointment,
  onClose,
  onUpdate,
  onDateChange,
  onTimeChange,
  onLockerChange
}) => {
  if (!isOpen || !appointment) return null;

  const handleUpdate = () => {
    if (!editAppointmentDate || !editAppointmentTime) {
      alert('Por favor completa todos los campos');
      return;
    }
    
    // Validar que la fecha no sea más de 7 días adelante
    const selectedDate = createLocalDate(editAppointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);
    
    if (selectedDate > maxDate) {
      alert('No se pueden programar reservas con más de 7 días de anticipación');
      return;
    }
    
    // Si es el día actual, validar que la hora no haya pasado
    const now = new Date();
    const isToday = selectedDate.getTime() === today.getTime();
    
    if (isToday) {
      const [hours, minutes] = editAppointmentTime.split(':');
      const selectedTime = new Date();
      selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (selectedTime <= now) {
        alert('No se pueden agendar citas en horas que ya han pasado');
        return;
      }
    }
    
    onUpdate(appointment._id, {
      scheduledDate: editAppointmentDate,
      timeSlot: editAppointmentTime,
      lockerNumber: editAppointmentLocker
    });
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-pencil me-2"></i>
              Modificar Reserva #{appointment._id.slice(-6)}
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Fecha Actual:</strong>
                  </label>
                  <p className="form-control-plaintext">
                    {new Date(appointment.scheduledDate).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Hora Actual:</strong>
                  </label>
                  <p className="form-control-plaintext">
                    {appointment.timeSlot}
                  </p>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    <strong>Casillero Actual:</strong>
                  </label>
                  <p className="form-control-plaintext">
                    {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
                  </p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="newDate" className="form-label">
                    <strong>Nueva Fecha:</strong>
                  </label>
                  <select
                    className="form-select"
                    value={editAppointmentDate}
                    onChange={(e) => onDateChange(e.target.value)}
                  >
                    {getAvailableDates(penalizedDates).map(date => (
                      <option key={date.value} value={date.value} disabled={date.isPenalized}>
                        {date.label} {date.isToday && '(Hoy)'}{date.isPenalized && ' (Bloqueado)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="newTime" className="form-label">
                    <strong>Nueva Hora:</strong>
                  </label>
                  <select 
                    className="form-select" 
                    value={editAppointmentTime}
                    onChange={(e) => onTimeChange(e.target.value)}
                  >
                    {getAvailableTimeSlotsForDate(editAppointmentDate).map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="newLocker" className="form-label">
                    <strong>Nuevo Casillero:</strong>
                  </label>
                  <select 
                    className="form-select" 
                    value={editAppointmentLocker}
                    onChange={(e) => onLockerChange(parseInt(e.target.value))}
                  >
                    {getAvailableLockersForEdit(editAppointmentDate, editAppointmentTime, appointment._id, myAppointments).map((num: number) => (
                      <option key={num} value={num}>Casillero {num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Información:</strong> Solo se pueden modificar reservas con al menos 1 hora de anticipación. 
              Las reservas solo se pueden programar hasta 7 días adelante del día actual.
              Para el día actual, solo se pueden seleccionar horas futuras.
              Los cambios se aplicarán a todos los productos de esta reserva.
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpdate}
              disabled={updatingAppointment}
            >
              {updatingAppointment ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Actualizando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  Actualizar Reserva
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAppointmentModal; 