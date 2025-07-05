import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import paymentService from '../services/paymentService';
import type { MPItem, MPPayer } from '../services/paymentService';
import cartService from '../services/cartService';
import './CheckoutPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const PUBLIC_KEY = 'TEST-6c5eb3a1-e6be-46ef-a350-afa2bf222252'; // Llave pública de prueba

function loadMercadoPagoSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).MercadoPago) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
    document.body.appendChild(script);
  });
}

type PaymentMethod = 'card' | 'pse' | 'efecty';

const CheckoutPage = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const cardFormRef = useRef<HTMLDivElement>(null);
  const moneyFormRef = useRef<HTMLDivElement>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { items, payer } = location.state || {};
  const { currentUser, isAuthenticated } = useAuth();
  const { refreshCart } = useCart();

  // Función para eliminar productos comprados del carrito
  const removePurchasedItems = async (purchasedItems: MPItem[]) => {
    try {
      const productIds = purchasedItems.map(item => item.id).filter((id): id is string => !!id); // Filtrar IDs válidos
      if (productIds.length === 0) {
        console.log('No hay productos para eliminar del carrito');
        return;
      }
      console.log('Eliminando productos comprados:', productIds);
      await cartService.removeMultipleItems(productIds);
      await refreshCart(); // Actualizar el carrito en el contexto
      console.log('Productos eliminados del carrito exitosamente');
    } catch (error) {
      console.error('Error al eliminar productos del carrito:', error);
    }
  };

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!items || !payer) {
      navigate('/cart');
      return;
    }

    (async () => {
      setError(null);
      console.log('CheckoutPage: items', items);
      console.log('CheckoutPage: payer', payer);
      try {
        await loadMercadoPagoSdk();
        (window as any).mp = new (window as any).MercadoPago(PUBLIC_KEY, { 
          locale: 'es-CO',
          advancedFraudPrevention: false
        });
        handleCreatePreference();
      } catch (err) {
        setError('No se pudo cargar el SDK de Mercado Pago');
      }
    })();
    // eslint-disable-next-line
  }, [isAuthenticated, items, payer, navigate]);

  useEffect(() => {
    if (preferenceId && (window as any).mp && items && selectedMethod) {
      try {
        const amount = items.reduce((acc: number, item: MPItem) => acc + item.unit_price * item.quantity, 0);
        const bricks = (window as any).mp.bricks();

        if (selectedMethod === 'card') {
          // Brick de tarjeta
          bricks.create('cardPayment', 'cardFormContainer', {
            initialization: {
              amount: amount,
              preferenceId: preferenceId
            },
            callbacks: {
              onReady: () => { 
                console.log('Brick de tarjeta listo');
                setError(null);
              },
              onSubmit: async (cardFormData: any) => {
                setLoading(true);
                setError(null);
                console.log('Datos del formulario de tarjeta:', cardFormData);
                try {
                  // Usar endpoint de prueba temporalmente
                  const paymentResult = await paymentService.testProcessPayment({
                    token: cardFormData.token,
                    issuer_id: cardFormData.issuer_id,
                    payment_method_id: cardFormData.payment_method_id,
                    installments: cardFormData.installments,
                    transaction_amount: cardFormData.transaction_amount,
                    description: 'Pago desde Hako',
                    payer: payer
                  });
                  
                  console.log('Resultado del pago procesado:', paymentResult);
                  
                  // Si el pago fue exitoso, eliminar los productos del carrito
                  if (paymentResult.status === 'approved') {
                    console.log('Pago aprobado, eliminando productos del carrito...');
                    await removePurchasedItems(items);
                  }
                  
                  const paymentData = {
                    status: paymentResult.status,
                    payment_id: paymentResult.id,
                    preference_id: preferenceId,
                    payment_method_id: cardFormData.payment_method_id || 'card',
                    installments: cardFormData.installments || '1',
                    issuer_id: cardFormData.issuer_id || '',
                    status_detail: paymentResult.status_detail
                  };
                  
                  const filteredData = Object.fromEntries(
                    Object.entries(paymentData).filter(([_, value]) => value !== undefined && value !== null)
                  );
                  
                  const params = new URLSearchParams(filteredData);
                  navigate(`/payment-result?${params.toString()}`);
                } catch (err: any) {
                  console.error('Error procesando el pago:', err);
                  setError('Error procesando el pago. Por favor, intenta nuevamente.');
                } finally {
                  setLoading(false);
                }
              },
              onError: (error: any) => {
                setError('Error en el formulario de tarjeta.');
                console.error('Error en el Brick de tarjeta:', error);
              }
            }
          });
        } else if (selectedMethod === 'efecty') {
          // Brick de efectivo (Efecty)
          bricks.create('money', 'moneyFormContainer', {
            initialization: {
              amount: amount,
              preferenceId: preferenceId
            },
            callbacks: {
              onReady: () => { 
                console.log('Brick de efectivo listo');
                setError(null);
              },
              onSubmit: async (moneyData: any) => {
                setLoading(true);
                setError(null);
                try {
                  // Para pagos en efectivo, también eliminar productos del carrito
                  // ya que el usuario se compromete a pagar
                  console.log('Pago en efectivo iniciado, eliminando productos del carrito...');
                  await removePurchasedItems(items);
                  
                  // Para pagos en efectivo, redirigir a la página de resultado
                  const paymentData = {
                    status: 'pending',
                    payment_method_id: 'efecty',
                    preference_id: preferenceId
                  };
                  
                  const params = new URLSearchParams(paymentData);
                  navigate(`/payment-result?${params.toString()}`);
                } catch (err: any) {
                  setError('Error procesando el pago.');
                } finally {
                  setLoading(false);
                }
              },
              onError: (error: any) => {
                setError('Error en el formulario de efectivo.');
                console.error('Error en el Brick de efectivo:', error);
              }
            }
          });
        }
      } catch (err) {
        setError('Error al montar el formulario de pago.');
        console.error('Error al montar el Brick:', err);
      }
    }
  }, [preferenceId, navigate, items, selectedMethod, payer]);

  // Limpiar el SDK cuando se desmonte el componente
  useEffect(() => {
    return () => {
      cleanupMercadoPagoSDK();
    };
  }, []);

  const handleCreatePreference = async () => {
    setLoading(true);
    setError(null);
    try {
      const pref = await paymentService.createPreference(items, payer);
      setPreferenceId(pref.id);
    } catch (err: any) {
      setError('No se pudo crear la preferencia de pago.');
    } finally {
      setLoading(false);
    }
  };

  const handlePSEPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Para PSE, redirigir a Mercado Pago directamente
      if (preferenceId) {
        window.location.href = `https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=${preferenceId}`;
      }
    } catch (err: any) {
      setError('Error procesando el pago PSE.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMethods = () => {
    setSelectedMethod(null);
    setError(null);
  };

  return (
    <div className="checkout-page container py-5">
      <h2>Método de Pago</h2>
      {(!items || !payer) && <div className="alert alert-warning">No hay productos para pagar.</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!selectedMethod && (
        <div className="payment-methods-selection">
          <h4>Elige tu método de pago:</h4>
          <div className="row mt-3">
            <div className="col-md-4">
              <div className="card payment-method-card" onClick={() => setSelectedMethod('card')}>
                <div className="card-body text-center">
                  <i className="bi bi-credit-card-2-front fs-1 text-primary"></i>
                  <h5 className="mt-2">Tarjeta de Crédito/Débito</h5>
                  <p className="text-muted">Visa, Mastercard, American Express, etc.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card payment-method-card" onClick={() => setSelectedMethod('pse')}>
                <div className="card-body text-center">
                  <i className="bi bi-bank fs-1 text-success"></i>
                  <h5 className="mt-2">PSE</h5>
                  <p className="text-muted">Pagos Seguros en Línea</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card payment-method-card" onClick={() => setSelectedMethod('efecty')}>
                <div className="card-body text-center">
                  <i className="bi bi-cash-coin fs-1 text-warning"></i>
                  <h5 className="mt-2">Efecty</h5>
                  <p className="text-muted">Pago en efectivo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMethod === 'card' && (
        <div>
          <button className="btn btn-outline-secondary mb-3" onClick={handleBackToMethods}>
            <i className="bi bi-arrow-left me-2"></i>Cambiar método
          </button>
          <div id="cardFormContainer" ref={cardFormRef} style={{ minHeight: '200px' }}></div>
            </div>
          )}
          
      {selectedMethod === 'efecty' && (
        <div>
          <button className="btn btn-outline-secondary mb-3" onClick={handleBackToMethods}>
            <i className="bi bi-arrow-left me-2"></i>Cambiar método
              </button>
          <div id="moneyFormContainer" ref={moneyFormRef} style={{ minHeight: '200px' }}></div>
        </div>
      )}

      {selectedMethod === 'pse' && (
        <div>
          <button className="btn btn-outline-secondary mb-3" onClick={handleBackToMethods}>
            <i className="bi bi-arrow-left me-2"></i>Cambiar método
          </button>
          <div className="card">
            <div className="card-body text-center">
              <i className="bi bi-bank fs-1 text-success mb-3"></i>
              <h4>Pago con PSE</h4>
              <p>Serás redirigido a tu banco para completar el pago de forma segura.</p>
              <button 
                className="btn btn-success btn-lg" 
                onClick={handlePSEPayment}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Pagar con PSE'}
              </button>
            </div>
          </div>
        </div>
      )}

      <pre style={{background:'#f8f9fa',padding:'1em',marginTop:'2em',fontSize:'0.9em'}}>
        Estado de depuración:
        {JSON.stringify({items, payer, preferenceId, selectedMethod, error}, null, 2)}
      </pre>
    </div>
  );
};

export default CheckoutPage; 