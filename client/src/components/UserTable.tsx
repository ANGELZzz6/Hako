import React from 'react';
import type { User } from '../services/userService';
import UserRow from './UserRow';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onEdit, onDelete, onToggleStatus }) => {
  return (
    <div className="table-wrapper">
      <div className="mobile-scroll-hint">
        <span>← Desliza horizontalmente para ver más columnas →</span>
      </div>
      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Fecha de Registro</th>
              <th>Estado</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow 
                key={user._id} 
                user={user} 
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable; 