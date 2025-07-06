import React from 'react';
import type { Payment } from '../services/paymentManagementService';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface PaymentDetailsModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  payment,
  isOpen,
  onClose
}) => {
  if (!payment) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { class: 'success', text: 'Aprobado', icon: 'bi-check-circle' },
      pending: { class: 'warning', text: 'Pendiente', icon: 'bi-clock' },
      rejected: { class: 'danger', text: 'Rechazado', icon: 'bi-x-circle' },
      cancelled: { class: 'secondary', text: 'Cancelado', icon: 'bi-dash-circle' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`badge bg-${config.class} text-white fs-6`}>
        <i className={`${config.icon} me-1`}></i>
        {config.text}
      </span>
    );
  };

  const getPaymentMethodIcon = (methodType: string) => {
    const methodIcons = {
      credit_card: 'bi-credit-card',
      debit_card: 'bi-credit-card',
      bank_transfer: 'bi-bank',
      pse: 'bi-bank',
      cash: 'bi-cash-coin',
      default: 'bi-credit-card'
    };

    return methodIcons[methodType as keyof typeof methodIcons] || methodIcons.default;
  };

  return (
    <>
      {isOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-receipt me-2"></i>
                  Detalles del Pago
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
              
              <div className="modal-body">
                <div className="row">
                  {/* Información Principal */}
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="bi bi-info-circle me-2"></i>
                          Información General
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-2">
                          <strong>ID Mercado Pago:</strong>
                          <br />
                          <code>{payment.mp_payment_id}</code>
                        </div>
                        
                        <div className="mb-2">
                          <strong>Referencia Externa:</strong>
                          <br />
                          <code>{payment.external_reference}</code>
                        </div>
                        
                        <div className="mb-2">
                          <strong>Estado:</strong>
                          <br />
                          {getStatusBadge(payment.status)}
                        </div>
                        
                        <div className="mb-2">
                          <strong>Monto:</strong>
                          <br />
                          <span className="fs-5 text-primary fw-bold">
                            {formatCurrency(payment.amount)}
                          </span>
                          <br />
                          <small className="text-muted">{payment.currency}</small>
                        </div>
                        
                        <div className="mb-2">
                          <strong>Método de Pago:</strong>
                          <br />
                          <div className="d-flex align-items-center">
                            <i className={`${getPaymentMethodIcon(payment.payment_method.type)} me-2`}></i>
                            <span>{payment.payment_method.type || 'N/A'}</span>
                          </div>
                          {payment.payment_method.id && (
                            <small className="text-muted">ID: {payment.payment_method.id}</small>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Información del Usuario */}
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="bi bi-person me-2"></i>
                          Información del Usuario
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-2">
                          <strong>Nombre:</strong>
                          <br />
                          {payment.user_id?.nombre || payment.payer.name || 'N/A'}
                        </div>
                        
                        <div className="mb-2">
                          <strong>Email:</strong>
                          <br />
                          {payment.user_id?.email || payment.payer.email}
                        </div>
                        
                        {payment.payer.surname && (
                          <div className="mb-2">
                            <strong>Apellido:</strong>
                            <br />
                            {payment.payer.surname}
                          </div>
                        )}
                        
                        <div className="mb-2">
                          <strong>ID Usuario:</strong>
                          <br />
                          <code>{payment.user_id?._id || 'N/A'}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fechas */}
                <div className="row">
                  <div className="col-12">
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="bi bi-calendar me-2"></i>
                          Fechas
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <strong>Fecha de Creación:</strong>
                            <br />
                            {formatDate(payment.date_created)}
                          </div>
                          {payment.date_approved && (
                            <div className="col-md-6">
                              <strong>Fecha de Aprobación:</strong>
                              <br />
                              {formatDate(payment.date_approved)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productos Comprados */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="bi bi-box-seam me-2"></i>
                      Productos Comprados ({payment.purchased_items.length})
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unitario</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payment.purchased_items.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <strong>{item.product_name}</strong>
                                <br />
                                <small className="text-muted">ID: {item.product_id}</small>
                              </td>
                              <td>
                                <span className="badge bg-primary">{item.quantity}</span>
                              </td>
                              <td>{formatCurrency(item.unit_price)}</td>
                              <td>
                                <strong>{formatCurrency(item.unit_price * item.quantity)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-primary">
                            <td colSpan={3} className="text-end">
                              <strong>Total:</strong>
                            </td>
                            <td>
                              <strong>{formatCurrency(payment.amount)}</strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Información Adicional */}
                {payment.description && (
                  <div className="card mt-3">
                    <div className="card-header">
                      <h6 className="mb-0">
                        <i className="bi bi-chat-text me-2"></i>
                        Descripción
                      </h6>
                    </div>
                    <div className="card-body">
                      {payment.description}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Backdrop */}
      {isOpen && (
        <div className="modal-backdrop fade show"></div>
      )}
    </>
  );
};

export default PaymentDetailsModal; 