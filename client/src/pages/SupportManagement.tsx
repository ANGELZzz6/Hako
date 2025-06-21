import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import SupportTable from '../components/SupportTable';

const mockTickets = [
  { 
    id: 1, 
    title: 'Problema con el login', 
    description: 'No puedo acceder a mi cuenta', 
    user: 'juan.perez@email.com', 
    priority: 'high', 
    status: 'open',
    category: 'Cuenta',
    createdAt: '2024-01-15'
  },
  { 
    id: 2, 
    title: 'Error en el pago', 
    description: 'La tarjeta no es aceptada', 
    user: 'maria.garcia@email.com', 
    priority: 'medium', 
    status: 'in_progress',
    category: 'Pagos',
    createdAt: '2024-01-14'
  },
  { 
    id: 3, 
    title: 'Producto defectuoso', 
    description: 'Laptop no enciende', 
    user: 'carlos.lopez@email.com', 
    priority: 'high', 
    status: 'resolved',
    category: 'Productos',
    createdAt: '2024-01-13'
  },
  { 
    id: 4, 
    title: 'Duda sobre envío', 
    description: '¿Cuándo llegará mi pedido?', 
    user: 'ana.rodriguez@email.com', 
    priority: 'low', 
    status: 'open',
    category: 'Envíos',
    createdAt: '2024-01-12'
  },
  { 
    id: 5, 
    title: 'Cambio de contraseña', 
    description: 'Olvidé mi contraseña', 
    user: 'luis.martinez@email.com', 
    priority: 'medium', 
    status: 'closed',
    category: 'Cuenta',
    createdAt: '2024-01-11'
  }
];

const SupportManagement = () => {
  const [tickets, setTickets] = useState(mockTickets);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="support-management">
      <header className="support-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-headset header-icon"></i>
            <span className="header-title">Support</span>
          </div>
          <div className="header-center">
            <h1 className="support-header">
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

      <main className="support-main-content">
        <div className="container">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <SupportTable tickets={filteredTickets} />
        </div>
      </main>
    </div>
  );
};

export default SupportManagement; 