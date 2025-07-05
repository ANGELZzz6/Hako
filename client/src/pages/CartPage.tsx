import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import cartService, { type Cart, type CartItem } from '../services/cartService';
import paymentService from '../services/paymentService';
import './CartPage.css';

const CartPage = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  // Cargar el carrito
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadCart();
  }, [isAuthenticated, navigate]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Error al cargar el box:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      setUpdating(productId);
      const updatedCart = await cartService.updateCartItem(productId, newQuantity);
      setCart(updatedCart);
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      alert('Error al actualizar la cantidad');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto del box?')) {
      return;
    }

    try {
      setUpdating(productId);
      const updatedCart = await cartService.removeFromCart(productId);
      setCart(updatedCart);
      setSelectedItems(prev => prev.filter(id => id !== productId));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('¿Estás seguro de que quieres vaciar todo el box?')) {
      return;
    }

    try {
      const updatedCart = await cartService.clearCart();
      setCart(updatedCart);
      setSelectedItems([]);
    } catch (error) {
      console.error('Error al vaciar box:', error);
      alert('Error al vaciar el box');
    }
  };

  const toggleSelectAll = () => {
    if (!cart) return;
    
    if (selectedItems.length === cart.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.items.map(item => item.id_producto._id));
    }
  };

  const toggleSelectItem = (productId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const getSelectedTotal = () => {
    if (!cart) return 0;
    
    return cart.items
      .filter(item => selectedItems.includes(item.id_producto._id))
      .reduce((total, item) => total + (item.precio_unitario * item.cantidad), 0);
  };

  const handleProcessPayment = async () => {
    if (!currentUser) {
      alert('Debes estar logueado para realizar el pago');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Selecciona al menos un producto para proceder al pago.');
      return;
    }
    try {
      setProcessing(true);
      const items = cart!.items
        .filter(item => selectedItems.includes(item.id_producto._id))
        .map(item => ({
          id: item.id_producto._id, // Incluir el ID del producto
          title: item.nombre_producto,
          quantity: item.cantidad,
          unit_price: item.precio_unitario,
          picture_url: item.imagen_producto
        }));
      navigate('/checkout', { state: { items, payer: {
        email: currentUser.email,
        name: currentUser.nombre || 'Nombre',
        surname: '',
        identification: { type: 'CC', number: '12345678' }
      } } });
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Error al procesar el pago. Por favor intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="cart-container cart-page">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3 text-white">Cargando tu box...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-container cart-page">
        <div className="container">
          <div className="empty-cart">
            <i className="bi bi-box-seam display-1"></i>
            <h2>Tu Box está vacío</h2>
            <p>¡Agrega algunos productos para comenzar!</p>
            <Link to="/productos" className="btn btn-primary">
              <i className="bi bi-shop me-2"></i>
              Ver Productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container cart-page">
      <div className="container">
        <div className="row">
          {/* Columna izquierda - Lista de productos */}
          <div className="col-lg-8">
            <div className="cart-section">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="cart-title">MI BOX ({cart.items.length})</h2>
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className={`custom-checkbox ${selectedItems.length === cart.items.length ? 'checked' : ''}`}
                    onClick={toggleSelectAll}
                  ></div>
                  <span className="text-dark">Seleccionar todos</span>
                </div>
              </div>

              <div className="promo-banner">
                <i className="bi bi-lightning-fill me-2"></i>
                ¡Descuentos especiales en productos seleccionados!
              </div>

              {cart.items.map((item) => (
                <div key={item.id_producto._id} className="cart-item">
                  <div className="row g-0">
                    <div className="col-md-2">
                      <div 
                        className={`custom-checkbox ${selectedItems.includes(item.id_producto._id) ? 'checked' : ''}`}
                        onClick={() => toggleSelectItem(item.id_producto._id)}
                      ></div>
                      <img
                        src={item.imagen_producto}
                        className="product-image"
                        alt={item.nombre_producto}
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/100x100?text=Sin+Imagen';
                        }}
                      />
                    </div>
                    <div className="col-md-10">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="product-name">{item.nombre_producto}</h5>
                            {item.variants && Object.keys(item.variants).length > 0 && (
                              <div className="cart-variants mb-2">
                                {Object.entries(item.variants).map(([attr, value]) => (
                                  <span key={attr} className="badge bg-info text-dark me-2 mb-1" style={{fontSize: '0.95em'}}>
                                    {attr}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="d-flex align-items-center">
                              <span className="product-price">
                                ${item.precio_unitario.toLocaleString('es-CO')}
                              </span>
                            </div>
                          </div>
                          <div className="action-icons">
                            <i 
                              className="bi bi-trash action-icon"
                              onClick={() => handleRemoveItem(item.id_producto._id)}
                              title="Eliminar producto"
                            ></i>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between mt-3">
                          <div className="quantity-controls">
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => handleUpdateQuantity(item.id_producto._id, item.cantidad - 1)}
                              disabled={updating === item.id_producto._id || item.cantidad <= 1}
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <span>
                              {updating === item.id_producto._id ? (
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Actualizando...</span>
                                </div>
                              ) : (
                                item.cantidad
                              )}
                            </span>
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => handleUpdateQuantity(item.id_producto._id, item.cantidad + 1)}
                              disabled={updating === item.id_producto._id}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                          <div className="text-end">
                            <strong className="product-price">
                              Total: ${(item.precio_unitario * item.cantidad).toLocaleString('es-CO')}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="d-flex justify-content-between align-items-center mt-4">
                <button 
                  className="btn btn-outline-danger"
                  onClick={handleClearCart}
                >
                  <i className="bi bi-trash me-2"></i>
                  Vaciar Box
                </button>
                <Link to="/productos" className="btn btn-outline-primary">
                  <i className="bi bi-shop me-2"></i>
                  Seguir Comprando
                </Link>
              </div>
            </div>
          </div>

          {/* Columna derecha - Resumen */}
          <div className="col-lg-4">
            <div className="cart-summary">
              <h4 className="summary-title">Resumen del Box</h4>
              
              <div className="summary-item total">
                <span>Total:</span>
                <span>${getSelectedTotal().toLocaleString('es-CO')}</span>
              </div>

              {selectedItems.length > 0 && (
                <div className="selected-summary custom-selected-summary">
                  <div className="summary-item mb-2">
                    <span>Seleccionados ({selectedItems.length}):</span>
                    <span>${getSelectedTotal().toLocaleString('es-CO')}</span>
                  </div>
                  <div className="selected-products-list mt-2">
                    <ul className="list-group">
                      {cart.items.filter(item => selectedItems.includes(item.id_producto._id)).map(item => (
                        <li key={item.id_producto._id} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>
                            <strong>{item.nombre_producto}</strong> x{item.cantidad}
                          </span>
                          <span>${(item.precio_unitario * item.cantidad).toLocaleString('es-CO')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button 
                className="btn btn-primary w-100 mt-4" 
                disabled={selectedItems.length === 0 || processing}
                onClick={handleProcessPayment}
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
                    <i className="bi bi-credit-card me-2"></i>
                    Proceder al Pago - ${getSelectedTotal().toLocaleString('es-CO')}
                  </>
                )}
              </button>

              <div className="secure-info">
                <i className="bi bi-shield-check text-success me-2"></i>
                <small className="text-muted">
                  Pago seguro con encriptación SSL
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage; 