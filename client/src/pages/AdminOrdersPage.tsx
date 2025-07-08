import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import type { Order } from '../types/order';
import SimpleLockerStatus from '../components/SimpleLockerStatus';
import BinPackingStatus from '../components/BinPackingStatus';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado - Productos disponibles',
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

const statusOptions = [
  { value: 'pending', label: 'Pendiente de pago' },
  { value: 'paid', label: 'Pagado' },
  { value: 'ready_for_pickup', label: 'Listo para recoger' },
  { value: 'picked_up', label: 'Recogido' },
  { value: 'cancelled', label: 'Cancelado' },
];

const AdminOrdersPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await orderService.getAllOrders();
        setOrders(data);
      } catch (err: any) {
        setError('Error al cargar los pedidos');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated && isAdmin) fetchOrders();
  }, [isAuthenticated, isAdmin]);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      setUpdatingId(orderId);
      const updatedOrder = await orderService.updateOrderStatus(orderId, newStatus);
      setOrders(orders => orders.map(o => o._id === orderId ? updatedOrder : o));
    } catch (err: any) {
      alert('Error al actualizar el estado del pedido: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres borrar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingId(orderId);
      await orderService.deleteOrder(orderId);
      setOrders(orders => orders.filter(o => o._id !== orderId));
      alert('Pedido borrado exitosamente');
    } catch (err: any) {
      alert('Error al borrar el pedido: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleReleaseLocker = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres liberar el casillero de este pedido?')) {
      return;
    }

    try {
      setUpdatingId(orderId);
      const result = await orderService.releaseLocker(orderId);
      setOrders(orders => orders.map(o => o._id === orderId ? result.order : o));
      alert('Casillero liberado exitosamente');
    } catch (err: any) {
      alert('Error al liberar el casillero: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-clipboard-check header-icon"></i>
            <span className="header-title">Pedidos</span>
          </div>
          <div className="header-center">
            <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
          </div>
          <div className="header-right">
            <a href="/admin" className="back-link">
              <i className="bi bi-arrow-left-circle header-icon"></i>
            </a>
          </div>
        </div>
      </header>
      <main className="admin-main-content">
        <div className="container">
          <h2 className="mb-4 text-center">Gestión de Pedidos</h2>
          
          {/* Vista simple de estado de casilleros */}
          <SimpleLockerStatus orders={orders} />
          
          {/* Vista de Bin Packing 3D */}
          <BinPackingStatus orders={orders} />
          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center">{error}</div>
          ) : orders.length === 0 ? (
            <div className="alert alert-info text-center">No hay pedidos aún.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Productos Reclamados</th>
                    <th>Casilleros</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order._id}>
                      <td>{new Date(order.createdAt).toLocaleString('es-CO')}</td>
                      <td>
                        {typeof order.user === 'object' ? order.user.nombre : 'N/A'}<br />
                        <small>{typeof order.user === 'object' ? order.user.email : 'N/A'}</small>
                      </td>
                      <td>
                        <ul className="list-unstyled mb-0">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="d-flex align-items-center gap-2 mb-1">
                              <img 
                                src={item.product.imagen_url} 
                                alt={item.product.nombre} 
                                style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} 
                              />
                              <span>{item.product.nombre}</span>
                              <span className="badge bg-secondary ms-2">x{item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>${order.total_amount.toLocaleString('es-CO')}</td>
                      <td>
                        <div className="small">
                          {order.items.map((item: any, idx: number) => {
                            const claimedQuantity = item.claimed_quantity || 0;
                            const totalQuantity = item.quantity;
                            const remainingQuantity = totalQuantity - claimedQuantity;
                            
                            return (
                              <div key={idx} className="mb-1">
                                <div className="d-flex justify-content-between">
                                  <span className="text-truncate" style={{ maxWidth: '80px' }}>
                                    {item.product.nombre}
                                  </span>
                                  <span className="badge bg-secondary">
                                    {claimedQuantity}/{totalQuantity}
                                  </span>
                                </div>
                                {remainingQuantity > 0 && (
                                  <small className="text-muted">
                                    {remainingQuantity} pendientes
                                  </small>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const assignedLockers = new Set();
                          order.items.forEach((item: any) => {
                            if (item.assigned_locker) {
                              assignedLockers.add(item.assigned_locker);
                            }
                          });
                          
                          if (assignedLockers.size > 0) {
                            return (
                              <div>
                                {Array.from(assignedLockers).map((lockerNum: any) => (
                                  <span key={lockerNum} className="badge bg-info me-1">
                                    Casillero {lockerNum}
                                  </span>
                                ))}
                              </div>
                            );
                          } else {
                            return <span className="text-muted">Sin asignar</span>;
                          }
                        })()}
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={order.status}
                          onChange={e => handleStatusChange(order._id, e.target.value as Order['status'])}
                          disabled={updatingId === order._id}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <span className={`badge bg-${statusColors[order.status]} text-white mt-1 d-block`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group-vertical btn-group-sm">
                          {(() => {
                            const hasAssignedLockers = order.items.some((item: any) => item.assigned_locker);
                            return hasAssignedLockers && order.status !== 'picked_up' ? (
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleReleaseLocker(order._id)}
                                disabled={updatingId === order._id}
                                title="Liberar casilleros"
                              >
                                <i className="bi bi-unlock"></i>
                              </button>
                            ) : null;
                          })()}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteOrder(order._id)}
                            disabled={deletingId === order._id}
                            title="Borrar pedido"
                          >
                            {deletingId === order._id ? (
                              <i className="bi bi-hourglass-split"></i>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminOrdersPage; 