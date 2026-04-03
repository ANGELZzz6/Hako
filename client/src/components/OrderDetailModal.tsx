import React from 'react';
import type { Order } from '../types/order';
import './OrderDetailModal.css';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado',
  ready_for_pickup: 'Listo para recoger',
  picked_up: 'Recogido',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'warning',
  paid: 'primary',
  ready_for_pickup: 'info',
  picked_up: 'success',
  cancelled: 'danger',
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="modal fade show d-block order-detail-modal" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-lg admin-dashboard">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-receipt me-2"></i>
              Detalles del Pedido #{order._id.slice(-6).toUpperCase()}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          
          <div className="modal-body">
            {/* Secciones de Información */}
            <div className="info-grid">
              <section className="info-section customer-info">
                <h6><i className="bi bi-person me-2"></i>Información del Cliente</h6>
                <div className="info-item">
                  <span className="label">Nombre:</span>
                  <span className="value">{(order.user && typeof order.user === 'object') ? (order.user as any).nombre : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email:</span>
                  <span className="value">{(order.user && typeof order.user === 'object') ? (order.user as any).email : 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Creado:</span>
                  <span className="value">{new Date(order.createdAt).toLocaleString('es-CO')}</span>
                </div>
                <div className="info-item">
                  <span className="label">Estado:</span>
                  <span className={`badge bg-${statusColors[order.status]} status-pill`}>
                    {statusLabels[order.status]}
                  </span>
                </div>
              </section>

              <section className="info-section payment-info">
                <h6><i className="bi bi-credit-card me-2"></i>Detalles de Pago</h6>
                <div className="info-item">
                  <span className="label">Total a Pagar:</span>
                  <span className="value total-amount">${order.total_amount.toLocaleString('es-CO')}</span>
                </div>
                <div className="info-item">
                  <span className="label">Método:</span>
                  <span className="value">{order.payment?.method || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">ID Mercado Pago:</span>
                  <span className="value mp-id">{order.payment?.mp_payment_id || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Referencia Externa:</span>
                  <span className="value ref-id">{order.external_reference || 'N/A'}</span>
                </div>
              </section>
            </div>

            <hr className="my-4" />

            {/* Tabla de Productos */}
            <section className="products-section">
              <h6><i className="bi bi-box-seam me-2"></i>Productos del Pedido</h6>
              <div className="products-table-wrapper">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>P. Unitario</th>
                      <th>Subtotal</th>
                      <th>Recogido</th>
                      <th>Casillero</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td data-label="Producto">
                          <div className="product-cell">
                            <img 
                              src={item.product?.imagen_url || ''} 
                              alt={item.product?.nombre || 'Producto'} 
                              className="product-thumb"
                            />
                            <span className="product-name-text">{item.product?.nombre || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td data-label="Cant.">{item.quantity}</td>
                        <td data-label="P. Unitario">${item.unit_price.toLocaleString('es-CO')}</td>
                        <td data-label="Subtotal" className="fw-bold">${item.total_price.toLocaleString('es-CO')}</td>
                        <td data-label="Recogido">
                          <span className={`claimed-badge ${item.claimed_quantity ? 'has-claimed' : ''}`}>
                            {item.claimed_quantity || 0} / {item.quantity}
                          </span>
                        </td>
                        <td data-label="Casillero">
                          {item.assigned_locker ? (
                            <span className="locker-badge">{item.assigned_locker}</span>
                          ) : (
                            <span className="text-muted">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary close-modal-btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
