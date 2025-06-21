import React from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  document: string;
  phone: string;
  status: string;
  role: string;
}

interface UserRowProps {
  user: User;
}

const UserRow: React.FC<UserRowProps> = ({ user }) => {
  const getStatusBadge = (status: string) => {
    const statusClass = status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = status === 'active' ? 'Activo' : 'Inactivo';
    
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

  return (
    <tr>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.document}</td>
      <td>{user.phone}</td>
      <td>{getStatusBadge(user.status)}</td>
      <td>{getRoleBadge(user.role)}</td>
      <td className="action-buttons">
        <button 
          className="btn-action btn-edit" 
          onClick={() => console.log('Edit user:', user.id)}
          aria-label={`Editar usuario ${user.name}`}
        >
          <i className="bi bi-pencil-square"></i>
        </button>
        <button 
          className="btn-action btn-delete" 
          onClick={() => console.log('Delete user:', user.id)}
          aria-label={`Borrar usuario ${user.name}`}
        >
          <i className="bi bi-trash3-fill"></i>
        </button>
      </td>
    </tr>
  );
};

export default UserRow; 