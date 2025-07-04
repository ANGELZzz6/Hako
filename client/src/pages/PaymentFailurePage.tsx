import React from 'react';
import { Link } from 'react-router-dom';

const PaymentFailurePage = () => (
  <div className="payment-failure-container">
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="failure-card">
            <div className="failure-icon">
              <i className="bi bi-x-circle-fill" style={{ fontSize: '4rem', color: '#dc3545' }}></i>
            </div>
            <h1>Pago Fallido</h1>
            <p className="failure-message">
              No pudimos procesar tu pago. Por favor, verifica tus datos o intenta con otro método de pago.
            </p>
            <div className="action-buttons">
              <Link to="/cart" className="btn btn-danger btn-lg">
                <i className="bi bi-arrow-repeat me-2"></i>
                Volver a Intentar
              </Link>
              <Link to="/" className="btn btn-outline-secondary btn-lg">
                <i className="bi bi-house-door me-2"></i>
                Ir al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default PaymentFailurePage; 