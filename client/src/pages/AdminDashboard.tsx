import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const AdminDashboard: React.FC = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  return (
    <div className="admin-dashboard" data-theme="light">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-grid-3x3-gap header-icon"></i>
            <span className="header-title">Dashboard</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <Link to="/" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
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

            {/* Botón de Gestión de Boxes */}
            <Link to="/admin/carts" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-cart-check icon"></i>
              <p>Boxes</p>
            </Link>

            {/* Botón de Gestión de Pagos */}
            <Link to="/admin/payments" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-credit-card icon"></i>
              <p>Payments</p>
            </Link>

            {/* Botón de Pedidos */}
            <Link to="/admin/orders" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-clipboard-check icon"></i>
              <p>Pedidos</p>
            </Link>

            {/* Botón de Citas */}
            <Link to="/admin/appointments" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-calendar-event icon"></i>
              <p>Citas</p>
            </Link>

            {/* Botón de Gestión de Casilleros */}
            <Link to="/admin/lockers" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-boxes icon"></i>
              <p>Casilleros</p>
            </Link>

            {/* Botón de Pruebas de Productos 3D */}
            <Link to="/admin/product-test" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-cube icon"></i>
              <i className="bi bi-tags icon ms-1"></i>
              <p>Pruebas 3D</p>
            </Link>
            {/* Botón de FLUJO COMPLETO SOPORTE TOTAL */}
            <Link to="/admin/support-complete" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-tools icon"></i>
              <p>Soporte Total</p>
            </Link>

            {/* Botón de Monitoreo */}
            <Link to="/admin/monitoring" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-activity icon text-success"></i>
              <p>Monitoring</p>
            </Link>

            {/* Botón de Editor de Contenido */}
            <Link to="/admin/content" className="dashboard-card" style={{ textDecoration: 'none' }}>
              <i className="bi bi-pencil-square icon text-warning"></i>
              <p>Editor Textos</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 