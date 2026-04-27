import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import type { Order } from '../types/order';
import OrderDetailModal from '../components/OrderDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import './AdminOrdersPage.css';
import './AdminModalImprovements.css';

// Tipos para filtros y estadísticas
interface OrderFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
  minAmount: number;
  maxAmount: number;
}

interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  readyForPickup: number;
  pickedUp: number;
  cancelled: number;
  totalRevenue: number;
  averageOrderValue: number;
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

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente de pago' },
  { value: 'paid', label: 'Pagado' },
  { value: 'ready_for_pickup', label: 'Listo para recoger' },
  { value: 'picked_up', label: 'Recogido' },
  { value: 'cancelled', label: 'Cancelado' },
];

const AdminOrdersPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de filtros
  const [filters, setFilters] = useState<OrderFilters>({
    status: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
    minAmount: 0,
    maxAmount: 0,
  });
  
  // Estados de UI
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados para modal de detalles
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Estado para el modal de confirmación genérico
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type: 'confirm' | 'alert';
    variant: 'primary' | 'danger' | 'warning' | 'success' | 'info';
    confirmText?: string;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'alert',
    variant: 'primary'
  });

  // Función auxiliar para mostrar el modal de confirmación
  const showConfirm = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' | 'info' = 'primary', confirmText?: string) => {
    return new Promise<boolean>((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve(false);
        },
        type: 'confirm',
        variant,
        confirmText
      });
    });
  };

  // Función auxiliar para mostrar alertas no bloqueantes
  const showAlert = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' | 'info' = 'primary') => {
    return new Promise<void>((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve();
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve();
        },
        type: 'alert',
        variant,
      });
    });
  };

  // Verificar autenticación y permisos
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  // Cargar pedidos
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
    
    if (isAuthenticated && isAdmin) {
      fetchOrders();
    }
  }, [isAuthenticated, isAdmin]);

  // Filtrar y ordenar pedidos
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      // Filtro por estado
      if (filters.status && order.status !== filters.status) return false;
      
      // Filtro por fecha
      if (filters.dateFrom) {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(filters.dateFrom);
        if (orderDate < fromDate) return false;
      }
      
      if (filters.dateTo) {
        const orderDate = new Date(order.createdAt);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }
      
      // Filtro por término de búsqueda
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const orderId = order._id.toLowerCase();
        const userEmail = (order.user && typeof order.user === 'object') ? order.user.email.toLowerCase() : '';
        const userName = (order.user && typeof order.user === 'object') ? order.user.nombre.toLowerCase() : '';
        const productNames = order.items.map(item => item.product?.nombre?.toLowerCase() || '').join(' ');
        
        if (!orderId.includes(searchLower) && 
            !userEmail.includes(searchLower) && 
            !userName.includes(searchLower) && 
            !productNames.includes(searchLower)) {
          return false;
        }
      }
      
      // Filtro por monto
      if (filters.minAmount > 0 && order.total_amount < filters.minAmount) return false;
      if (filters.maxAmount > 0 && order.total_amount > filters.maxAmount) return false;
      
      return true;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'total_amount':
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'user':
          aValue = (a.user && typeof a.user === 'object') ? a.user.nombre : '';
          bValue = (b.user && typeof b.user === 'object') ? b.user.nombre : '';
          break;
        default:
          aValue = a[sortField as keyof Order];
          bValue = b[sortField as keyof Order];
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [orders, filters, sortField, sortDirection]);

  // Calcular estadísticas
  const stats: OrderStats = useMemo(() => {
    const stats = {
      total: filteredAndSortedOrders.length,
      pending: 0,
      paid: 0,
      readyForPickup: 0,
      pickedUp: 0,
      cancelled: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    };

    filteredAndSortedOrders.forEach(order => {
      stats[order.status as keyof OrderStats]++;
      if (order.status !== 'cancelled') {
        stats.totalRevenue += order.total_amount;
      }
    });

    if (stats.total > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.total;
    }

    return stats;
  }, [filteredAndSortedOrders]);

  // Paginación
  const totalPages = Math.ceil(filteredAndSortedOrders.length / ordersPerPage);
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  // Handlers
  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      setUpdatingId(orderId);
      const updatedOrder = await orderService.updateOrderStatus(orderId, newStatus);
      setOrders(orders => orders.map(o => o._id === orderId ? updatedOrder : o));
    } catch (err: any) {
      await showAlert('Error', 'Error al actualizar el estado del pedido: ' + err.message, 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = await showConfirm(
      'Confirmar Eliminación',
      'Esta acción eliminará la orden permanentemente. ¿Deseas continuar?',
      'danger',
      'Eliminar orden'
    );
    if (!confirmed) return;

    try {
      setDeletingId(orderId);
      await orderService.deleteOrder(orderId);
      setOrders(orders => orders.filter(o => o._id !== orderId));
      await showAlert('Éxito', 'Pedido borrado exitosamente', 'success');
    } catch (err: any) {
      await showAlert('Error', 'Error al borrar el pedido: ' + err.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReleaseLocker = async (orderId: string) => {
    const confirmed = await showConfirm(
      'Liberar Casillero',
      '¿Estás seguro de que quieres liberar el casillero de este pedido?',
      'warning',
      'Liberar'
    );
    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(orderId);
      const result = await orderService.releaseLocker(orderId);
      setOrders(orders => orders.map(o => o._id === orderId ? result.order : o));
      await showAlert('Éxito', 'Casillero liberado exitosamente', 'success');
    } catch (err: any) {
      await showAlert('Error', 'Error al liberar el casillero: ' + err.message, 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(order => order._id)));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkStatusChange = async (newStatus: Order['status']) => {
    if (selectedOrders.size === 0) {
      await showAlert('Atención', 'Por favor selecciona al menos un pedido', 'warning');
      return;
    }

    const confirmed = await showConfirm(
      'Cambio de Estado Masivo',
      `¿Estás seguro de que quieres cambiar el estado de ${selectedOrders.size} pedidos a "${statusLabels[newStatus]}"?`,
      'warning',
      'Cambiar estado'
    );
    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId('bulk');
      const promises = Array.from(selectedOrders).map(orderId => 
        orderService.updateOrderStatus(orderId, newStatus)
      );
      const updatedOrders = await Promise.all(promises);
      
      setOrders(orders => orders.map(order => {
        const updated = updatedOrders.find(u => u._id === order._id);
        return updated || order;
      }));
      
      setSelectedOrders(new Set());
      await showAlert('Éxito', `${selectedOrders.size} pedidos actualizados exitosamente`, 'success');
    } catch (err: any) {
      await showAlert('Error', 'Error al actualizar los pedidos: ' + err.message, 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Usuario', 'Email', 'Productos', 'Total', 'Estado', 'Fecha', 'Casilleros'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedOrders.map(order => [
        order._id,
        (order.user && typeof order.user === 'object') ? order.user.nombre : 'N/A',
        (order.user && typeof order.user === 'object') ? order.user.email : 'N/A',
        order.items.map(item => `${item.product?.nombre || 'Sin nombre'} (x${item.quantity})`).join('; '),
        order.total_amount,
        statusLabels[order.status],
        new Date(order.createdAt).toLocaleString('es-CO'),
        order.items.map(item => item.assigned_locker).filter(Boolean).join(', ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleShowOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
      minAmount: 0,
      maxAmount: 0,
    });
    setCurrentPage(1);
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-dashboard admin-orders-page" data-theme="light">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-clipboard-check header-icon"></i>
            <span className="header-title">Gestión de Pedidos</span>
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
        <div className="container-fluid">
          {/* Estadísticas */}
          <div className="row mb-4">
            <div className="col-md-2">
              <div className="card bg-primary text-white stats-card">
                <div className="card-body text-center">
                  <h5>{stats.total}</h5>
                  <small>Total Pedidos</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-warning text-white stats-card">
                <div className="card-body text-center">
                  <h5>{stats.pending}</h5>
                  <small>Pendientes</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-info text-white stats-card">
                <div className="card-body text-center">
                  <h5>{stats.readyForPickup}</h5>
                  <small>Listos</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-success text-white stats-card">
                <div className="card-body text-center">
                  <h5>{stats.pickedUp}</h5>
                  <small>Recogidos</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-danger text-white stats-card">
                <div className="card-body text-center">
                  <h5>{stats.cancelled}</h5>
                  <small>Cancelados</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-dark text-white stats-card">
                <div className="card-body text-center">
                  <h5>${stats.totalRevenue.toLocaleString('es-CO')}</h5>
                  <small>Ingresos</small>
                </div>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="row mb-3">
            <div className="col-md-8">
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <i className="bi bi-funnel"></i> Filtros
                </button>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={handleExportCSV}
                >
                  <i className="bi bi-download"></i> Exportar CSV
                </button>
                {selectedOrders.size > 0 && (
                  <div className="btn-group btn-group-sm bulk-actions">
                    <button
                      className="btn btn-outline-warning"
                      onClick={() => handleBulkStatusChange('ready_for_pickup')}
                      disabled={updatingId === 'bulk'}
                    >
                      Marcar como Listo
                    </button>
                    <button
                      className="btn btn-outline-success"
                      onClick={() => handleBulkStatusChange('picked_up')}
                      disabled={updatingId === 'bulk'}
                    >
                      Marcar como Recogido
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-4 text-end">
              <span className="text-muted pagination-info">
                Mostrando {((currentPage - 1) * ordersPerPage) + 1} - {Math.min(currentPage * ordersPerPage, filteredAndSortedOrders.length)} de {filteredAndSortedOrders.length} pedidos
              </span>
            </div>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="card mb-3 filters-section">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-2">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select form-select-sm"
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Desde</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Hasta</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Buscar</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="ID, usuario, producto..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Monto mínimo</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={filters.minAmount}
                      onChange={(e) => setFilters({...filters, minAmount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="col-md-1">
                    <label className="form-label">&nbsp;</label>
                    <button
                      className="btn btn-outline-secondary btn-sm w-100"
                      onClick={handleClearFilters}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de pedidos */}
          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center">{error}</div>
          ) : (
            <div className="card orders-table">
              <div className="card-body p-0">
            <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th onClick={() => handleSort('createdAt')} style={{cursor: 'pointer'}}>
                          Fecha {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('user')} style={{cursor: 'pointer'}}>
                          Usuario {sortField === 'user' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                    <th>Productos</th>
                        <th onClick={() => handleSort('total_amount')} style={{cursor: 'pointer'}}>
                          Total {sortField === 'total_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Reclamados</th>
                    <th>Casilleros</th>
                        <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>
                          Estado {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                      {paginatedOrders.map(order => (
                    <tr key={order._id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order._id)}
                              onChange={() => handleSelectOrder(order._id)}
                            />
                          </td>
                          <td data-label="Fecha">
                            <div className="small">
                              {new Date(order.createdAt).toLocaleDateString('es-CO')}
                            </div>
                            <div className="small text-muted">
                              {new Date(order.createdAt).toLocaleTimeString('es-CO')}
                            </div>
                          </td>
                          <td data-label="Usuario">
                            <div className="user-info">
                              <div className="user-name">
                                {(order.user && typeof order.user === 'object') ? order.user.nombre : 'N/A'}
                              </div>
                              <div className="user-email">
                                {(order.user && typeof order.user === 'object') ? order.user.email : 'N/A'}
                              </div>
                            </div>
                      </td>
                          <td data-label="Productos">
                            <div className="small">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="product-item">
                                  <img 
                                    src={item.product?.imagen_url || ''} 
                                    alt={item.product?.nombre || 'Sin nombre'} 
                                    style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 2 }} 
                                  />
                                  <span className="product-name">
                                    {item.product?.nombre || 'Sin nombre'}
                                  </span>
                                  <span className="badge bg-secondary">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td data-label="Total">
                            <strong>${order.total_amount.toLocaleString('es-CO')}</strong>
                          </td>
                          <td data-label="Reclamados">
                            <div className="small">
                              {order.items.map((item: any, idx: number) => {
                                const claimedQuantity = item.claimed_quantity || 0;
                                const totalQuantity = item.quantity;
                                const remainingQuantity = totalQuantity - claimedQuantity;
                                
                                return (
                                  <div key={idx} className="mb-1">
                                    <div className="d-flex justify-content-between">
                                      <span className="text-truncate" style={{ maxWidth: '60px' }}>
                                        {item.product?.nombre || 'Sin nombre'}
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
                          <td data-label="Casilleros">
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
                                      <span key={lockerNum} className="locker-badge">
                                        {lockerNum}
                                      </span>
                                    ))}
                                  </div>
                                );
                              } else {
                                return <span className="text-muted">Sin asignar</span>;
                              }
                            })()}
                          </td>
                          <td data-label="Estado">
                            <select
                              className="form-select form-select-sm"
                              value={order.status}
                              onChange={e => handleStatusChange(order._id, e.target.value as Order['status'])}
                              disabled={updatingId === order._id}
                            >
                              {statusOptions.filter(opt => opt.value).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <span className={`badge bg-${statusColors[order.status]} text-white mt-1 d-block status-badge status-${order.status}`}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          </td>
                          <td className="action-buttons">
                            <div className="btn-group-vertical btn-group-sm">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleShowOrderDetails(order)}
                                title="Ver detalles"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                          {(() => {
                            const hasAssignedLockers = order.items.some((item: any) => item.assigned_locker);
                            return hasAssignedLockers && order.status !== 'picked_up' ? (
                              <button
                                    className="btn btn-outline-warning btn-sm"
                                onClick={() => handleReleaseLocker(order._id)}
                                disabled={updatingId === order._id}
                                title="Liberar casilleros"
                              >
                                <i className="bi bi-unlock"></i>
                              </button>
                            ) : null;
                          })()}
                          <button
                                className="btn btn-outline-danger btn-sm"
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
              </div>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <nav className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                    Anterior
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </main>

      {/* Modal de detalles del pedido */}
      {showOrderModal && selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setShowOrderModal(false)} 
        />
      )}

      {/* Modal de Confirmación Genérico */}
      <ConfirmModal
        show={modalConfig.show}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
        type={modalConfig.type}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
      />
    </div>
  );
};

export default AdminOrdersPage;