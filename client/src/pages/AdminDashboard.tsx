import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import orderService from '../services/orderService';

const AdminDashboard: React.FC = () => {
  const [lockerStatus, setLockerStatus] = useState<any>(null);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [lockerError, setLockerError] = useState('');
  const [releasingLocker, setReleasingLocker] = useState<string | null>(null);

  useEffect(() => {
    // Cargar estado de casilleros
    const fetchLockers = async () => {
      setLoadingLockers(true);
      setLockerError('');
      try {
        const data = await orderService.getLockerStatus();
        setLockerStatus(data);
      } catch (err: any) {
        setLockerError('Error al cargar estado de casilleros');
      } finally {
        setLoadingLockers(false);
      }
    };
    fetchLockers();
  }, []);

  const handleReleaseLocker = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres liberar este casillero?')) {
      return;
    }

    try {
      setReleasingLocker(orderId);
      await orderService.releaseLocker(orderId);
      
      // Recargar estado de casilleros
      const data = await orderService.getLockerStatus();
      setLockerStatus(data);
      
      alert('Casillero liberado exitosamente');
    } catch (err: any) {
      alert('Error al liberar el casillero: ' + err.message);
    } finally {
      setReleasingLocker(null);
    }
  };

  return (
    <div className="admin-dashboard">
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
          </div>

          <div className="card mt-4">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Estado de Casilleros</h5>
              <button 
                className="btn btn-sm btn-outline-light"
                onClick={() => window.location.reload()}
                title="Actualizar estado"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            <div className="card-body">
              {loadingLockers ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : lockerError ? (
                <div className="alert alert-danger text-center">{lockerError}</div>
              ) : lockerStatus ? (
                <div>
                  <div className="mb-3">
                    <span className="badge bg-success me-2">Disponible</span>
                    <span className="badge bg-danger">Ocupado</span>
                  </div>
                  <div className="row g-2">
                    {lockerStatus.lockers.map((locker: any) => (
                      <div key={locker.number} className="col-3">
                        <div className={`p-3 border rounded text-center ${locker.status === 'occupied' ? 'bg-danger text-white' : 'bg-success text-white'}`} style={{ minHeight: 90 }}>
                          <div><strong>Casillero {locker.number}</strong></div>
                          {locker.status === 'occupied' ? (
                            <>
                              <div className="small">Pedido: <span className="fw-bold">{locker.order.id.slice(-6)}</span></div>
                              <div className="small">Usuario: {locker.order.user?.nombre || 'N/A'}</div>
                              <div className="small">Estado: {locker.order.status}</div>
                              <button
                                className="btn btn-sm btn-warning mt-1"
                                onClick={() => handleReleaseLocker(locker.order.id)}
                                disabled={releasingLocker === locker.order.id}
                                title="Liberar casillero"
                              >
                                {releasingLocker === locker.order.id ? (
                                  <i className="bi bi-hourglass-split"></i>
                                ) : (
                                  <i className="bi bi-unlock"></i>
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="small">Disponible</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <span>Total: {lockerStatus.total} | </span>
                    <span>Ocupados: {lockerStatus.summary.occupied} | </span>
                    <span>Disponibles: {lockerStatus.summary.available}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 