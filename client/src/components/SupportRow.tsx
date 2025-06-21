import React from 'react';

interface Ticket {
  id: number;
  title: string;
  description: string;
  user: string;
  priority: string;
  status: string;
  category: string;
  createdAt: string;
}

interface SupportRowProps {
  ticket: Ticket;
}

const SupportRow: React.FC<SupportRowProps> = ({ ticket }) => {
  const getPriorityBadge = (priority: string) => {
    const priorityClass = `priority-${priority}`;
    const priorityText = priority === 'high' ? 'Alta' : priority === 'medium' ? 'Media' : 'Baja';
    
    return (
      <span className={`priority-badge ${priorityClass}`}>
        {priorityText}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusClass = `status-${status}`;
    let statusText = '';
    
    switch (status) {
      case 'open':
        statusText = 'Abierto';
        break;
      case 'in_progress':
        statusText = 'En Proceso';
        break;
      case 'resolved':
        statusText = 'Resuelto';
        break;
      case 'closed':
        statusText = 'Cerrado';
        break;
      default:
        statusText = status;
    }
    
    return (
      <span className={`status-badge ${statusClass}`}>
        {statusText}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  return (
    <tr>
      <td>{ticket.title}</td>
      <td>{ticket.user}</td>
      <td>{getPriorityBadge(ticket.priority)}</td>
      <td>{getStatusBadge(ticket.status)}</td>
      <td>{ticket.category}</td>
      <td>{formatDate(ticket.createdAt)}</td>
      <td className="action-buttons">
        <button
          className="btn-action btn-edit"
          onClick={() => console.log('Edit ticket:', ticket.id)}
          aria-label={`Editar ticket ${ticket.title}`}
        >
          <i className="bi bi-pencil-square"></i>
        </button>
        <button
          className="btn-action btn-delete"
          onClick={() => console.log('Delete ticket:', ticket.id)}
          aria-label={`Borrar ticket ${ticket.title}`}
        >
          <i className="bi bi-trash3-fill"></i>
        </button>
      </td>
    </tr>
  );
};

export default SupportRow; 