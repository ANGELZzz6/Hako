import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import paymentService from '../services/paymentService';
import type { MPItem, MPPayer } from '../services/paymentService';
import cartService from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { initMercadoPago, createMercadoPagoInstance, validateMercadoPagoConfig } from '../config/mercadopago';

interface MercadoPagoCheckoutProps {
  onSuccess?: (paymentData: any) => void;
  onError?: (error: string) => void;
}

const MercadoPagoCheckout: React.FC<MercadoPagoCheckoutProps> = ({ 
  onSuccess, 
  onError 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { refreshCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MPItem[]>([]);
  const [payer, setPayer] = useState<MPPayer | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Cargar SDK de Mercado Pago
  useEffect(() => {
    const loadMercadoPagoSDK = async () => {
      try {
        // Validar configuración
        validateMercadoPagoConfig();
        
        // Inicializar SDK
        await initMercadoPago();
        setSdkLoaded(true);
      } catch (error) {
        console.error('Error cargando SDK:', error);
        setError('Error al cargar el SDK de Mercado Pago');
      }
    };

    loadMercadoPagoSDK();
  }, []);

  // Cargar datos del carrito
  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        console.log('=== CARGANDO DATOS DEL CHECKOUT ===');
        
        // Obtener productos seleccionados del estado de navegación
        const selectedItems = location.state?.items;
        const selectedPayer = location.state?.payer;
        
        console.log('Productos seleccionados recibidos:', selectedItems);
        console.log('Datos del pagador recibidos:', selectedPayer);
        
        if (!selectedItems || selectedItems.length === 0) {
          setError('No hay productos seleccionados para el pago');
          return;
        }

        // Usar los productos seleccionados directamente
        setItems(selectedItems);

        // Configurar datos del pagador
        if (selectedPayer) {
          setPayer(selectedPayer);
        } else if (currentUser) {
          setPayer({
            email: currentUser.email,
            name: currentUser.nombre || '',
            surname: '',
            identification: {
              type: 'CC',
              number: '12345678'
            }
          });
        }

      } catch (err) {
        console.error('Error cargando datos del checkout:', err);
        setError('Error al cargar los datos del carrito');
      }
    };

    if (sdkLoaded) {
      loadCheckoutData();
    }
  }, [currentUser, sdkLoaded, location.state]);

  // Crear preferencia cuando los datos estén listos
  useEffect(() => {
    const createPreference = async () => {
      if (!sdkLoaded || !items.length || !payer) return;

      try {
        setLoading(true);
        console.log('Creando preferencia de pago...');
        console.log('Productos a pagar:', items);
        
        const preference = await paymentService.createPreference(
          items, 
          payer, 
          `HAKO_${Date.now()}`,
          currentUser?.id,
          items // Enviar los productos que llegaron al checkout
        );

        console.log('Preferencia creada:', preference);
        setPreferenceId(preference.preference_id);
        setRedirectUrl(preference.init_point);
        
      } catch (err: any) {
        console.error('Error creando preferencia:', err);
        setError(err.message || 'Error al crear la preferencia de pago');
      } finally {
        setLoading(false);
      }
    };

    createPreference();
  }, [sdkLoaded, items, payer]);

  // Función para manejar el pago exitoso
  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      console.log('Pago exitoso:', paymentData);
      
      // Eliminar productos del carrito
      if (items.length > 0) {
        const productIds = items.map(item => item.id).filter((id): id is string => !!id);
        if (productIds.length > 0) {
          await cartService.removeMultipleItems(productIds);
          await refreshCart();
        }
      }

      // Llamar callback de éxito
      if (onSuccess) {
        onSuccess(paymentData);
      }

      // Redirigir a página de éxito
      navigate('/payment-success', { 
        state: { paymentData } 
      });

    } catch (error) {
      console.error('Error procesando pago exitoso:', error);
    }
  };

  // Función para manejar errores de pago
  const handlePaymentError = (error: string) => {
    console.error('Error en el pago:', error);
    setError(error);
    
    if (onError) {
      onError(error);
    }
  };

  // Función para redirigir a Checkout Pro
  const redirectToCheckout = () => {
    if (!redirectUrl) {
      setError('No se pudo obtener la URL de pago');
      return;
    }

    setRedirecting(true);
    setError(null);

    try {
      console.log('Redirigiendo a Checkout Pro...');
      console.log('URL:', redirectUrl);
      
      // Redirigir directamente usando la URL guardada
      window.location.href = redirectUrl;

    } catch (error) {
      console.error('Error redirigiendo a checkout:', error);
      setError('Error al redirigir al checkout');
      setRedirecting(false);
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.unit_price * (item.quantity || 1)), 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(price);
  };

  if (error && !items.length) {
    return (
      <div className="alert alert-danger">
        <h4>Error</h4>
        <p>{error}</p>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/cart')}
        >
          Volver al carrito
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3">Preparando el pago...</p>
      </div>
    );
  }

  return (
    <div className="mercadopago-checkout">
      {/* Resumen de la compra */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <h3>Resumen de la Compra</h3>
          {items.map((item, index) => (
            <div key={index} className="card mb-2">
              <div className="card-body py-2">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h6 className="mb-0">{item.title}</h6>
                    <small className="text-muted">
                      Cantidad: {item.quantity || 1} | 
                      Precio: {formatPrice(item.unit_price)}
                    </small>
                  </div>
                  <div className="col-md-4 text-end">
                    <strong>{formatPrice(item.unit_price * (item.quantity || 1))}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Total</h5>
            </div>
            <div className="card-body">
              <h4 className="text-primary mb-3">{formatPrice(calculateTotal())}</h4>
              
              {error && (
                <div className="alert alert-danger mb-3">
                  {error}
                </div>
              )}
              
              {redirectUrl && (
                <button
                  className="btn btn-success btn-lg w-100 mt-3"
                  onClick={redirectToCheckout}
                  disabled={redirecting}
                >
                  {redirecting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Redirigiendo...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-credit-card me-2"></i>
                      Pagar con Mercado Pago
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información del pagador */}
      {payer && (
        <div className="card">
          <div className="card-header">
            <h5>Información del Pagador</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <strong>Email:</strong> {payer.email}
              </div>
              <div className="col-md-4">
                <strong>Nombre:</strong> {payer.name} {payer.surname}
              </div>
              <div className="col-md-4">
                <strong>Documento:</strong> {payer.identification?.type} {payer.identification?.number}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs de depuración */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4">
          <details>
            <summary>Información de Depuración</summary>
            <pre className="bg-light p-3 mt-2 rounded small">
              {JSON.stringify({
                sdkLoaded,
                itemsCount: items.length,
                preferenceId,
                redirectUrl: redirectUrl ? redirectUrl.substring(0, 50) + '...' : null,
                total: calculateTotal(),
                error
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default MercadoPagoCheckout; 