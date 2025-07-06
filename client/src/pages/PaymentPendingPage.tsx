import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './PaymentPendingPage.css';

const PaymentPendingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    if (paymentId) {
      setPaymentInfo({
        payment_id: paymentId,
        status: status,
        external_reference: externalReference
      });
    }
  }, [searchParams]);

  return (
    <div className="payment-pending-container">
      <div className="pending-card">
        <div className="pending-icon">
          <i className="bi bi-clock-fill"></i>
        </div>
        
        <h1>Pago Pendiente</h1>
        <p className="pending-message">
          Tu pago está siendo procesado. Te notificaremos cuando se confirme.
        </p>

        {paymentInfo && (
          <div className="payment-details">
            <h3>Detalles del Pago</h3>
            <div className="detail-row">
              <span>ID de Pago:</span>
              <span>{paymentInfo.payment_id}</span>
            </div>
            <div className="detail-row">
              <span>Estado:</span>
              <span className="status-pending">Pendiente</span>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <Link to="/profile" className="btn btn-primary">
            <i className="bi bi-person me-2"></i>
            Ver Mis Pedidos
          </Link>
          <Link to="/" className="btn btn-outline-primary">
            <i className="bi bi-house me-2"></i>
            Volver al Inicio
          </Link>
        </div>

        <div className="info-box">
          <h4>¿Por qué está pendiente?</h4>
          <ul>
            <li>Algunos métodos de pago requieren confirmación manual</li>
            <li>Pagos con transferencia bancaria pueden tardar hasta 24 horas</li>
            <li>Pagos con PSE pueden tardar algunos minutos</li>
            <li>Recibirás una notificación cuando se confirme</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentPendingPage; 