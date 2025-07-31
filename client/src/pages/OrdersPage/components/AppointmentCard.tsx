import React from 'react';
import { getTimeUntilAppointment, canModifyAppointment, isAppointmentExpired } from '../utils/dateUtils';

interface AppointmentCardProps {
  appointment: any;
  onEdit: (appointment: any) => void;
  onCancel: (appointmentId: string) => void;
  cancellingAppointment: boolean;
  updatingAppointment: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  onCancel,
  cancellingAppointment,
  updatingAppointment
}) => {
  return (
    <div key={appointment._id} className="col-12 mb-3">
      <div className="card border-success">
        <div className="card-header bg-success text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-calendar-event me-2"></i>
              Reserva #{appointment._id.slice(-6)}
            </h6>
            <span className={`badge ${appointment.status === 'confirmed' ? 'bg-light text-dark' : 'bg-warning'}`}>
              {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <p className="mb-1">
                <strong>Fecha:</strong><br />
                {new Date(appointment.scheduledDate).toLocaleDateString('es-CO')}
              </p>
              <p className="mb-1">
                <strong>Hora:</strong><br />
                {appointment.timeSlot}
              </p>
            </div>
            <div className="col-md-3">
              <p className="mb-1">
                <strong>Casilleros:</strong><br />
                {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
              </p>
              <p className="mb-1">
                <strong>Productos:</strong><br />
                {appointment.itemsToPickup.length} producto{appointment.itemsToPickup.length > 1 ? 's' : ''}
              </p>
              <p className="mb-1">
                <strong>Tiempo restante:</strong><br />
                <span className={canModifyAppointment(appointment) ? 'text-success' : 'text-danger'}>
                  {getTimeUntilAppointment(appointment)}
                </span>
              </p>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-end gap-2">
                {isAppointmentExpired(appointment) ? (
                  <button
                    className="btn btn-outline-warning btn-sm"
                    onClick={() => {
                      onEdit(appointment);
                      setTimeout(() => {
                        alert('Debes reclamar tus productos, si no lo haces no podrás reservar para el día de hoy.');
                      }, 300);
                    }}
                  >
                    <i className="bi bi-arrow-repeat me-1"></i>
                    Volver a reservar
                  </button>
                ) : canModifyAppointment(appointment) ? (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => onEdit(appointment)}
                    disabled={updatingAppointment}
                  >
                    <i className="bi bi-pencil me-1"></i>
                    Modificar Reserva
                  </button>
                ) : (
                  <small className="text-muted d-flex align-items-center">
                    <i className="bi bi-clock me-1"></i>
                    No modificable (menos de 1h)
                  </small>
                )}
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onCancel(appointment._id)}
                  disabled={cancellingAppointment}
                >
                  {cancellingAppointment ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle me-1"></i>
                      Cancelar Reserva
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard; 