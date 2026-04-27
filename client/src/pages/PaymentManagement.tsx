import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './PaymentManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SearchBar from '../components/SearchBar';
import PaymentTable from '../components/PaymentTable';
import PaymentDetailsModal from '../components/PaymentDetailsModal';
import paymentManagementService, { type Payment } from '../services/paymentManagementService';
import ConfirmModal from '../components/ConfirmModal';

const PaymentManagement = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [paymentToRefund, setPaymentToRefund] = useState<Payment | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundStatus, setRefundStatus] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [stats, setStats] = useState({
    totalPayments: 0,
    approvedPayments: 0,
    pendingPayments: 0,
    rejectedPayments: 0,
    totalAmount: 0,
    averageAmount: 0
  });

  // Estado para el modal de confirmación
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'primary' | 'danger' | 'warning' | 'success';
    type?: 'confirm' | 'alert';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
  });

  // Helper para mostrar confirmación asíncrona
  const showConfirm = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' = 'primary', confirmText: string = 'Confirmar'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        variant,
        confirmText,
        type: 'confirm',
        onConfirm: () => {
          setModalConfig((prev: any) => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig((prev: any) => ({ ...prev, show: false }));
          resolve(false);
        }
      });
    });
  };

  // Helper para mostrar alertas
  const showAlert = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' = 'primary'): Promise<void> => {
    return new Promise((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        variant,
        type: 'alert',
        onConfirm: () => {
          setModalConfig((prev: any) => ({ ...prev, show: false }));
          resolve();
        },
        onCancel: () => {
          setModalConfig((prev: any) => ({ ...prev, show: false }));
          resolve();
        }
      });
    });
  };

  // Cargar pagos al montar el componente
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/', { replace: true });
    } else {
      loadPayments();
      loadStats();
    }
  }, [isAuthenticated, isAdmin, navigate]);

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
    const confirmed = await showConfirm(
      'Eliminar pago',
      '¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.',
      'danger',
      'Eliminar pago'
    );
    
    if (!confirmed) return;

    try {
      await paymentManagementService.deletePayment(paymentId);
      setPayments(payments.filter(payment => payment._id !== paymentId));
      await loadStats(); // Recargar estadísticas
      setError('');
      await showAlert('Éxito', 'Pago eliminado correctamente', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar pago');
      await showAlert('Error', 'Error al eliminar el pago: ' + err.message, 'danger');
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

  const handleDeleteAllPayments = async () => {
    const confirmed = await showConfirm(
      'Eliminar TODOS los pagos',
      'Esta acción eliminará TODOS los pagos permanentemente. ¿Deseas continuar?',
      'danger',
      'Eliminar todos'
    );
    
    if (!confirmed) return;

    try {
      setIsDeletingAll(true);
      setError('');
      const result = await paymentManagementService.deleteAllPayments();
      setPayments([]);
      await loadStats();
      await showAlert('Éxito', result.message || 'Todos los pagos han sido eliminados', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar todos los pagos');
      await showAlert('Error', 'Error al eliminar todos los pagos: ' + err.message, 'danger');
    } finally {
      setIsDeletingAll(false);
    }
  };


  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
  };

  const handleRefundClick = (payment: Payment) => {
    setPaymentToRefund(payment);
    setIsRefundModalOpen(true);
    setRefundStatus(null);
  };

  const processRefund = async () => {
    if (!paymentToRefund) return;
    try {
      setIsRefunding(true);
      setRefundStatus(null);
      const res = await paymentManagementService.refundPayment(paymentToRefund._id);
      
      setPayments(payments.map(p => p._id === paymentToRefund._id ? res.payment : p));
      await loadStats();
      
      setRefundStatus({ type: 'success', message: res.message || 'Reembolso procesado.' });
      
      setTimeout(() => {
        setIsRefundModalOpen(false);
        setPaymentToRefund(null);
      }, 2500);
      
    } catch (err: any) {
      setRefundStatus({ type: 'error', message: err.message || 'Error al procesar el reembolso' });
    } finally {
      setIsRefunding(false);
    }
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

          {/* Barra de búsqueda y acciones */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="flex-grow-1 me-3">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Buscar por ID, usuario, email o referencia..."
              />
            </div>
            <button
              className="btn btn-danger"
              onClick={handleDeleteAllPayments}
              disabled={isDeletingAll || payments.length === 0}
              title="Eliminar todos los pagos"
            >
              {isDeletingAll ? (
                <>
                  <i className="bi bi-hourglass-split me-2"></i>
                  Eliminando...
                </>
              ) : (
                <>
                  <i className="bi bi-trash3 me-2"></i>
                  Eliminar Todos
                </>
              )}
            </button>
          </div>

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
              onRefund={handleRefundClick}
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

      {/* Modal de Reembolso */}
      {isRefundModalOpen && paymentToRefund && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning">
                <h5 className="modal-title text-dark">
                  <i className="bi bi-arrow-counterclockwise me-2"></i>
                  Confirmar Reembolso
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => !isRefunding && setIsRefundModalOpen(false)}
                  disabled={isRefunding}
                ></button>
              </div>
              <div className="modal-body p-4">
                {refundStatus ? (
                  <div className={`alert alert-${refundStatus.type === 'success' ? 'success' : 'danger'} m-0`}>
                    <i className={`bi bi-${refundStatus.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`}></i>
                    {refundStatus.message}
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-center">¿Estás seguro de que deseas reembolsar este pago?</p>
                    <ul className="list-group mb-4 shadow-sm">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="text-muted">ID MercadoPago</span>
                        <strong>{paymentToRefund.mp_payment_id}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="text-muted">Cliente</span>
                        <strong>{paymentToRefund.payer.name || paymentToRefund.user_id?.nombre || paymentToRefund.payer.email}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center bg-light">
                        <span className="text-muted">Monto a reembolsar</span>
                        <strong className="text-danger fs-5">{formatCurrency(paymentToRefund.amount)}</strong>
                      </li>
                    </ul>
                    <div className="alert alert-info py-2 m-0 bg-info bg-opacity-10 border-info border-opacity-25 text-info">
                      <small><i className="bi bi-info-circle me-1"></i> Esta acción se comunicará con Mercado Pago, intentará hacer el reintegro y cancelará el pedido asociado automáticamente.</small>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={isRefunding}
                >
                  {refundStatus?.type === 'success' ? 'Cerrar' : 'Cancelar'}
                </button>
                {(!refundStatus || refundStatus.type === 'error') && (
                  <button 
                    type="button" 
                    className="btn btn-warning" 
                    onClick={processRefund}
                    disabled={isRefunding}
                  >
                    {isRefunding ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Procesando...</>
                    ) : (
                      'Confirmar Reembolso'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal {...modalConfig} />
    </div>
  );
};

export default PaymentManagement;