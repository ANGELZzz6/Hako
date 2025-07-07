import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import appointmentService, { type Appointment } from '../services/appointmentService';

const statusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
};

const statusColors: Record<string, string> = {
  scheduled: 'primary',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'warning',
};

const statusOptions = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No se presentó' },
];

const AdminAppointmentsPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    date: ''
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [appointmentsData, statsData] = await Promise.all([
          appointmentService.getAllAppointments(filters),
          appointmentService.getAppointmentStats()
        ]);
        
        setAppointments(appointmentsData);
        setStats(statsData);
      } catch (err: any) {
        setError('Error al cargar las citas');
        console.error('Error fetching appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchData();
    }
  }, [isAuthenticated, isAdmin, filters]);

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      setUpdatingId(appointmentId);
      const result = await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      
      setAppointments(appointments => 
        appointments.map(apt => 
          apt._id === appointmentId 
            ? { ...apt, status: newStatus }
            : apt
        )
      );
      
      alert(`Estado de cita actualizado a: ${statusLabels[newStatus]}`);
    } catch (err: any) {
      alert('Error al actualizar el estado de la cita: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reserva? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingId(appointmentId);
      await appointmentService.deleteAppointment(appointmentId);
      
      // Remover la cita de la lista
      setAppointments(appointments => 
        appointments.filter(apt => apt._id !== appointmentId)
      );
      
      // Recargar estadísticas
      const statsData = await appointmentService.getAppointmentStats();
      setStats(statsData);
      
      alert('Reserva eliminada exitosamente');
    } catch (err: any) {
      alert('Error al eliminar la reserva: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateTime = (date: string, timeSlot: string) => {
    const appointmentDate = new Date(date);
    const [hours, minutes] = timeSlot.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return appointmentDate.toLocaleString('es-CO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bi-calendar-check';
      case 'confirmed':
        return 'bi-check-circle';
      case 'completed':
        return 'bi-check2-all';
      case 'cancelled':
        return 'bi-x-circle';
      case 'no_show':
        return 'bi-exclamation-triangle';
      default:
        return 'bi-question-circle';
    }
  };

  const isPastAppointment = (date: string, timeSlot: string) => {
    const appointmentDate = new Date(date);
    const [hours, minutes] = timeSlot.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return appointmentDate < new Date();
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-calendar-event header-icon"></i>
            <span className="header-title">Reservas</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <a href="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </a>
          </div>
        </div>
      </header>
      
      <main className="admin-main-content">
        <div className="container">
          <h2 className="mb-4 text-center">Gestión de Reservas de Casilleros</h2>
          
          {/* Estadísticas */}
          {stats && (
            <div className="row mb-4">
              <div className="col-md-2">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-primary">{stats.total}</h5>
                    <p className="card-text small">Total</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-warning">{stats.today}</h5>
                    <p className="card-text small">Hoy</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-primary">{stats.byStatus.scheduled}</h5>
                    <p className="card-text small">Agendadas</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-info">{stats.byStatus.confirmed}</h5>
                    <p className="card-text small">Confirmadas</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-success">{stats.byStatus.completed}</h5>
                    <p className="card-text small">Completadas</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title text-danger">{stats.byStatus.cancelled}</h5>
                    <p className="card-text small">Canceladas</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label">Filtrar por Estado</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Todos los estados</option>
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Filtrar por Fecha</label>
              <input
                type="date"
                className="form-control"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center">{error}</div>
          ) : appointments.length === 0 ? (
            <div className="alert alert-info text-center">No hay citas que mostrar.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Fecha y Hora</th>
                    <th>Productos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(appointment => (
                    <tr key={appointment._id}>
                      <td>
                        <small className="text-muted">#{appointment._id.slice(-6)}</small>
                      </td>
                      <td>
                        <div>
                          <strong>{appointment.user.nombre}</strong><br />
                          <small className="text-muted">{appointment.user.email}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          {formatDateTime(appointment.scheduledDate, appointment.timeSlot)}
                          {isPastAppointment(appointment.scheduledDate, appointment.timeSlot) && 
                           appointment.status === 'scheduled' && (
                            <div className="badge bg-warning text-dark mt-1">Pasada</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="small">
                          {appointment.itemsToPickup.map((item, idx) => (
                            <div key={idx} className="d-flex align-items-center mb-1">
                              <img 
                                src={item.product.imagen_url} 
                                alt={item.product.nombre}
                                className="rounded me-2"
                                style={{ width: 24, height: 24, objectFit: 'cover' }}
                              />
                              <span className="text-truncate" style={{ maxWidth: '120px' }}>
                                {item.product.nombre}
                              </span>
                              <span className="badge bg-secondary ms-1">
                                {item.quantity} - C{item.lockerNumber}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={appointment.status}
                          onChange={e => handleStatusChange(appointment._id, e.target.value as Appointment['status'])}
                          disabled={updatingId === appointment._id}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <span className={`badge bg-${statusColors[appointment.status]} text-white mt-1 d-block`}>
                          <i className={`bi ${getStatusIcon(appointment.status)} me-1`}></i>
                          {statusLabels[appointment.status]}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group-vertical btn-group-sm">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                              // Aquí podrías abrir un modal con detalles completos
                              alert(`Detalles de la cita:\n\nUsuario: ${appointment.user.nombre}\nEmail: ${appointment.user.email}\nFecha: ${formatDateTime(appointment.scheduledDate, appointment.timeSlot)}\nEstado: ${statusLabels[appointment.status]}`);
                            }}
                            title="Ver detalles"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          {appointment.status !== 'completed' && (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteAppointment(appointment._id)}
                              disabled={deletingId === appointment._id}
                              title="Eliminar reserva"
                            >
                              {deletingId === appointment._id ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminAppointmentsPage; 