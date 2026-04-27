import WompiCheckout from '../components/WompiCheckout';
import { useLocation, useNavigate } from 'react-router-dom';
import './CheckoutPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const location = useLocation();
  const checkoutData = location.state || {};
  const { items = [], payer = {} } = checkoutData;

  return (
    <div className="checkout-page container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0 rounded-4 p-4">
            <h2 className="mb-4 text-center fw-bold">Finalizar Compra</h2>
            <p className="text-muted text-center mb-4">
              Estás a un paso de completar tu pedido. Haz clic abajo para pagar de forma segura con Wompi.
            </p>

            <WompiCheckout
              items={items}
              payer={payer}
              selectedItems={items}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage; 