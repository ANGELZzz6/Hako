import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './OrderConfirmationPage.css';

interface OrderData {
  items: any[];
  total: number;
  customerInfo: {
    nombre: string;
    email: string;
    telefono: string;
  };
  metodoPago: string;
}

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, orderData } = location.state as { orderId: string; orderData: OrderData } || {};

  if (!orderId || !orderData) {
    return (
      <div className="confirmation-container">
        <div className="container">
          <div className="text-center py-5">
            <i className="bi bi-exclamation-triangle display-1 text-warning"></i>
            <h2>Orden no encontrada</h2>
            <p>No se encontró información de la orden.</p>
            <Link to="/productos" className="btn btn-primary">
              Ver Productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="confirmation-card">
              {/* Header de confirmación */}
              <div className="confirmation-header">
                <div className="success-icon">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <h1>¡Pedido Confirmado!</h1>
                <p className="order-id">Orden #{orderId}</p>
                <p className="confirmation-message">
                  Gracias por tu compra. Hemos recibido tu pedido y te enviaremos una confirmación por email.
                </p>
              </div>

              {/* Información del pedido */}
              <div className="order-details">
                <h3>Detalles del Pedido</h3>
                
                <div className="order-items">
                  {orderData.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-image">
                        <img
                          src={item.imagen_producto}
                          alt={item.nombre_producto}
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/60x60?text=Sin+Imagen';
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

                <div className="order-total">
                  <div className="total-line">
                    <span>Subtotal:</span>
                    <span>${orderData.total.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="total-line">
                    <span>Envío:</span>
                    <span>Gratis</span>
                  </div>
                  <div className="total-line final-total">
                    <span>Total:</span>
                    <span>${orderData.total.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>

              {/* Información del cliente */}
              <div className="customer-info">
                <h3>Información del Cliente</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Nombre:</strong>
                    <span>{orderData.customerInfo.nombre}</span>
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong>
                    <span>{orderData.customerInfo.email}</span>
                  </div>
                  <div className="info-item">
                    <strong>Teléfono:</strong>
                    <span>{orderData.customerInfo.telefono}</span>
                  </div>
                </div>
              </div>

              {/* Método de pago */}
              <div className="payment-info">
                <h3>Método de Pago</h3>
                <div className="payment-method">
                  <i className={`bi bi-${getPaymentIcon(orderData.metodoPago)}`}></i>
                  <span>{getPaymentText(orderData.metodoPago)}</span>
                </div>
              </div>

              {/* Próximos pasos */}
              <div className="next-steps">
                <h3>Próximos Pasos</h3>
                <div className="steps-list">
                  <div className="step">
                    <div className="step-icon">
                      <i className="bi bi-envelope"></i>
                    </div>
                    <div className="step-content">
                      <h6>Confirmación por Email</h6>
                      <p>Recibirás una confirmación detallada en tu email en los próximos minutos.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-icon">
                      <i className="bi bi-truck"></i>
                    </div>
                    <div className="step-content">
                      <h6>Preparación y Envío</h6>
                      <p>Tu pedido será preparado y enviado en 1-2 días hábiles.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-icon">
                      <i className="bi bi-box-seam"></i>
                    </div>
                    <div className="step-content">
                      <h6>Entrega</h6>
                      <p>Recibirás tu pedido en la dirección especificada en 3-5 días hábiles.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="action-buttons">
                <Link to="/productos" className="btn btn-primary">
                  <i className="bi bi-shop me-2"></i>
                  Seguir Comprando
                </Link>
                <Link to="/profile" className="btn btn-outline-primary">
                  <i className="bi bi-person me-2"></i>
                  Ver Mi Perfil
                </Link>
              </div>

              {/* Información de contacto */}
              <div className="contact-info">
                <h4>¿Tienes preguntas?</h4>
                <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos:</p>
                <div className="contact-methods">
                  <div className="contact-method">
                    <i className="bi bi-envelope"></i>
                    <span>contacto@hako.com</span>
                  </div>
                  <div className="contact-method">
                    <i className="bi bi-telephone"></i>
                    <span>(123) 456-7890</span>
                  </div>
                  <div className="contact-method">
                    <i className="bi bi-chat-dots"></i>
                    <span>Chat en vivo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getPaymentIcon = (method: string): string => {
  switch (method) {
    case 'tarjeta':
      return 'credit-card';
    case 'efectivo':
      return 'cash';
    case 'transferencia':
      return 'bank';
    default:
      return 'credit-card';
  }
};

const getPaymentText = (method: string): string => {
  switch (method) {
    case 'tarjeta':
      return 'Tarjeta de Crédito/Débito';
    case 'efectivo':
      return 'Efectivo contra entrega';
    case 'transferencia':
      return 'Transferencia bancaria';
    default:
      return 'Método de pago';
  }
};

export default OrderConfirmationPage; 