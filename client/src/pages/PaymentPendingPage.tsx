import React from 'react';
import { Link } from 'react-router-dom';

const PaymentPendingPage = () => (
  <div className="payment-pending-container">
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="pending-card">
            <div className="pending-icon">
              <i className="bi bi-hourglass-split" style={{ fontSize: '4rem', color: '#ffc107' }}></i>
            </div>
            <h1>Pago Pendiente</h1>
            <p className="pending-message">
              Tu pago está siendo procesado. Te notificaremos cuando se confirme el estado de la transacción.
            </p>
            <div className="action-buttons">
              <Link to="/" className="btn btn-primary btn-lg">
                <i className="bi bi-house-door me-2"></i>
                Ir al Inicio
              </Link>
              <Link to="/profile" className="btn btn-outline-primary btn-lg">
                <i className="bi bi-person me-2"></i>
                Ver Mi Perfil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PaymentPendingPage; 