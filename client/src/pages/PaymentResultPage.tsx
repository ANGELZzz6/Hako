import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './PaymentResultPage.css';

interface WompiResult {
  id: string;
  status: string;
  reference: string;
}

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<WompiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const wompiId = searchParams.get('id');
    const status = searchParams.get('status');
    const reference = searchParams.get('reference');

    if (wompiId && status && reference) {
      setResult({ id: wompiId, status, reference });
    }
    setLoading(false);
  }, [searchParams]);

  const getStatusInfo = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return {
          title: '¡Pago Aprobado!',
          message: 'Tu transacción ha sido completada con éxito. Ya puedes ver tu pedido.',
          icon: 'bi-check-circle-fill',
          color: 'success',
          bgColor: 'bg-success'
        };
      case 'DECLINED':
        return {
          title: 'Pago Declinado',
          message: 'La transacción fue rechazada por la entidad financiera.',
          icon: 'bi-x-circle-fill',
          color: 'danger',
          bgColor: 'bg-danger'
        };
      case 'VOIDED':
        return {
          title: 'Transacción Anulada',
          message: 'La transacción ha sido anulada correctamente.',
          icon: 'bi-info-circle-fill',
          color: 'warning',
          bgColor: 'bg-warning'
        };
      case 'ERROR':
      default:
        return {
          title: 'Error en el Pago',
          message: 'Ocurrió un error al procesar tu pago. Por favor intenta de nuevo.',
          icon: 'bi-exclamation-triangle-fill',
          color: 'secondary',
          bgColor: 'bg-secondary'
        };
    }
  };

  const handleContinueShopping = () => navigate('/productos');
  const handleViewOrders = () => navigate('/mis-pedidos');

  if (loading) {
    return (
      <div className="payment-result-page container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Procesando...</span>
        </div>
        <p className="mt-3">Obteniendo resultado de Wompi...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="payment-result-page container py-5">
        <div className="alert alert-danger text-center shadow-sm">
          <h4 className="fw-bold">Sesión de pago no encontrada</h4>
          <p>No pudimos recuperar la información de tu transacción desde Wompi.</p>
          <button className="btn btn-primary mt-3" onClick={handleContinueShopping}>
            Volver a la tienda
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(result.status);

  return (
    <div className="payment-result-page container py-5 animate__animated animate__fadeIn">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className={`card border-0 shadow-lg overflow-hidden`}>
            <div className={`${statusInfo.bgColor} text-white text-center py-5`}>
              <i className={`bi ${statusInfo.icon} display-1`}></i>
              <h2 className="mt-4 fw-bold text-uppercase">{statusInfo.title}</h2>
            </div>
            <div className="card-body text-center p-4">
              <p className="lead fw-semibold text-muted mb-4">{statusInfo.message}</p>

              <div className="details-container bg-light rounded p-3 mb-4 text-start">
                <div className="mb-2">
                  <small className="text-muted d-block text-uppercase">Referencia Hako</small>
                  <span className="fw-bold">{result.reference}</span>
                </div>
                <div className="mb-0">
                  <small className="text-muted d-block text-uppercase">ID Transacción Wompi</small>
                  <span className="font-monospace text-break" style={{ fontSize: '0.9rem' }}>{result.id}</span>
                </div>
              </div>

              <div className="d-grid gap-3">
                <button className="btn btn-primary btn-lg fw-bold py-3" onClick={handleViewOrders}>
                  <i className="bi bi-clipboard-check me-2"></i>
                  Ver Mis Pedidos
                </button>
                <button className="btn btn-outline-secondary btn-lg" onClick={handleContinueShopping}>
                  <i className="bi bi-shop me-2"></i>
                  Seguir Comprando
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <small className="text-muted">
              Si tienes dudas sobre tu pago, contáctanos con tu ID de transacción.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;