import React from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const AdminDashboard = () => {
  return (
    <div className="admin-dashboard">
      <header className="admin-header-bar">
        <h1 className="admin-header">
          <span className="logo-japanese">箱</span> <span className="brand-text">hako</span> <span className="develop-text">Develop</span>
        </h1>
      </header>

      <main className="admin-main-content">
        <div className="container">
          <div className="dashboard-grid">
            {/* Botón de Usuarios */}
            <Link to="/admin/users" className="dashboard-card text-red" style={{ textDecoration: 'none' }}>
              <i className="bi bi-people icon"></i>
              <p>Users</p>
            </Link>

            {/* Botón de Inventario */}
            <Link to="/admin/inventory" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-box-seam icon"></i>
              <p>Inventory</p>
            </Link>

            {/* Botón de Soporte */}
            <Link to="/admin/support" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-headset icon"></i>
              <p>Support</p>
            </Link>

            {/* Placeholders */}
            <div className="dashboard-card placeholder"></div>
            <div className="dashboard-card placeholder"></div>
            <div className="dashboard-card placeholder"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 