import { useState, useEffect } from 'react';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import supportService, { closeByUser, rateTicket } from '../services/supportService';
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

// Componente de calificación con estrellas
const StarRating = ({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (stars: number) => void;
  readOnly?: boolean;
}) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="star-rating" aria-label={`Calificación: ${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${display >= star ? 'star-filled' : 'star-empty'}`}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          disabled={readOnly}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
        >
          <i className={`bi ${display >= star ? 'bi-star-fill' : 'bi-star'}`}></i>
        </button>
      ))}
    </div>
  );
};

const SupportPage = () => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ asunto: '', mensaje: '' });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [closingTicket, setClosingTicket] = useState(false);

  // Estado para rating en curso
  const [ratingState, setRatingState] = useState<{
    ticketId: string;
    stars: number;
    comment: string;
    submitting: boolean;
  } | null>(null);

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
    } catch {
      setUserTickets([]);
    }
  };

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

  const activeTicketsCount = userTickets.filter(t => t.status !== 'cerrado' && t.status !== 'cerrado por usuario').length;

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
    } catch {
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
    } catch {
      // error silenciado
    } finally {
      setClosingTicket(false);
    }
  };

  const handleOpenRating = (ticketId: string) => {
    setRatingState({ ticketId, stars: 0, comment: '', submitting: false });
  };

  const handleSubmitRating = async () => {
    if (!ratingState || ratingState.stars === 0) return;
    setRatingState(prev => prev ? { ...prev, submitting: true } : null);
    try {
      await rateTicket(ratingState.ticketId, ratingState.stars, ratingState.comment);
      await fetchUserTickets();
      setRatingState(null);
    } catch {
      setRatingState(prev => prev ? { ...prev, submitting: false } : null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'abierto': return { label: 'Abierto', cls: 'badge-status-abierto' };
      case 'en proceso': return { label: 'En proceso', cls: 'badge-status-proceso' };
      case 'solucionado': return { label: '✓ Solucionado', cls: 'badge-status-solucionado' };
      case 'cerrado': return { label: 'Cerrado', cls: 'badge-status-cerrado' };
      case 'cerrado por usuario': return { label: 'Cerrado por ti', cls: 'badge-status-cerrado' };
      default: return { label: status, cls: 'badge-status-default' };
    }
  };

  return (
    <div className="support-management">
      <main className="support-main-content">
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 className="mb-4 text-center support-page-title">¿Necesitas ayuda?</h2>
          <p className="mb-4 text-center support-page-subtitle">Completa el siguiente formulario y nuestro equipo de soporte te contactará lo antes posible.</p>
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
              <form onSubmit={handleSubmit} className="support-form p-4 rounded shadow-sm mb-5">
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
                  className="btn btn-support-submit w-100"
                  disabled={loading || activeTicketsCount >= 3}
                >
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </form>
            </>
          )}

          {/* Contacto directo */}
          <div className="mt-5 text-center support-contact-block">
            <h5>¿Prefieres contactarnos directamente?</h5>
            <p className="mb-1"><i className="bi bi-envelope me-2"></i>soporte@hako.com</p>
            <p className="mb-1"><i className="bi bi-telephone me-2"></i>(123) 456-7890</p>
            <p><i className="bi bi-geo-alt me-2"></i>Calle Principal #123, Ciudad</p>
          </div>

          {/* Mis solicitudes */}
          <div className="mt-5">
            <h4 className="support-section-title">Seguimiento de tus solicitudes</h4>
            {userTickets.length === 0 ? (
              <p className="text-center support-empty-text">No tienes solicitudes registradas.</p>
            ) : (
              <div className="support-tickets-list">
                {userTickets.map(ticket => {
                  const { label, cls } = getStatusLabel(ticket.status);
                  const isSolucionado = ticket.status?.toLowerCase() === 'solucionado';
                  const yaCalificado = !!ticket.rating?.stars;
                  const editandoRating = ratingState?.ticketId === ticket._id;

                  return (
                    <div key={ticket._id} className="support-ticket-card">
                      {/* Cabecera del ticket */}
                      <div className="ticket-card-header">
                        <div className="ticket-subject">{ticket.subject}</div>
                        <span className={`ticket-status-badge ${cls}`}>{label}</span>
                      </div>
                      {/* Meta */}
                      <div className="ticket-meta">
                        <small>{new Date(ticket.createdAt).toLocaleString('es-CO')}</small>
                      </div>

                      {/* Acciones */}
                      <div className="ticket-actions">
                        {ticket.status !== 'cerrado' && ticket.status !== 'cerrado por usuario' && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUserTicket(ticket._id)}
                            disabled={closingTicket}
                          >
                            {closingTicket ? 'Eliminando...' : (
                              <><i className="bi bi-trash me-1"></i>Eliminar</>
                            )}
                          </button>
                        )}
                      </div>

                      {/* ── Sección de calificación: SOLO cuando status = 'solucionado' ── */}
                      {isSolucionado && (
                        <div className="ticket-rating-section">
                          {yaCalificado ? (
                            // Rating ya enviado → solo lectura
                            <div className="rating-readonly">
                              <p className="rating-label">Tu calificación:</p>
                              <StarRating value={ticket.rating!.stars} readOnly />
                              {ticket.rating?.comment && (
                                <p className="rating-comment-display">"{ticket.rating.comment}"</p>
                              )}
                            </div>
                          ) : editandoRating ? (
                            // Formulario de calificación abierto
                            <div className="rating-form">
                              <p className="rating-label">¿Cómo fue la atención recibida?</p>
                              <StarRating
                                value={ratingState.stars}
                                onChange={(s) => setRatingState(prev => prev ? { ...prev, stars: s } : null)}
                              />
                              <textarea
                                className="form-control rating-comment-input mt-2"
                                placeholder="Comentario opcional..."
                                value={ratingState.comment}
                                rows={2}
                                onChange={e => setRatingState(prev => prev ? { ...prev, comment: e.target.value } : null)}
                                disabled={ratingState.submitting}
                              />
                              <div className="rating-form-actions mt-2">
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setRatingState(null)}
                                  disabled={ratingState.submitting}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="btn btn-sm btn-rating-submit"
                                  onClick={handleSubmitRating}
                                  disabled={ratingState.stars === 0 || ratingState.submitting}
                                >
                                  {ratingState.submitting ? (
                                    <><span className="spinner-border spinner-border-sm me-1"></span>Enviando...</>
                                  ) : (
                                    <><i className="bi bi-send me-1"></i>Enviar calificación</>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Botón para abrir el formulario
                            <button
                              className="btn btn-sm btn-rating-open"
                              onClick={() => handleOpenRating(ticket._id)}
                            >
                              <i className="bi bi-star me-1"></i>
                              Calificar atención
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <ConfirmModal {...modalConfig} bottomSheet />
    </div>
  );
};

export default SupportPage;