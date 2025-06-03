import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './CartPage.css';

// Datos de ejemplo
const mockCart = {
  items: [
    {
      product: {
        _id: '1',
        name: 'Nintendo Switch OLED',
        price: 299.99,
        oldPrice: 349.99,
        image: 'https://t4.ftcdn.net/jpg/02/96/39/29/360_F_296392948_f60DmguQMYKrj937BNiLYGlcYbxIqn3L.jpg',
        store: 'Nintendo Store',
        shipping: 'Envío gratis'
      },
      quantity: 1
    },
    {
      product: {
        _id: '2',
        name: 'PlayStation 5',
        price: 499.99,
        oldPrice: 599.99,
        image: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21',
        store: 'Sony Store',
        shipping: 'Envío gratis'
      },
      quantity: 1
    }
  ],
  total: 799.98
};

const CartPage = () => {
  const [cart, setCart] = useState(mockCart);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart => {
      const updatedItems = prevCart.items.map(item => {
        if (item.product._id === productId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });

      const newTotal = updatedItems.reduce((total, item) => 
        total + (item.product.price * item.quantity), 0);

      return {
        items: updatedItems,
        total: newTotal
      };
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prevCart => {
      const updatedItems = prevCart.items.filter(
        item => item.product._id !== productId
      );

      const newTotal = updatedItems.reduce((total, item) => 
        total + (item.product.price * item.quantity), 0);

      return {
        items: updatedItems,
        total: newTotal
      };
    });
    setSelectedItems(prev => prev.filter(id => id !== productId));
  };

  const handleClearCart = () => {
    setCart({
      items: [],
      total: 0
    });
    setSelectedItems([]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cart.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cart.items.map(item => item.product._id));
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

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-container">
        <div className="container">
          <div className="empty-cart text-center">
            <i className="bi bi-box-seam display-1 text-muted"></i>
            <h2 className="mt-3">Tu Box está vacío</h2>
            <p className="text-muted">¡Agrega algunos productos para comenzar!</p>
            <Link to="/productos" className="btn btn-primary mt-3">
              <i className="bi bi-shop me-2"></i>
              Ver Productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="container">
        <div className="row">
          {/* Columna izquierda - Lista de productos */}
          <div className="col-lg-8">
            <div className="cart-section">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="cart-title">BOX ({cart.items.length})</h2>
                <div className="d-flex align-items-center">
                  <div 
                    className={`custom-checkbox ${selectedItems.length === cart.items.length ? 'checked' : ''}`}
                    onClick={toggleSelectAll}
                  ></div>
                  <span>Seleccionar todos</span>
                </div>
              </div>

              <div className="promo-banner">
                <i className="bi bi-lightning-fill me-2"></i>
                ChoiceDay: ¡Descuentos especiales en productos seleccionados!
              </div>

              {cart.items.map((item) => (
                <div key={item.product._id} className="cart-item">
                  <div className="row g-0">
                    <div className="col-md-2">
                      <div 
                        className={`custom-checkbox ${selectedItems.includes(item.product._id) ? 'checked' : ''}`}
                        onClick={() => toggleSelectItem(item.product._id)}
                      ></div>
                      <img
                        src={item.product.image}
                        className="product-image"
                        alt={item.product.name}
                      />
                    </div>
                    <div className="col-md-10">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="product-name">{item.product.name}</h5>
                            <div className="d-flex align-items-center">
                              <span className="product-price">${item.product.price.toFixed(2)}</span>
                              <span className="product-old-price">${item.product.oldPrice.toFixed(2)}</span>
                            </div>
                            <div className="store-name">{item.product.store}</div>
                            <div className="shipping-info">
                              <i className="bi bi-truck me-1"></i>
                              {item.product.shipping}
                            </div>
                          </div>
                          <div className="action-icons">
                            <i className="bi bi-heart action-icon"></i>
                            <i 
                              className="bi bi-trash action-icon"
                              onClick={() => handleRemoveItem(item.product._id)}
                            ></i>
                          </div>
                        </div>
                        <div className="d-flex align-items-center mt-3">
                          <div className="quantity-controls">
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleUpdateQuantity(item.product._id, item.quantity - 1)}
                            >
                              <i className="bi bi-dash"></i>
                            </button>
                            <span className="mx-3">{item.quantity}</span>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleUpdateQuantity(item.product._id, item.quantity + 1)}
                            >
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                          <div className="ms-auto">
                            <strong>
                              Total: ${(item.product.price * item.quantity).toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha - Resumen */}
          <div className="col-lg-4">
            <div className="summary-section">
              <h3 className="summary-title">Resumen del pedido</h3>
              
              <div className="summary-row">
                <span>Subtotal ({cart.items.length} artículos)</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Envío</span>
                <span>Gratis</span>
              </div>
              <div className="summary-row">
                <span>Impuestos</span>
                <span>${(cart.total * 0.19).toFixed(2)}</span>
              </div>
              
              <div className="summary-total">
                <div className="summary-row">
                  <span>Total</span>
                  <span>${(cart.total * 1.19).toFixed(2)}</span>
                </div>
              </div>

              <button className="continue-button">
                Continuar ({selectedItems.length})
              </button>

              <div className="security-section">
                <div className="security-item">
                  <i className="bi bi-shield-check"></i>
                  Pagos seguros y rápidos
                </div>
                <div className="security-item">
                  <i className="bi bi-shield-check"></i>
                  Productos 100% garantizados
                </div>
                <div className="security-item">
                  <i className="bi bi-shield-check"></i>
                  Seguridad y privacidad garantizada
                </div>
                <div className="security-item">
                  <i className="bi bi-credit-card"></i>
                  Pagos 100% seguros
                </div>
              </div>

              <div className="payment-methods">
                <div className="payment-method">Visa</div>
                <div className="payment-method">MC</div>
                <div className="payment-method">JCB</div>
                <div className="payment-method">AMEX</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage; 