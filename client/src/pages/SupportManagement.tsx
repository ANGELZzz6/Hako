import React, { useState, useEffect, useRef } from 'react';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../contexts/AuthContext';
import supportService, { closeByUser, rateTicket } from '../services/supportService';

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
  const { currentUser, isAdmin } = useAuth();
  const [form, setForm] = useState({ asunto: '', mensaje: '' });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('todos');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Para adjuntos y valoración
  const [showTracking, setShowTracking] = useState(false);
  const [userTickets, setUserTickets] = useState<Ticket[]>([]);
  const [selectedUserTicket, setSelectedUserTicket] = useState<Ticket | null>(null);
  const [closingTicket, setClosingTicket] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const replyAttachmentInputRef = useRef<HTMLInputElement>(null);

  // Cargar tickets si es admin
  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
    }
  }, [isAdmin]);

  // useEffect para cargar tickets del usuario al montar (para cualquier usuario autenticado)
  useEffect(() => {
    if (currentUser) {
      fetchUserTickets();
    }
  }, [currentUser]);

  const fetchTickets = async () => {
    try {
      const data = await supportService.getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setTickets([]);
    }
  };

  const fetchUserTickets = async () => {
    try {
      const data = await supportService.getTickets();
      setUserTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setUserTickets([]);
    }
  };

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

  // Admin: filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'todos') return true;
    if (filter === 'abierto') return ticket.status === 'abierto';
    if (filter === 'en proceso') return ticket.status === 'en proceso';
    if (filter === 'cerrado') return ticket.status === 'cerrado';
    return true;
  });

  // Admin: responder ticket
  const handleReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    setStatusLoading(true);
    try {
      await supportService.replyTicket(selectedTicket._id, reply);
      setReply('');
      await fetchTickets();
      setSelectedTicket(null);
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setStatusLoading(false);
    }
  };

  // Admin: cambiar estado
  const handleChangeStatus = async (ticketId: string, status: string) => {
    setStatusLoading(true);
    try {
      await supportService.changeStatus(ticketId, status);
      await fetchTickets();
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setStatusLoading(false);
    }
  };

  // Contar tickets activos
  const activeTicketsCount = userTickets.filter(t => t.status !== 'cerrado' && t.status !== 'cerrado por usuario').length;

  const handleDeleteUserTicket = async (ticketId: string) => {
    setClosingTicket(true);
    try {
      await closeByUser(ticketId);
      await fetchUserTickets();
      setSelectedUserTicket(null);
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setClosingTicket(false);
    }
  };

  const handleSendRating = async (ticketId: string) => {
    setRatingLoading(true);
    try {
      await rateTicket(ticketId, rating, ratingComment);
      await fetchUserTickets();
      setSelectedUserTicket(null);
      setRating(0);
      setRatingComment('');
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSelectUserTicket = (ticket: Ticket) => {
    setSelectedUserTicket(ticket);
  };

  return (
    <div className="support-management">
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
    </div>
  );
};

export default SupportPage; 