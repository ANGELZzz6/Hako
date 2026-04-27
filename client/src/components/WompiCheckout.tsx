import axios from 'axios';
import { useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { showErrorToast } from '../utils/toast';

interface WompiCheckoutProps {
  items: any[];
  payer: {
    email: string;
    name: string;
  };
  selectedItems?: any[];
  disabled?: boolean;
}

/**
 * Componente WompiCheckout - Sustituye a MercadoPagoCheckout
 * Realiza la redirección al Web Checkout de Wompi tras obtener el link de pago del backend.
 */
const WompiCheckout: React.FC<WompiCheckoutProps> = ({ items, payer, selectedItems, disabled }) => {
  const [loading, setLoading] = useState(false);

  // Helper function to resolve 'union type too complex' error
  const renderButtonContent = (): React.ReactElement => {
    if (loading) {
      return (
        <>
          <Spinner animation="border" size="sm" className="me-2" />
          Procesando...
        </>
      );
    }
    return (
      <>
        <i className="bi bi-credit-card-2-back me-2"></i>
        Pagar con Wompi
      </>
    );
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Solicitar creación de transacción al backend
      const response = await axios.post('/api/payment/create-preference', {
        items,
        payer,
        selected_items: selectedItems
      });

      if (response.data.success && response.data.payment_data) {
        const { publicKey, currency, amountInCents, reference, redirectUrl } = response.data.payment_data;

        // 2. Construir URL de redirección al Web Checkout de Wompi (Sandbox/Production)
        // Nota: Aunque Wompi tiene un Widget, el plan corregido opta por la redirección pura.
        const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&redirect-url=${encodeURIComponent(redirectUrl)}`;
        
        // Redirigir al usuario
        window.location.href = checkoutUrl;
      } else {
        throw new Error(response.data.message || 'Error al iniciar el pago con Wompi');
      }
    } catch (error: any) {
      console.error('❌ Error al procesar pago Wompi:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error de conexión con el servidor';
      showErrorToast(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wompi-checkout-container">
      <button
        className="btn btn-danger w-100 fw-bold py-3 text-uppercase shadow-sm"
        onClick={handlePayment}
        disabled={loading || disabled}
        id="btn-wompi-checkout"
        type="button"
      >
        {renderButtonContent()}
      </button>
      <div className="text-center mt-2">
        <small className="text-muted" style={{ fontSize: '10px' }}>
          Pagos seguros procesados por Wompi &copy;
        </small>
      </div>
    </div>
  );
};

export default WompiCheckout;
