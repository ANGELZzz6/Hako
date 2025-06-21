import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './UserManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import UserTable from '../components/UserTable';

// Datos de ejemplo para usuarios
const mockUsers = [
  {
    id: 1,
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    document: '12345678',
    phone: '3001234567',
    status: 'active',
    role: 'user'
  },
  {
    id: 2,
    name: 'María García',
    email: 'maria.garcia@email.com',
    document: '87654321',
    phone: '3109876543',
    status: 'active',
    role: 'admin'
  },
  {
    id: 3,
    name: 'Carlos López',
    email: 'carlos.lopez@email.com',
    document: '11223344',
    phone: '3205551234',
    status: 'inactive',
    role: 'user'
  },
  {
    id: 4,
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@email.com',
    document: '55667788',
    phone: '3157778888',
    status: 'active',
    role: 'user'
  },
  {
    id: 5,
    name: 'Luis Martínez',
    email: 'luis.martinez@email.com',
    document: '99887766',
    phone: '3009998888',
    status: 'active',
    role: 'admin'
  }
];

const UserManagement = () => {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.document.includes(searchTerm)
  );

  return (
    <div className="user-management">
      {/* Barra superior */}
      <header className="user-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-people header-icon"></i>
            <span className="header-title">Users</span>
          </div>
          <div className="header-center">
            <h1 className="user-header">
              <span className="logo-japanese">箱</span>
              <span className="brand-text">hako</span>
              <span className="develop-text">Develop</span>
            </h1>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="user-main-content">
        <div className="container">
          {/* Barra de búsqueda */}
          <SearchBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />

          {/* Tabla de usuarios */}
          <UserTable users={filteredUsers} />
        </div>
      </main>
    </div>
  );
};

export default UserManagement; 