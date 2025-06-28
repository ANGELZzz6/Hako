import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import cartService, { type Cart } from '../services/cartService';
import './CheckoutPage.css';

interface CheckoutForm {
  nombre: string;
  email: string;
  telefono: string;
  metodoPago: 'tarjeta' | 'efectivo' | 'transferencia';
}

const CheckoutPage = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<CheckoutForm>({
    nombre: '',
    email: '',
    telefono: '',
    metodoPago: 'tarjeta'
  });
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    loadCart();
    if (user) {
      setFormData(prev => ({
        ...prev,
        nombre: user.nombre || '',
        email: user.email || ''
      }));
    }
  }, [isAuthenticated, user, navigate, location]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      setCart(cartData);
      
      if (!cartData || cartData.items.length === 0) {
        navigate('/cart');
        return;
      }
    } catch (error) {
      console.error('Error al cargar el box:', error);
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cart) return;

    // Validaciones básicas
    if (!formData.nombre || !formData.email || !formData.telefono) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setProcessing(true);
      
      // Aquí iría la lógica de procesamiento del pago
      // Por ahora simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Crear la orden
      const orderData = {
        items: cart.items,
        total: cart.total,
        customerInfo: {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono
        },
        metodoPago: formData.metodoPago
      };

      // TODO: Implementar la creación de la orden en el backend
      console.log('Orden creada:', orderData);
      
      // Limpiar el carrito después del pago exitoso
      await cartService.clearCart();
      
      // Redirigir a página de confirmación
      navigate('/order-confirmation', { 
        state: { 
          orderId: 'ORD-' + Date.now(),
          orderData 
        } 
      });
      
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Error al procesar el pago. Por favor intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-container">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3">Preparando tu pedido...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="checkout-container">
        <div className="container">
          <div className="text-center py-5">
            <i className="bi bi-cart-x display-1 text-muted"></i>
            <h2>Tu Box está vacío</h2>
            <p>No puedes proceder al pago sin productos en tu box.</p>
            <button className="btn btn-primary" onClick={() => navigate('/productos')}>
              Ver Productos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="container">
        <div className="row">
          {/* Formulario de checkout */}
          <div className="col-lg-8">
            <div className="checkout-form-section">
              <h2 className="checkout-title">
                <i className="bi bi-credit-card me-2"></i>
                Información de Pago
              </h2>
              
              <form onSubmit={handleSubmit}>
                {/* Información personal */}
                <div className="form-section">
                  <h4>Información Personal</h4>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="nombre" className="form-label">Nombre completo *</label>
                      <input
                        type="text"
                        className="form-control"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="telefono" className="form-label">Teléfono *</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Método de pago */}
                <div className="form-section">
                  <h4>Método de Pago</h4>
                  <div className="payment-methods">
                    <div className="payment-method">
                      <input
                        type="radio"
                        id="tarjeta"
                        name="metodoPago"
                        value="tarjeta"
                        checked={formData.metodoPago === 'tarjeta'}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="tarjeta">
                        <i className="bi bi-credit-card"></i>
                        Tarjeta de Crédito/Débito
                      </label>
                    </div>
                    <div className="payment-method">
                      <input
                        type="radio"
                        id="efectivo"
                        name="metodoPago"
                        value="efectivo"
                        checked={formData.metodoPago === 'efectivo'}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="efectivo">
                        <i className="bi bi-cash"></i>
                        Efectivo contra entrega
                      </label>
                    </div>
                    <div className="payment-method">
                      <input
                        type="radio"
                        id="transferencia"
                        name="metodoPago"
                        value="transferencia"
                        checked={formData.metodoPago === 'transferencia'}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="transferencia">
                        <i className="bi bi-bank"></i>
                        Transferencia bancaria
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Procesando...</span>
                      </div>
                      Procesando Pago...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-lock me-2"></i>
                      Confirmar Pedido - ${cart.total.toLocaleString('es-CO')}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="col-lg-4">
            <div className="order-summary">
              <h4 className="summary-title">
                <i className="bi bi-box-seam me-2"></i>
                Resumen del Pedido
              </h4>
              
              <div className="order-items">
                {cart.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-image">
                      <img
                        src={item.imagen_producto}
                        alt={item.nombre_producto}
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/50x50?text=Sin+Imagen';
                        }}
                      />
                    </div>
                    <div className="item-details">
                      <h6>{item.nombre_producto}</h6>
                      <p>Cantidad: {item.cantidad}</p>
                      <span className="item-price">
                        ${(item.precio_unitario * item.cantidad).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="order-totals">
                <div className="total-line">
                  <span>Subtotal:</span>
                  <span>${cart.total.toLocaleString('es-CO')}</span>
                </div>
                <div className="total-line">
                  <span>Envío:</span>
                  <span>Gratis</span>
                </div>
                <div className="total-line total">
                  <span>Total:</span>
                  <span>${cart.total.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="security-info">
                <i className="bi bi-shield-check text-success me-2"></i>
                <small>Pago seguro con encriptación SSL</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage; 