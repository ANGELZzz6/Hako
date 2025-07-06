import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './PaymentFailurePage.css';

const PaymentFailurePage: React.FC = () => {
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
    <div className="payment-failure-container">
      <div className="failure-card">
        <div className="failure-icon">
          <i className="bi bi-x-circle-fill"></i>
        </div>
        
        <h1>Pago Fallido</h1>
        <p className="failure-message">
          Lo sentimos, tu pago no pudo ser procesado. Por favor, intenta nuevamente.
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
              <span className="status-failed">Fallido</span>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <Link to="/cart" className="btn btn-primary">
            <i className="bi bi-cart me-2"></i>
            Volver al Carrito
          </Link>
          <Link to="/" className="btn btn-outline-primary">
            <i className="bi bi-house me-2"></i>
            Volver al Inicio
          </Link>
        </div>

        <div className="info-box">
          <h4>Posibles Causas</h4>
          <ul>
            <li>Fondos insuficientes en la cuenta</li>
            <li>Tarjeta bloqueada o vencida</li>
            <li>Error en los datos de la tarjeta</li>
            <li>Problemas temporales del sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage; 