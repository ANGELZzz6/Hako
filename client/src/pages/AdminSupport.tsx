import React, { useState, useEffect } from 'react';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '../contexts/AuthContext';
import supportService, { deleteTicket, getAdmins, addInternalNote, assignResponsable } from '../services/supportService';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
// @ts-ignore
import { saveAs } from 'file-saver'; // Recuerda instalarlo: npm install file-saver
import productService from '../services/productService';

interface Ticket {
  _id: string;
  user: { nombre: string; email: string };
  subject: string;
  message: string;
  status: string;
  replies: { sender: string; message: string; createdAt: string }[];
  createdAt: string;
  internalNotes?: { admin: string; note: string; createdAt: string }[];
  responsable?: string;
}

interface Admin {
  _id: string;
  nombre: string;
  email: string;
}

const AdminSupportPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('todos');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [responsableFilter, setResponsableFilter] = useState('todos');
  const [internalNote, setInternalNote] = useState('');
  const [internalNoteLoading, setInternalNoteLoading] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
      getAdmins().then(setAdmins).catch(() => setAdmins([]));
    }
    productService.getAllSuggestions().then(setSugerencias).catch(() => setSugerencias([]));
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
    // Filtro por estado
    if (filter !== 'todos' && ticket.status !== filter) return false;
    // Filtro por responsable
    if (responsableFilter !== 'todos' && ticket.responsable !== responsableFilter) return false;
    // Filtro por búsqueda
    const searchLower = search.toLowerCase();
    if (searchLower) {
      const userName = ticket.user?.nombre?.toLowerCase() || '';
      const userEmail = ticket.user?.email?.toLowerCase() || '';
      const subject = ticket.subject?.toLowerCase() || '';
      const message = ticket.message?.toLowerCase() || '';
      if (!userName.includes(searchLower) && !userEmail.includes(searchLower) && !subject.includes(searchLower) && !message.includes(searchLower)) {
        return false;
      }
    }
    // Filtro por fechas
    if (dateFrom) {
      const ticketDate = new Date(ticket.createdAt);
      const fromDate = new Date(dateFrom);
      if (ticketDate < fromDate) return false;
    }
    if (dateTo) {
      const ticketDate = new Date(ticket.createdAt);
      const toDate = new Date(dateTo);
      // Sumar un día para incluir el día seleccionado
      toDate.setDate(toDate.getDate() + 1);
      if (ticketDate >= toDate) return false;
    }
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

  const handleAddInternalNote = async () => {
    if (!selectedTicket || !internalNote.trim()) return;
    setInternalNoteLoading(true);
    try {
      await addInternalNote(selectedTicket._id, internalNote);
      setInternalNote('');
      await fetchTickets();
      setSelectedTicket(null);
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setInternalNoteLoading(false);
    }
  };

  const handleAssignResponsable = async (ticketId: string, responsableId: string) => {
    setStatusLoading(true);
    try {
      await assignResponsable(ticketId, responsableId);
      await fetchTickets();
    } catch (err) {
      // Manejo de error opcional
    } finally {
      setStatusLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast-${type}`;
    toast.innerHTML = `
      <div style="
        position: fixed; top: 20px; right: 20px;
        background: ${type === 'success' ? '#28a745' : '#d32f2f'}; color: white; padding: 1rem 1.5rem;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000; animation: slideInRight 0.3s ease;
        display: flex; align-items: center; gap: 0.5rem;
      ">
        <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'x-octagon-fill'}"></i>
        ${msg}
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2500);
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta solicitud de soporte?')) return;
    setDeletingId(id);
    setStatusLoading(true);
    try {
      await deleteTicket(id);
      await fetchTickets();
      showToast('Solicitud eliminada correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la solicitud.', 'error');
    } finally {
      setDeletingId(null);
      setStatusLoading(false);
    }
  };

  // Badge de estado con ícono
  const getStatusBadge = (status: string) => {
    let color = 'secondary', icon = 'question-circle';
    if (status === 'abierto') { color = 'success'; icon = 'inbox-fill'; }
    else if (status === 'en proceso') { color = 'warning'; icon = 'clock-fill'; }
    else if (status === 'cerrado') { color = 'dark'; icon = 'lock-fill'; }
    return (
      <span className={`badge bg-${color} d-inline-flex align-items-center gap-1 px-2 py-2`} style={{fontSize:'1em', minWidth: 90, justifyContent:'center'}}>
        <i className={`bi bi-${icon}`}></i> {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Función para exportar a CSV
  function exportTicketsToCSV(tickets: Ticket[]) {
    if (!tickets.length) return;
    const header = ['Usuario', 'Correo', 'Asunto', 'Estado', 'Fecha', 'Mensaje'];
    const rows = tickets.map((t: Ticket) => [
      t.user?.nombre || '',
      t.user?.email || '',
      t.subject || '',
      t.status || '',
      new Date(t.createdAt).toLocaleString('es-CO'),
      t.message?.replace(/\n/g, ' ') || ''
    ]);
    const csvContent = [header, ...rows].map((r: string[]) => r.map((field: string) => '"' + String(field).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `tickets_soporte_${new Date().toISOString().slice(0,10)}.csv`);
  }

  const handleDeleteSuggestion = async (id: string) => {
    if (!window.confirm('¿Eliminar esta sugerencia?')) return;
    try {
      await productService.deleteSuggestion(id);
      setSugerencias(sugerencias => sugerencias.filter(s => s._id !== id));
      showToast('Sugerencia eliminada.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar sugerencia.', 'error');
    }
  };

  // Función robusta para extraer URLs pegadas
  function extraerTodasLasURLsPegadas(texto: string): string[] {
    const indices = [];
    const regex = /https?:\/\//g;
    let match;
    while ((match = regex.exec(texto)) !== null) {
      indices.push(match.index);
    }
    const urls = [];
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i];
      const end = indices[i + 1] !== undefined ? indices[i + 1] : texto.length;
      urls.push(texto.substring(start, end).trim());
    }
    return urls.filter(Boolean);
  }

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
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
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
          <div className="d-flex gap-2 mb-3 align-items-end flex-wrap">
            <select className="form-select w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="abierto">Abiertos</option>
              <option value="en proceso">En proceso</option>
              <option value="cerrado">Cerrados</option>
            </select>
            <select className="form-select w-auto" value={responsableFilter} onChange={e => setResponsableFilter(e.target.value)}>
              <option value="todos">Todos los responsables</option>
              {admins.map(a => (
                <option key={a._id} value={a._id}>{a.nombre}</option>
              ))}
            </select>
            <input
              type="text"
              className="form-control w-auto"
              style={{ minWidth: 180 }}
              placeholder="Buscar usuario, correo, asunto o mensaje"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="d-flex flex-column">
              <label style={{fontSize:12}}>Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{ minWidth: 120 }}
              />
            </div>
            <div className="d-flex flex-column">
              <label style={{fontSize:12}}>Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ minWidth: 120 }}
              />
            </div>
            <button className="btn btn-outline-secondary" onClick={fetchTickets} disabled={statusLoading}>
              <i className="bi bi-arrow-clockwise"></i> Actualizar
            </button>
            <button className="btn btn-success" onClick={() => exportTicketsToCSV(filteredTickets)}>
              <i className="bi bi-file-earmark-spreadsheet"></i> Exportar CSV
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
                  <th>Responsable</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket, idx) => (
                  <tr key={ticket._id} className={selectedTicket?._id === ticket._id ? 'table-active' : idx % 2 === 0 ? 'table-light' : ''}>
                    <td style={{fontWeight:600}}>{ticket.user?.nombre}</td>
                    <td>{ticket.user?.email}</td>
                    <td>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`asunto-tooltip-${ticket._id}`}>{ticket.message}</Tooltip>}>
                        <span style={{fontWeight:500, cursor:'pointer'}}>{ticket.subject}</span>
                      </OverlayTrigger>
                    </td>
                    <td>{getStatusBadge(ticket.status)}</td>
                    <td>{admins.find(a => a._id === ticket.responsable)?.nombre || <span className="text-muted">Sin asignar</span>}</td>
                    <td>{new Date(ticket.createdAt).toLocaleString('es-CO')}</td>
                    <td className="d-flex gap-1 flex-wrap" style={{minWidth:180}}>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`ver-tooltip-${ticket._id}`}>Ver/Responder</Tooltip>}>
                        <button className="btn btn-sm btn-primary" onClick={() => setSelectedTicket(ticket)}>
                          <i className="bi bi-chat-dots"></i>
                        </button>
                      </OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`estado-tooltip-${ticket._id}`}>Cambiar estado</Tooltip>}>
                        <select className="form-select form-select-sm d-inline w-auto" style={{ minWidth: 110 }} value={ticket.status} onChange={e => handleChangeStatus(ticket._id, e.target.value)} disabled={statusLoading}>
                          <option value="abierto">Abierto</option>
                          <option value="en proceso">En proceso</option>
                          <option value="cerrado">Cerrado</option>
                        </select>
                      </OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`responsable-tooltip-${ticket._id}`}>Asignar responsable</Tooltip>}>
                        <select className="form-select form-select-sm d-inline w-auto" style={{ minWidth: 110 }} value={ticket.responsable || ''} onChange={e => handleAssignResponsable(ticket._id, e.target.value)} disabled={statusLoading}>
                          <option value="">Sin asignar</option>
                          {admins.map(a => (
                            <option key={a._id} value={a._id}>{a.nombre}</option>
                          ))}
                        </select>
                      </OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`eliminar-tooltip-${ticket._id}`}>Eliminar</Tooltip>}>
                        {deletingId === ticket._id ? (
                          <button className="btn btn-sm btn-danger" disabled style={{ minWidth: 36 }}>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteTicket(ticket._id)} disabled={statusLoading} title="Eliminar solicitud">
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </OverlayTrigger>
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
              <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <div><b>Asunto:</b> {selectedTicket.subject}</div>
                <div><b>Mensaje inicial:</b> {selectedTicket.message}</div>
                <div><b>Responsable:</b> {admins.find(a => a._id === selectedTicket.responsable)?.nombre || <span className="text-muted">Sin asignar</span>}</div>
                <hr />
                <div>
                  <b>Historial de respuestas:</b>
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
                <hr />
                <div>
                  <b>Notas internas (privadas para admins):</b>
                  <ul className="list-unstyled mt-2">
                    {selectedTicket.internalNotes?.length === 0 && <li className="text-muted">Sin notas internas.</li>}
                    {selectedTicket.internalNotes?.map((n, idx) => (
                      <li key={idx} className="mb-2">
                        <span className="fw-bold">{admins.find(a => a._id === n.admin)?.nombre || 'Admin'}:</span> {n.note}
                        <br /><span className="text-muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString('es-CO')}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 d-flex gap-2">
                    <input className="form-control" value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Agregar nota interna..." disabled={internalNoteLoading} />
                    <button className="btn btn-secondary" onClick={handleAddInternalNote} disabled={internalNoteLoading || !internalNote.trim()}>
                      {internalNoteLoading ? 'Agregando...' : 'Agregar'}
                    </button>
                  </div>
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
          <section className="admin-sugerencias-section" style={{ marginTop: 40 }}>
            <h2 style={{ color: '#d32f2f', fontSize: '1.4rem', marginBottom: 16 }}>Sugerencias de usuarios</h2>
            {sugerencias.length === 0 ? (
              <div className="alert alert-info">No hay sugerencias aún.</div>
            ) : (
              <div className="sugerencias-list" style={{ maxHeight: 350, overflowY: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 16 }}>
                {sugerencias.map((s, idx) => (
                  <div key={s._id || idx} style={{ borderBottom: '1px solid #eee', marginBottom: 12, paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.nombre} <span style={{ color: '#888', fontWeight: 400 }}>({s.email})</span></div>
                      <div style={{ fontSize: 13, color: '#888' }}>{new Date(s.fecha).toLocaleString()}</div>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
                        {s.urls.reduce((acc: string[], url: string) => acc.concat(extraerTodasLasURLsPegadas(url)), []).map((url: string, i: number) => (
                          <li key={i}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>
                        ))}
                      </ul>
                    </div>
                    <button onClick={() => handleDeleteSuggestion(s._id)} style={{ background: 'none', border: 'none', color: '#d32f2f', fontSize: 20, cursor: 'pointer' }} title="Eliminar sugerencia">
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminSupportPage; 