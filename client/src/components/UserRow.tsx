import React from 'react';
import type { User } from '../services/userService';

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete, onToggleStatus }) => {
  const getStatusBadge = (isActive: boolean) => {
    const statusClass = isActive ? 'status-active' : 'status-inactive';
    const statusText = isActive ? 'Activo' : 'Inactivo';
    
    return (
      <span className={`status-badge ${statusClass}`}>
        {statusText}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleClass = role === 'admin' ? 'role-admin' : 'role-user';
    const roleText = role === 'admin' ? 'Admin' : 'Usuario';
    
    return (
      <span className={`role-badge ${roleClass}`}>
        {roleText}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <tr>
      <td>{user.nombre}</td>
      <td>{user.email}</td>
      <td>{formatDate(user.createdAt)}</td>
      <td>{getStatusBadge(user.isActive)}</td>
      <td>{getRoleBadge(user.role)}</td>
      <td className="action-buttons">
        <button 
          className="btn-action btn-edit" 
          onClick={() => onEdit(user)}
          aria-label={`Editar usuario ${user.nombre}`}
          title="Editar usuario"
        >
          <i className="bi bi-pencil-square"></i>
        </button>
        <button 
          className="btn-action btn-toggle-status" 
          onClick={() => onToggleStatus(user._id)}
          aria-label={`${user.isActive ? 'Desactivar' : 'Activar'} usuario ${user.nombre}`}
          title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
        >
          <i className={`bi ${user.isActive ? 'bi-person-x' : 'bi-person-check'}`}></i>
        </button>
        <button 
          className="btn-action btn-delete" 
          onClick={() => onDelete(user._id)}
          aria-label={`Borrar usuario ${user.nombre}`}
          title="Eliminar usuario"
          disabled={user.role === 'admin'}
        >
          <i className="bi bi-trash3-fill"></i>
        </button>
      </td>
    </tr>
  );
};

export default UserRow; 