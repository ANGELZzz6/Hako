import React from 'react';
import { useNavigate } from 'react-router-dom';
import MercadoPagoCheckout from '../components/MercadoPagoCheckout';
import './CheckoutPage.css';
import { useAuth } from '../contexts/AuthContext';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Verificar autenticación
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('Pago exitoso:', paymentData);
    // El componente MercadoPagoCheckout maneja la redirección
  };

  const handlePaymentError = (error: string) => {
    console.error('Error en el pago:', error);
    // El componente MercadoPagoCheckout maneja los errores
  };

  return (
    <div className="checkout-page container py-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Checkout - Mercado Pago</h2>
          
          <MercadoPagoCheckout 
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage; 