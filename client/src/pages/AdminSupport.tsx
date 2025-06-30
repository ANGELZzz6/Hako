import React, { useState, useEffect } from 'react';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../contexts/AuthContext';
import supportService from '../services/supportService';

interface Ticket {
  _id: string;
  user: { nombre: string; email: string };
  subject: string;
  message: string;
  status: string;
  replies: { sender: string; message: string; createdAt: string }[];
  createdAt: string;
}

const AdminSupportPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('todos');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
    }
  }, [isAdmin]);

  const fetchTickets = async () => {
    try {
      const data = await supportService.getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setTickets([]);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'todos') return true;
    if (filter === 'abierto') return ticket.status === 'abierto';
    if (filter === 'en proceso') return ticket.status === 'en proceso';
    if (filter === 'cerrado') return ticket.status === 'cerrado';
    return true;
  });

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

  if (!isAdmin) {
    return <div className="container py-5 text-center">Acceso restringido solo para administradores.</div>;
  }

  return (
    <div className="support-management">
      {/* Barra superior */}
      <header className="user-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-life-preserver header-icon"></i>
            <span className="header-title">Soporte</span>
          </div>
          <div className="header-center">
            <h1 className="user-header">
              <span className="logo-japanese">箱</span>
              <span className="brand-text">hako</span>
              <span className="develop-text">Develop</span>
            </h1>
          </div>
          <div className="header-right">
            <a href="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </a>
          </div>
        </div>
      </header>
      <main className="support-main-content">
        <div className="container" style={{ maxWidth: 900 }}>
          <h2 className="mb-4 text-center">Gestión de solicitudes de soporte</h2>
          <div className="d-flex gap-2 mb-3">
            <select className="form-select w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="abierto">Abiertos</option>
              <option value="en proceso">En proceso</option>
              <option value="cerrado">Cerrados</option>
            </select>
            <button className="btn btn-outline-secondary" onClick={fetchTickets} disabled={statusLoading}>
              <i className="bi bi-arrow-clockwise"></i> Actualizar
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket._id} className={selectedTicket?._id === ticket._id ? 'table-active' : ''}>
                    <td>{ticket.user?.nombre}</td>
                    <td>{ticket.user?.email}</td>
                    <td>{ticket.subject}</td>
                    <td>
                      <span className={`badge bg-${ticket.status === 'abierto' ? 'success' : ticket.status === 'en proceso' ? 'warning' : 'secondary'}`}>{ticket.status}</span>
                    </td>
                    <td>{new Date(ticket.createdAt).toLocaleString('es-CO')}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setSelectedTicket(ticket)}>
                        <i className="bi bi-chat-dots"></i> Ver/Responder
                      </button>
                      <select className="form-select form-select-sm d-inline w-auto" style={{ minWidth: 110 }} value={ticket.status} onChange={e => handleChangeStatus(ticket._id, e.target.value)} disabled={statusLoading}>
                        <option value="abierto">Abierto</option>
                        <option value="en proceso">En proceso</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Panel de respuestas */}
          {selectedTicket && (
            <div className="card mt-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Conversación con {selectedTicket.user?.nombre}</span>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedTicket(null)}>
                  <i className="bi bi-x-lg"></i> Cerrar
                </button>
              </div>
              <div className="card-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <div><b>Asunto:</b> {selectedTicket.subject}</div>
                <div><b>Mensaje inicial:</b> {selectedTicket.message}</div>
                <hr />
                <div>
                  <b>Respuestas:</b>
                  <ul className="list-unstyled mt-2">
                    {selectedTicket.replies.length === 0 && <li className="text-muted">Sin respuestas aún.</li>}
                    {selectedTicket.replies.map((r, idx) => (
                      <li key={idx} className="mb-2">
                        <span className="fw-bold">{r.sender === currentUser?.id ? 'Tú (Admin)' : 'Usuario'}:</span> {r.message}
                        <br /><span className="text-muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleString('es-CO')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3">
                  <textarea className="form-control mb-2" rows={2} value={reply} onChange={e => setReply(e.target.value)} placeholder="Escribe una respuesta..." disabled={statusLoading} />
                  <button className="btn btn-primary btn-sm" onClick={handleReply} disabled={statusLoading || !reply.trim()}>
                    {statusLoading ? 'Enviando...' : 'Responder'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminSupportPage; 