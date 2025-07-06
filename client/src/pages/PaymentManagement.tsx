import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PaymentManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import PaymentTable from '../components/PaymentTable';
import PaymentDetailsModal from '../components/PaymentDetailsModal';
import paymentManagementService, { type Payment } from '../services/paymentManagementService';

const PaymentManagement = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalPayments: 0,
    approvedPayments: 0,
    pendingPayments: 0,
    rejectedPayments: 0,
    totalAmount: 0,
    averageAmount: 0
  });

  // Cargar pagos al montar el componente
  useEffect(() => {
    loadPayments();
    loadStats();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsData = await paymentManagementService.getAllPayments();
      setPayments(paymentsData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await paymentManagementService.getPaymentStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.mp_payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.user_id?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.user_id?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.external_reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleDelete = async (paymentId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await paymentManagementService.deletePayment(paymentId);
      setPayments(payments.filter(payment => payment._id !== paymentId));
      await loadStats(); // Recargar estadísticas
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar pago');
    }
  };

  const handleUpdateStatus = async (paymentId: string, status: string) => {
    try {
      const updatedPayment = await paymentManagementService.updatePaymentStatus(paymentId, status);
      setPayments(payments.map(payment => 
        payment._id === paymentId ? updatedPayment : payment
      ));
      await loadStats(); // Recargar estadísticas
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar estado del pago');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  return (
    <div className="payment-management">
      {/* Barra superior */}
      <header className="payment-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-credit-card header-icon"></i>
            <span className="header-title">Payments</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <Link to="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="payment-main-content">
        <div className="container">
          {/* Estadísticas */}
          <div className="stats-grid">
            <div className="row">
            <div className="col-md-2">
              <div className="stat-card">
                <div className="stat-icon bg-primary">
                  <i className="bi bi-credit-card"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.totalPayments}</h3>
                  <p>Total Pagos</p>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-card">
                <div className="stat-icon bg-success">
                  <i className="bi bi-check-circle"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.approvedPayments}</h3>
                  <p>Aprobados</p>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-card">
                <div className="stat-icon bg-warning">
                  <i className="bi bi-clock"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.pendingPayments}</h3>
                  <p>Pendientes</p>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-card">
                <div className="stat-icon bg-danger">
                  <i className="bi bi-x-circle"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.rejectedPayments}</h3>
                  <p>Rechazados</p>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-card">
                <div className="stat-icon bg-info">
                  <i className="bi bi-currency-dollar"></i>
                </div>
                <div className="stat-content">
                  <h3>{formatCurrency(stats.totalAmount)}</h3>
                  <p>Total Recaudado</p>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="stat-card">
                <div className="stat-icon bg-secondary">
                  <i className="bi bi-graph-up"></i>
                </div>
                <div className="stat-content">
                  <h3>{formatCurrency(stats.averageAmount)}</h3>
                  <p>Promedio</p>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <SearchBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Buscar por ID, usuario, email o referencia..."
          />

          {/* Mensaje de error */}
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-container">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p>Cargando pagos...</p>
            </div>
          )}

          {/* Tabla de pagos */}
          {!loading && (
            <PaymentTable 
              payments={filteredPayments}
              onViewDetails={handleViewDetails}
              onDelete={handleDelete}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {/* Mensaje cuando no hay pagos */}
          {!loading && filteredPayments.length === 0 && (
            <div className="no-payments">
              <i className="bi bi-credit-card"></i>
              <p>No se encontraron pagos</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalles */}
      <PaymentDetailsModal
        payment={selectedPayment}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default PaymentManagement; 