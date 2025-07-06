import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './PaymentSuccessPage.css';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener información del pago desde los parámetros de URL
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    if (paymentId) {
      // Aquí podrías hacer una llamada a tu API para obtener más detalles del pago
      setPaymentInfo({
        payment_id: paymentId,
        status: status,
        external_reference: externalReference
      });
    }

    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="payment-success-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Verificando pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      <div className="success-card">
        <div className="success-icon">
          <i className="bi bi-check-circle-fill"></i>
        </div>
        
        <h1>¡Pago Exitoso!</h1>
        <p className="success-message">
          Tu pago ha sido procesado correctamente. Gracias por tu compra.
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
              <span className="status-approved">Aprobado</span>
            </div>
            {paymentInfo.external_reference && (
              <div className="detail-row">
                <span>Referencia:</span>
                <span>{paymentInfo.external_reference}</span>
              </div>
            )}
          </div>
        )}

        <div className="action-buttons">
          <Link to="/" className="btn btn-primary">
            <i className="bi bi-house me-2"></i>
            Volver al Inicio
          </Link>
          <Link to="/profile" className="btn btn-outline-primary">
            <i className="bi bi-person me-2"></i>
            Ver Mis Pedidos
          </Link>
        </div>

        <div className="info-box">
          <h4>¿Qué sigue?</h4>
          <ul>
            <li>Recibirás un email de confirmación</li>
            <li>Tu pedido será procesado en las próximas 24 horas</li>
            <li>Te notificaremos cuando tu pedido esté listo para envío</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage; 