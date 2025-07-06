import React from 'react';
import type { Payment } from '../services/paymentManagementService';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface PaymentTableProps {
  payments: Payment[];
  onViewDetails: (payment: Payment) => void;
  onDelete: (paymentId: string) => void;
  onUpdateStatus: (paymentId: string, status: string) => void;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  onViewDetails,
  onDelete,
  onUpdateStatus
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      <span className={`badge bg-${config.class} text-white`}>
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
    <div className="table-responsive">
      <table className="table table-hover">
        <thead className="table-dark">
          <tr>
            <th>ID MP</th>
            <th>Usuario</th>
            <th>Monto</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Productos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment._id}>
              <td>
                <small className="text-muted">{payment.mp_payment_id}</small>
              </td>
              <td>
                <div>
                  <strong>{payment.user_id?.nombre || 'N/A'}</strong>
                  <br />
                  <small className="text-muted">{payment.user_id?.email || payment.payer.email}</small>
                </div>
              </td>
              <td>
                <strong>{formatCurrency(payment.amount)}</strong>
                <br />
                <small className="text-muted">{payment.currency}</small>
              </td>
              <td>
                <div className="d-flex align-items-center">
                  <i className={`${getPaymentMethodIcon(payment.payment_method.type)} me-2`}></i>
                  <span>{payment.payment_method.type || 'N/A'}</span>
                </div>
              </td>
              <td>
                {getStatusBadge(payment.status)}
              </td>
              <td>
                <div>
                  <small>{formatDate(payment.date_created)}</small>
                  {payment.date_approved && (
                    <>
                      <br />
                      <small className="text-success">
                        Aprobado: {formatDate(payment.date_approved)}
                      </small>
                    </>
                  )}
                </div>
              </td>
              <td>
                <div>
                  <span className="badge bg-info">
                    {payment.purchased_items.length} producto{payment.purchased_items.length !== 1 ? 's' : ''}
                  </span>
                  <br />
                  <small className="text-muted">
                    {payment.purchased_items.reduce((total, item) => total + item.quantity, 0)} unidades
                  </small>
                </div>
              </td>
              <td>
                <div className="btn-group" role="group">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onViewDetails(payment)}
                    title="Ver detalles"
                  >
                    <i className="bi bi-eye"></i>
                  </button>
                  
                  {payment.status === 'pending' && (
                    <React.Fragment>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => onUpdateStatus(payment._id, 'approved')}
                        title="Aprobar pago"
                      >
                        <i className="bi bi-check"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onUpdateStatus(payment._id, 'rejected')}
                        title="Rechazar pago"
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </React.Fragment>
                  )}
                  
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDelete(payment._id)}
                    title="Eliminar pago"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTable; 