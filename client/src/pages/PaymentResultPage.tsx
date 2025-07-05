import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PaymentResultPage.css';

// Función para limpiar el estado del SDK de Mercado Pago
const cleanupMercadoPagoSDK = () => {
  try {
    // Limpiar cualquier instancia del SDK
    if ((window as any).mp) {
      delete (window as any).mp;
    }
    
    // Limpiar cualquier script del SDK
    const scripts = document.querySelectorAll('script[src*="mercadopago"]');
    scripts.forEach(script => script.remove());
    
    // Limpiar cualquier contenedor de formularios
    const containers = document.querySelectorAll('#cardFormContainer, #moneyFormContainer');
    containers.forEach(container => {
      if (container) {
        container.innerHTML = '';
      }
    });
    
    console.log('SDK de Mercado Pago limpiado exitosamente');
  } catch (error) {
    console.error('Error al limpiar SDK de Mercado Pago:', error);
  }
};

interface PaymentResult {
  status: string;
  payment_id?: string;
  preference_id?: string;
  payment_method_id?: string;
  installments?: string;
  issuer_id?: string;
  status_detail?: string;
}

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extraer parámetros de la URL
    const result: PaymentResult = {
      status: searchParams.get('status') || '',
      payment_id: searchParams.get('payment_id') || undefined,
      preference_id: searchParams.get('preference_id') || undefined,
      payment_method_id: searchParams.get('payment_method_id') || undefined,
      installments: searchParams.get('installments') || undefined,
      issuer_id: searchParams.get('issuer_id') || undefined,
      status_detail: searchParams.get('status_detail') || undefined,
    };

    setPaymentResult(result);
    setLoading(false);

    // Verificar si ya se recargó automáticamente
    const hasAutoReloaded = localStorage.getItem('payment_auto_reload');
    
    if (!hasAutoReloaded) {
      // Limpiar el SDK de Mercado Pago y recargar la página después de 5 segundos
      const timer = setTimeout(() => {
        cleanupMercadoPagoSDK();
        // Marcar que ya se recargó automáticamente
        localStorage.setItem('payment_auto_reload', 'true');
        // Recargar la página para limpiar completamente el estado
        window.location.reload();
      }, 5000); // 5 segundos para que el usuario pueda ver el resultado

      return () => clearTimeout(timer);
    } else {
      // Si ya se recargó, limpiar la marca
      localStorage.removeItem('payment_auto_reload');
    }
  }, [searchParams]);

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
        title: '¡Pago Aprobado!',
          message: 'Tu pago ha sido procesado exitosamente.',
        icon: 'bi-check-circle-fill',
          color: 'success',
          bgColor: 'bg-success'
        };
      case 'pending':
        return {
        title: 'Pago Pendiente',
          message: 'Tu pago está siendo procesado. Te notificaremos cuando se complete.',
          icon: 'bi-clock-fill',
          color: 'warning',
          bgColor: 'bg-warning'
        };
      case 'rejected':
        return {
        title: 'Pago Rechazado',
          message: 'Tu pago fue rechazado. Por favor, intenta con otro método de pago.',
        icon: 'bi-x-circle-fill',
          color: 'danger',
          bgColor: 'bg-danger'
        };
      case 'in_process':
        return {
          title: 'Pago en Proceso',
          message: 'Tu pago está siendo revisado. Te notificaremos el resultado.',
        icon: 'bi-hourglass-split',
          color: 'info',
          bgColor: 'bg-info'
        };
      default:
        return {
          title: 'Estado Desconocido',
          message: 'No se pudo determinar el estado del pago.',
          icon: 'bi-question-circle-fill',
          color: 'secondary',
          bgColor: 'bg-secondary'
        };
    }
  };

  const handleContinueShopping = () => {
    navigate('/productos');
  };

  const handleViewOrders = () => {
    navigate('/profile');
  };

  const handleReloadPage = () => {
    cleanupMercadoPagoSDK();
    // Marcar que ya se recargó manualmente
    localStorage.setItem('payment_auto_reload', 'true');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="payment-result-page container py-5">
        <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Procesando resultado del pago...</p>
        </div>
      </div>
    );
  }

  if (!paymentResult) {
    return (
      <div className="payment-result-page container py-5">
        <div className="alert alert-danger">
          <h4>Error</h4>
          <p>No se encontró información del pago.</p>
          <button className="btn btn-primary" onClick={handleContinueShopping}>
            Continuar Comprando
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(paymentResult.status);

    return (
    <div className="payment-result-page container py-5">
          <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className={`card border-${statusInfo.color}`}>
            <div className={`card-header ${statusInfo.bgColor} text-white text-center`}>
              <i className={`bi ${statusInfo.icon} fs-1`}></i>
              <h3 className="mt-3 mb-0">{statusInfo.title}</h3>
            </div>
            <div className="card-body text-center">
              <p className="lead">{statusInfo.message}</p>
              
              <div className="alert alert-info mt-3">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Nota:</strong> La página se recargará automáticamente una vez para limpiar el estado del sistema de pagos y permitir nuevos pagos.
              </div>
              
              {paymentResult.payment_id && (
                <div className="alert alert-info">
                  <strong>ID de Pago:</strong> {paymentResult.payment_id}
                </div>
              )}
              
              {paymentResult.payment_method_id && (
                <div className="mb-3">
                  <strong>Método de Pago:</strong> {paymentResult.payment_method_id.toUpperCase()}
                </div>
              )}

              {paymentResult.installments && paymentResult.installments !== '1' && (
                <div className="mb-3">
                  <strong>Cuotas:</strong> {paymentResult.installments}
                </div>
              )}

              {paymentResult.status_detail && (
                <div className="alert alert-secondary">
                  <strong>Detalle:</strong> {paymentResult.status_detail}
                  </div>
                )}

              <div className="d-grid gap-2 d-md-flex justify-content-md-center mt-4">
                <button 
                  className="btn btn-primary me-md-2" 
                  onClick={handleContinueShopping}
                >
                  <i className="bi bi-cart-plus me-2"></i>
                  Continuar Comprando
                </button>
                <button 
                  className="btn btn-outline-secondary me-md-2" 
                  onClick={handleViewOrders}
                >
                      <i className="bi bi-person me-2"></i>
                  Ver Mis Pedidos
                </button>
                <button 
                  className="btn btn-outline-warning" 
                  onClick={handleReloadPage}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Recargar Página
                </button>
              </div>
            </div>
          </div>

          {/* Información de depuración */}
          <div className="mt-4">
            <details>
              <summary className="text-muted">Información Técnica</summary>
              <pre className="mt-2 p-3 bg-light rounded" style={{fontSize: '0.8em'}}>
                {JSON.stringify(paymentResult, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage; 