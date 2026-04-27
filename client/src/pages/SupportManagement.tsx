import { useState, useEffect } from 'react';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import supportService, { closeByUser } from '../services/supportService';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';

interface Ticket {
  _id: string;
  user: { nombre: string; email: string };
  subject: string;
  message: string;
  status: string;
  replies: { sender: string; message: string; createdAt: string }[];
  createdAt: string;
  attachments?: string[];
  rating?: { stars: number; comment: string };
}

const SupportPage = () => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ asunto: '', mensaje: '' });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para adjuntos y valoración
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [closingTicket, setClosingTicket] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'primary' | 'danger' | 'warning' | 'success';
    type?: 'confirm' | 'alert';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
  });

  // Helper para mostrar confirmación asíncrona
  const showConfirm = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' = 'primary', confirmText: string = 'Confirmar'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        variant,
        confirmText,
        type: 'confirm',
        onConfirm: () => {
          setModalConfig((prev: any) => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig((prev: any) => ({ ...prev, show: false }));
          resolve(false);
        }
      });
    });
  };

  const fetchUserTickets = async () => {
    try {
      const data = await supportService.getTickets();
      setUserTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setUserTickets([]);
    }
  };

  // 2. Después los 3 useEffect:
  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchUserTickets();
    }
  }, [currentUser]);

  // Contar tickets activos
  const activeTicketsCount = userTickets.filter(t => t.status !== 'cerrado' && t.status !== 'cerrado por usuario').length;

  // 3. Return condicional:
  if (isLoading || !currentUser) {
    return <LoadingSpinner message="Verificando autenticación..." />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await supportService.createTicket(form.asunto, form.mensaje);
      setEnviado(true);
    } catch (err: any) {
      setError('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserTicket = async (ticketId: string) => {
    const confirmed = await showConfirm(
      'Eliminar solicitud',
      '¿Estás seguro de que quieres eliminar esta solicitud?',
      'danger',
      'Eliminar solicitud'
    );
    
    if (!confirmed) return;
    setClosingTicket(true);
    try {
      await closeByUser(ticketId);
      await fetchUserTickets();
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setClosingTicket(false);
    }
  };

  return (
    <div className="support-management" data-theme="light">
      <main className="support-main-content">
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 className="mb-4 text-center">¿Necesitas ayuda?</h2>
          <p className="mb-4 text-center">Completa el siguiente formulario y nuestro equipo de soporte te contactará lo antes posible.</p>
          {enviado ? (
            <div className="alert alert-success text-center">
              <i className="bi bi-check-circle me-2"></i>
              ¡Tu solicitud ha sido enviada! Pronto nos pondremos en contacto contigo.
            </div>
          ) : (
            <>
              {activeTicketsCount >= 3 && (
                <div className="alert alert-warning text-center mb-3">
                  Solo puedes tener 3 solicitudes activas a la vez. Cierra o elimina alguna para enviar una nueva.
                </div>
              )}
              <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow-sm mb-5">
                <div className="mb-3">
                  <label className="form-label">Nombre</label>
                  <input type="text" className="form-control" value={currentUser?.nombre || ''} readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label">Correo electrónico</label>
                  <input type="email" className="form-control" value={currentUser?.email || ''} readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label">Asunto</label>
                  <input type="text" className="form-control" name="asunto" value={form.asunto} onChange={handleChange} required disabled={loading} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mensaje</label>
                  <textarea className="form-control" name="mensaje" rows={4} value={form.mensaje} onChange={handleChange} required disabled={loading} />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <button
                  type="submit"
                  className="btn w-100"
                  style={{ backgroundColor: '#d32f2f', borderColor: '#d32f2f', color: '#fff' }}
                  disabled={loading || activeTicketsCount >= 3}
                >
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </form>
            </>
          )}
          <div className="mt-5 text-center">
            <h5>¿Prefieres contactarnos directamente?</h5>
            <p className="mb-1"><i className="bi bi-envelope me-2"></i>soporte@hako.com</p>
            <p className="mb-1"><i className="bi bi-telephone me-2"></i>(123) 456-7890</p>
            <p><i className="bi bi-geo-alt me-2"></i>Calle Principal #123, Ciudad</p>
          </div>
          {/* Mostrar la tabla de seguimiento para cualquier usuario autenticado */}
          <div className="mt-5">
            <h4>Seguimiento de tus solicitudes</h4>
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userTickets.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-muted">No tienes solicitudes registradas.</td></tr>
                  )}
                  {userTickets.map(ticket => (
                    <tr key={ticket._id}>
                      <td>{ticket.subject}</td>
                      <td>{ticket.status}</td>
                      <td>{new Date(ticket.createdAt).toLocaleString('es-CO')}</td>
                      <td>
                        {ticket.status !== 'cerrado' && ticket.status !== 'cerrado por usuario' && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUserTicket(ticket._id)} disabled={closingTicket}>
                            {closingTicket ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Detalle del ticket seleccionado si lo necesitas aquí */}
          </div>
        </div>
      </main>
      <ConfirmModal {...modalConfig} />
    </div>
  );
};

export default SupportPage; 