import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import './PaymentSuccessPage.css';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { clearCart } = useCart();

  useEffect(() => {
    // Vaciar el carrito cuando se carga esta página
    if (currentUser) {
      clearCart();
      console.log('Carrito vaciado después del pago exitoso');
    }
  }, [currentUser, clearCart]);

  return (
    <div className="payment-success-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="success-card">
              <div className="success-icon">
                <i className="bi bi-check-circle-fill"></i>
              </div>
              
              <h1>¡Pago Exitoso!</h1>
              <p className="success-message">
                Tu pago ha sido procesado correctamente. 
                Hemos recibido tu pedido y te enviaremos una confirmación por email.
              </p>
              
              <div className="order-summary">
                <h3>Resumen de tu compra</h3>
                <p>Tu carrito ha sido vaciado automáticamente.</p>
                <p>Recibirás un email con los detalles de tu pedido.</p>
              </div>
              
              <div className="action-buttons">
                <Link to="/productos" className="btn btn-primary btn-lg">
                  <i className="bi bi-shop me-2"></i>
                  Seguir Comprando
                </Link>
                <Link to="/profile" className="btn btn-outline-primary btn-lg">
                  <i className="bi bi-person me-2"></i>
                  Ver Mi Perfil
                </Link>
              </div>
              
              <div className="contact-info">
                <h4>¿Tienes preguntas?</h4>
                <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos:</p>
                <div className="contact-methods">
                  <div className="contact-method">
                    <i className="bi bi-envelope"></i>
                    <span>contacto@hako.com</span>
                  </div>
                  <div className="contact-method">
                    <i className="bi bi-telephone"></i>
                    <span>(123) 456-7890</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage; 