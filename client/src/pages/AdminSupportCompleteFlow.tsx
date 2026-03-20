import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as supportService from '../services/supportService';
import orderService from '../services/orderService';
import productService from '../services/productService';
import type { Product } from '../services/productService';
import userService from '../services/userService';
import type { User } from '../services/userService';
import './AdminOrdersPage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Tipos para productos individuales
interface IndividualProduct {
  _id: string;
  product: {
    _id: string;
    nombre: string;
    precio: number;
    imagen_url: string;
    descripcion?: string;
    dimensiones?: {
      largo: number;
      ancho: number;
      alto: number;
      peso: number;
    };
  };
  dimensiones?: {
    largo: number;
    ancho: number;
    alto: number;
    peso: number;
  };
  status: 'available' | 'reserved' | 'claimed' | 'picked_up';
  assigned_locker?: number;
  unit_price: number;
  reservedAt?: string;
  claimedAt?: string;
  pickedUpAt?: string;
  orderId?: string;
  orderCreatedAt?: string;
  individualIndex?: number;
  variants?: Record<string, string>;
}

// Tipos para errores de depuración
interface DebugError {
  id: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  details?: any;
}

const AdminSupportCompleteFlow: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para manejo de usuarios y productos
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [addProductError, setAddProductError] = useState('');
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  
  // Estados de UI
  const [selectedProduct, setSelectedProduct] = useState<IndividualProduct | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(20);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estados para debugging
  const [debugErrors, setDebugErrors] = useState<DebugError[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  
  // Estados para agregar productos a usuarios
  const [usersLoading, setUsersLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  
  
  // Estados para acciones manuales
  const [manualActionLoading, setManualActionLoading] = useState(false);
  const [manualActionProduct, setManualActionProduct] = useState<string | null>(null);
  
  // Verificar autenticación y permisos
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);
  
  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await userService.getAllUsers();
        setUsers(response);
        logDebugError('Usuarios cargados correctamente', { count: response.length }, 'info');
      } catch (err: any) {
        logDebugError('Error al cargar usuarios', err, 'error');
      } finally {
        setUsersLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Cargar productos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const response = await productService.getAllProducts();
        setProducts(response);
        logDebugError('Productos cargados correctamente', { count: response.length }, 'info');
      } catch (err: any) {
        logDebugError('Error al cargar productos', err, 'error');
      } finally {
        setProductsLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchProducts();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Cargar productos individuales
  useEffect(() => {
    const fetchIndividualProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Obtener productos comprados por usuarios (que incluyen productos individuales)
        const purchasedProducts = await orderService.getMyPurchasedProducts();
        
        // Transformar los datos al formato esperado
        const transformedProducts: IndividualProduct[] = purchasedProducts.map((item: any) => ({
          _id: item._id || item.originalItemId,
          product: item.product,
          dimensiones: item.dimensiones,
          status: item.isClaimed ? 'claimed' : item.isReserved ? 'reserved' : 'available',
          assigned_locker: item.assigned_locker,
          unit_price: item.unit_price || item.product.precio,
          reservedAt: item.reservedAt,
          claimedAt: item.claimedAt,
          pickedUpAt: item.pickedUpAt,
          orderId: item.orderId,
          orderCreatedAt: item.orderCreatedAt,
          individualIndex: item.individualIndex,
          variants: item.variants,
          user: item.user, // Añadir usuario propietario
        }));
        
        setIndividualProducts(transformedProducts);
      } catch (err: any) {
        setError('Error al cargar los productos individuales: ' + (err.message || err.toString()));
        logDebugError('Error al cargar productos', err, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchIndividualProducts();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (isAuthenticated && isAdmin) {
          const usersData = await userService.getAllUsers();
          setUsers(usersData);
          logDebugError('Usuarios cargados', { count: usersData.length }, 'info');
        }
      } catch (err: any) {
        logDebugError('Error al cargar usuarios', err, 'error');
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Cargar productos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (isAuthenticated && isAdmin) {
          const productsData = await productService.getAllProducts();
          setProducts(productsData);
          logDebugError('Productos cargados', { count: productsData.length }, 'info');
        }
      } catch (err: any) {
        logDebugError('Error al cargar productos', err, 'error');
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchProducts();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    // Filtro por estado/rol
    if (filters.status) {
      if (filters.status === 'admin' && user.role !== 'admin') return false;
      if (filters.status === 'user' && user.role !== 'user') return false;
      if (filters.status === 'active' && !user.isActive) return false;
      if (filters.status === 'inactive' && user.isActive) return false;
    }
    
    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const userName = user.nombre.toLowerCase();
      const userEmail = user.email.toLowerCase();
      const userId = user._id.toLowerCase();
      
      if (!userName.includes(searchLower) && !userEmail.includes(searchLower) && !userId.includes(searchLower)) {
        return false;
      }
    }
    
    // Filtro por fechas
    if (filters.dateFrom) {
      const userDate = new Date(user.createdAt || new Date());
      const fromDate = new Date(filters.dateFrom);
      if (userDate < fromDate) return false;
    }
    
    if (filters.dateTo) {
      const userDate = new Date(user.createdAt || new Date());
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (userDate > toDate) return false;
    }
    
    return true;
  });
  
  // Ordenar usuarios
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'nombre':
        aValue = a.nombre.toLowerCase();
        bValue = b.nombre.toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'role':
        aValue = a.role;
        bValue = b.role;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt || new Date());
        bValue = new Date(b.createdAt || new Date());
        break;
      default:
        aValue = a[sortField as keyof User];
        bValue = b[sortField as keyof User];
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Paginación
  const totalPages = Math.ceil(sortedUsers.length / productsPerPage);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );
  
  // Función para registrar errores de depuración
  const logDebugError = (message: string, details: any = null, severity: DebugError['severity'] = 'info') => {
    const newError: DebugError = {
      id: Date.now().toString(),
      message,
      timestamp: new Date().toISOString(),
      severity,
      details
    };
    
    setDebugErrors(prev => [newError, ...prev.slice(0, 49)]); // Mantener solo los últimos 50 errores
    
    // Si es un error, también mostrar en consola para facilitar debugging
    if (severity === 'error') {
      console.error(`[DEBUG] ${message}`, details);
    } else if (severity === 'warning') {
      console.warn(`[DEBUG] ${message}`, details);
    } else {
      console.info(`[DEBUG] ${message}`, details);
    }
  };
  
  // Función para agregar producto a un usuario
  const handleAddProductToUser = async () => {
    if (!selectedUser || !selectedProductToAdd) {
      setAddProductError('Debes seleccionar un usuario y un producto');
      return;
    }
    
    try {
      setAddProductLoading(true);
      setAddProductError('');
      
      // Validar que el producto tenga stock disponible
      if (selectedProductToAdd.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${selectedProductToAdd.stock}`);
      }
      
      // Validar variantes si el producto las tiene
      if (selectedProductToAdd.variants && selectedProductToAdd.variants.enabled) {
        const requiredAttributes = selectedProductToAdd.variants.attributes.filter(attr => attr.required);
        for (const attr of requiredAttributes) {
          if (!selectedVariants[attr.name]) {
            throw new Error(`Debes seleccionar una opción para ${attr.name}`);
          }
        }
      }
      
      // Llamar al API para asignar el producto al usuario
      const response = await supportService.addProductToUser(
        selectedUser._id,
        selectedProductToAdd._id,
        quantity,
        Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined
      );
      
      logDebugError('Producto asignado manualmente', response, 'info');
      
      // Actualizar la lista de productos individuales
      setIndividualProducts(prev => [
        ...response.products.map((p: any) => ({
          _id: p._id,
          product: p.product,
          status: p.status,
          unit_price: p.unitPrice,
          orderCreatedAt: p.createdAt,
          variants: p.variants ? Object.fromEntries(p.variants) : undefined,
          user: p.user
        })) as IndividualProduct[],
        ...prev
      ]);
      
      // Limpiar selecciones
      setSelectedProductToAdd(null);
      setSelectedVariants({});
      setQuantity(1);
      setShowAddProductModal(false);
      
      alert(response.message || `Producto asignado a ${selectedUser.nombre} correctamente`);
    } catch (err: any) {
      const errorMessage = err.message || err.toString();
      setAddProductError(errorMessage);
      logDebugError('Error al asignar producto', err, 'error');
    } finally {
      setAddProductLoading(false);
    }
  };
  
  // Función para abrir el modal de agregar producto a un usuario específico
  const openAddProductModal = (user: User) => {
    setSelectedUser(user);
    setShowAddProductModal(true);
  };
  
  // Función para manejar selección de variantes
  const handleVariantChange = (attributeName: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  // Función para manejar el cambio de estado manualmente
  const handleManualStatusChange = async (productId: string, newStatus: IndividualProduct['status']) => {
    try {
      setManualActionLoading(true);
      setManualActionProduct(productId);
      
      // Aquí iría la lógica para cambiar el estado manualmente
      // Por ahora solo simulamos la acción y registramos en debug
      logDebugError(`Cambio de estado manual: ${productId} -> ${newStatus}`, {
        productId,
        newStatus,
        timestamp: new Date().toISOString()
      }, 'info');
      
      // Actualizar la lista local
      setIndividualProducts(prev => 
        prev.map(p => 
          p._id === productId ? { ...p, status: newStatus } : p
        )
      );
      
      alert(`Estado cambiado a: ${newStatus}`);
    } catch (err: any) {
      logDebugError('Error al cambiar estado manualmente', err, 'error');
      alert('Error al cambiar el estado: ' + (err.message || err.toString()));
    } finally {
      setManualActionLoading(false);
      setManualActionProduct(null);
    }
  };
  
  // Función para asignar manualmente un casillero
  const handleManualLockerAssignment = async (productId: string, lockerNumber: number) => {
    try {
      setManualActionLoading(true);
      setManualActionProduct(productId);
      
      // Aquí iría la lógica para asignar el casillero manualmente
      logDebugError(`Asignación de casillero manual: ${productId} -> Locker ${lockerNumber}`, {
        productId,
        lockerNumber,
        timestamp: new Date().toISOString()
      }, 'info');
      
      // Actualizar la lista local
      setIndividualProducts(prev => 
        prev.map(p => 
          p._id === productId ? { ...p, assigned_locker: lockerNumber } : p
        )
      );
      
      alert(`Casillero ${lockerNumber} asignado`);
    } catch (err: any) {
      logDebugError('Error al asignar casillero manualmente', err, 'error');
      alert('Error al asignar el casillero: ' + (err.message || err.toString()));
    } finally {
      setManualActionLoading(false);
      setManualActionProduct(null);
    }
  };
  
  // Función para liberar manualmente un producto
  const handleManualRelease = async (productId: string) => {
    try {
      setManualActionLoading(true);
      setManualActionProduct(productId);
      
      // Aquí iría la lógica para liberar el producto manualmente
      logDebugError(`Liberación manual: ${productId}`, {
        productId,
        timestamp: new Date().toISOString()
      }, 'info');
      
      // Actualizar la lista local
      setIndividualProducts(prev => 
        prev.map(p => 
          p._id === productId ? { ...p, status: 'available', assigned_locker: undefined } : p
        )
      );
      
      alert('Producto liberado');
    } catch (err: any) {
      logDebugError('Error al liberar producto manualmente', err, 'error');
      alert('Error al liberar el producto: ' + (err.message || err.toString()));
    } finally {
      setManualActionLoading(false);
      setManualActionProduct(null);
    }
  };
  
  // Función para ordenar
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Función para limpiar filtros
  const handleClearFilters = () => {
    setFilters({
      status: '',
      search: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
  };
  
  // Función para exportar a CSV
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Producto', 'Estado', 'Casillero', 'Precio Unitario', 'Fecha de Creación', 'Variantes'];
      const csvContent = [
        headers.join(','),
        ...sortedProducts.map(product => [
          product._id,
          product.product.nombre,
          product.status,
          product.assigned_locker || 'Sin asignar',
          product.unit_price,
          product.orderCreatedAt || product.claimedAt || product.reservedAt || 'N/A',
          product.variants ? JSON.stringify(product.variants) : 'Sin variantes'
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_individuales_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      logDebugError('Exportación CSV realizada', { count: sortedProducts.length }, 'info');
    } catch (err: any) {
      logDebugError('Error al exportar CSV', err, 'error');
      alert('Error al exportar: ' + (err.message || err.toString()));
    }
  };
  
  // Renderizar badge de estado
  const renderStatusBadge = (status: IndividualProduct['status']) => {
    let color = 'secondary';
    let text = '';
    
    switch (status) {
      case 'available':
        color = 'success';
        text = 'Disponible';
        break;
      case 'reserved':
        color = 'warning';
        text = 'Reservado';
        break;
      case 'claimed':
        color = 'primary';
        text = 'Reclamado';
        break;
      case 'picked_up':
        color = 'info';
        text = 'Recogido';
        break;
      default:
        text = status;
    }
    
    return (
      <span className={`badge bg-${color}`}>
        {text}
      </span>
    );
  };
  
  if (!isAuthenticated || !isAdmin) {
    return null;
  }
  
  return (
    <div className="admin-dashboard admin-orders-page" data-theme="light">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-tools header-icon"></i>
            <span className="header-title">FLUJO COMPLETO SOPORTE TOTAL</span>
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
      
      {/* Modal para agregar producto a usuario */}
      <div className={`modal fade ${showAddProductModal ? 'show' : ''}`} id="addProductModal" tabIndex={-1} aria-labelledby="addProductModalLabel" aria-hidden={!showAddProductModal} style={{display: showAddProductModal ? 'block' : 'none', backgroundColor: showAddProductModal ? 'rgba(0,0,0,0.5)' : 'transparent'}}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="addProductModalLabel">Agregar Producto a Usuario</h5>
              <button type="button" className="btn-close" onClick={() => {
                setShowAddProductModal(false);
                setError('');
              }}></button>
            </div>
            <div className="modal-body">
              {addProductError && (
                <div className="alert alert-danger">{addProductError}</div>
              )}
              
              <div className="mb-3">
                <label className="form-label">Usuario Seleccionado</label>
                {selectedUser ? (
                  <div className="p-2 border rounded">
                    <div><strong>Nombre:</strong> {selectedUser.nombre} {selectedUser.apellido}</div>
                    <div><strong>Email:</strong> {selectedUser.email}</div>
                    <div><strong>Rol:</strong> {selectedUser.role}</div>
                  </div>
                ) : (
                  <select 
                    className="form-select" 
                    value={selectedUser?._id || ''}
                    onChange={(e) => {
                      const userId = e.target.value;
                      const user = users.find(u => u._id === userId) || null;
                      setSelectedUser(user);
                    }}
                    disabled={usersLoading || addProductLoading}
                  >
                    <option value="">Seleccionar usuario...</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.nombre} {user.apellido} ({user.email})
                      </option>
                    ))}
                  </select>
                )}
                {usersLoading && <div className="text-muted mt-1">Cargando usuarios...</div>}
              </div>
              
              <div className="mb-3">
                <label className="form-label">Seleccionar Producto</label>
                <select 
                  className="form-select" 
                  value={selectedProductToAdd?._id || ''}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const product = products.find(p => p._id === productId) || null;
                    setSelectedProductToAdd(product);
                    // Resetear variantes al cambiar de producto
                    setSelectedVariants({});
                  }}
                  disabled={productsLoading || addProductLoading}
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.nombre} - ${product.precio} (Stock: {product.stock})
                    </option>
                  ))}
                </select>
                {productsLoading && <div className="text-muted mt-1">Cargando productos...</div>}
              </div>
              
              {selectedProductToAdd && selectedProductToAdd.variants && selectedProductToAdd.variants.enabled && (
                <div className="mb-3 border p-3 rounded">
                  <h6>Variantes del Producto</h6>
                  {selectedProductToAdd.variants.attributes.map(attr => (
                    <div key={attr.name} className="mb-2">
                      <label className="form-label">
                        {attr.name} {attr.required && <span className="text-danger">*</span>}
                      </label>
                      <select
                        className="form-select"
                        value={selectedVariants[attr.name] || ''}
                        onChange={(e) => handleVariantChange(attr.name, e.target.value)}
                        disabled={addProductLoading}
                        required={attr.required}
                      >
                        <option value="">Seleccionar {attr.name}...</option>
                        {attr.options.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mb-3">
                <label className="form-label">Cantidad</label>
                <input
                  type="number"
                  className="form-control"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={selectedProductToAdd?.stock || 1}
                  disabled={addProductLoading}
                />
                {selectedProductToAdd && (
                  <div className="text-muted mt-1">
                    Stock disponible: {selectedProductToAdd.stock}
                  </div>
                )}
              </div>
              
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Esta acción asignará el producto seleccionado al usuario. El producto aparecerá como disponible en la cuenta del usuario.
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddProductModal(false);
                  setError('');
                }}
                disabled={addProductLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddProductToUser}
                disabled={addProductLoading || !selectedUser || !selectedProductToAdd}
              >
                {addProductLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : (
                  'Agregar Producto'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="admin-main-content">
        <div className="container-fluid">
          {/* Panel de control */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Panel de Control - Soporte Total</h5>
                  <p className="card-text">
                    Gestiona productos individuales, visualiza estados, implementa debugging y mantenimiento manual.
                  </p>
                  
                  <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="bi bi-funnel"></i> Filtros
            </button>
            <button
              className="btn btn-outline-success btn-sm"
              onClick={() => {
                setSelectedUser(null);
                setShowAddProductModal(true);
              }}
            >
              <i className="bi bi-plus-circle"></i> Agregar Producto a Usuario
            </button>
            <button
              className="btn btn-outline-success btn-sm"
              onClick={handleExportCSV}
            >
              <i className="bi bi-download"></i> Exportar CSV
            </button>
            <button
              className="btn btn-outline-info btn-sm"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
            >
              <i className="bi bi-bug"></i> Panel Debug
            </button>
            <button
              className="btn btn-outline-warning btn-sm"
              onClick={() => window.location.reload()}
            >
              <i className="bi bi-arrow-clockwise"></i> Refrescar
            </button>
          </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filtros */}
          {showFilters && (
            <div className="card mb-3 filters-section">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select form-select-sm"
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                      <option value="">Todos los tipos</option>
                      <option value="admin">Administrador</option>
                      <option value="user">Usuario</option>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Buscar</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Nombre o email del usuario..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
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
                  <div className="col-md-2">
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
          
          {/* Panel de debugging */}
          {showDebugPanel && (
            <div className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Panel de Debugging</span>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowDebugPanel(false)}
                >
                  Cerrar
                </button>
              </div>
              <div className="card-body">
                <h6>Errores y Logs Recientes</h6>
                {debugErrors.length === 0 ? (
                  <p className="text-muted">No hay errores registrados</p>
                ) : (
                  <div className="debug-errors-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {debugErrors.map(error => (
                      <div 
                        key={error.id} 
                        className={`alert alert-${error.severity === 'error' ? 'danger' : error.severity === 'warning' ? 'warning' : 'info'} mb-2`}
                      >
                        <div className="d-flex justify-content-between">
                          <strong>{error.message}</strong>
                          <small>{new Date(error.timestamp).toLocaleTimeString()}</small>
                        </div>
                        {error.details && (
                          <pre className="mt-2 mb-0" style={{ fontSize: '0.8em' }}>
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tabla de productos individuales */}
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
                        <th onClick={() => handleSort('nombre')} style={{cursor: 'pointer'}}>
                          Nombre {sortField === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('email')} style={{cursor: 'pointer'}}>
                          Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('role')} style={{cursor: 'pointer'}}>
                          Rol {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('createdAt')} style={{cursor: 'pointer'}}>
                          Fecha de Registro {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map(user => (
                        <tr key={user._id}>
                          <td>
                            <div className="user-info">
                              <div className="user-name">
                                {user.nombre}
                              </div>
                              <div className="user-email text-muted small">
                                ID: {user._id?.substring(0, 8)}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="user-email">
                              {user.email}
                            </div>
                          </td>
                          <td>
                            <span className={`badge bg-${user.role === 'admin' ? 'danger' : 'primary'}`}>
                              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                          </td>
                          <td>
                            <div className="small">
                              {new Date(user.createdAt).toLocaleDateString('es-CO')}
                            </div>
                          </td>
                          <td>
                            <span className={`badge bg-${user.isActive ? 'success' : 'secondary'}`}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button 
                                className="btn btn-sm btn-outline-primary" 
                                onClick={() => console.log('Ver detalles de usuario', user._id)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-warning" 
                                onClick={() => console.log('Editar usuario', user._id)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-primary" 
                                onClick={() => openAddProductModal(user)}
                                title="Agregar Producto a Usuario"
                              >
                                <i className="bi bi-plus-circle"></i> Agregar Producto
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
      
      {/* Modal de detalles del producto */}
      {selectedProduct && (
        <div className="modal fade show d-block order-details-modal" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalles del Producto Individual</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedProduct(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Información del Producto</h6>
                    <p><strong>Nombre:</strong> {selectedProduct.product.nombre}</p>
                    <p><strong>Descripción:</strong> {selectedProduct.product.descripcion || 'Sin descripción'}</p>
                    <p><strong>ID:</strong> {selectedProduct._id}</p>
                    <p><strong>Estado:</strong> {renderStatusBadge(selectedProduct.status)}</p>
                    <p><strong>Casillero asignado:</strong> {selectedProduct.assigned_locker || 'Sin asignar'}</p>
                    <p><strong>Precio unitario:</strong> ${selectedProduct.unit_price?.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Dimensiones</h6>
                    {selectedProduct.dimensiones ? (
                      <div>
                        <p><strong>Largo:</strong> {selectedProduct.dimensiones.largo} cm</p>
                        <p><strong>Ancho:</strong> {selectedProduct.dimensiones.ancho} cm</p>
                        <p><strong>Alto:</strong> {selectedProduct.dimensiones.alto} cm</p>
                        <p><strong>Peso:</strong> {selectedProduct.dimensiones.peso} g</p>
                        <p><strong>Volumen:</strong> {(selectedProduct.dimensiones.largo * selectedProduct.dimensiones.ancho * selectedProduct.dimensiones.alto).toLocaleString('es-CO')} cm³</p>
                      </div>
                    ) : (
                      <p className="text-muted">Sin dimensiones</p>
                    )}
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <h6>Fechas</h6>
                    <p><strong>Fecha de creación:</strong> {selectedProduct.orderCreatedAt ? new Date(selectedProduct.orderCreatedAt).toLocaleString('es-CO') : 'N/A'}</p>
                    <p><strong>Fecha de reserva:</strong> {selectedProduct.reservedAt ? new Date(selectedProduct.reservedAt).toLocaleString('es-CO') : 'N/A'}</p>
                    <p><strong>Fecha de reclamo:</strong> {selectedProduct.claimedAt ? new Date(selectedProduct.claimedAt).toLocaleString('es-CO') : 'N/A'}</p>
                    <p><strong>Fecha de recogida:</strong> {selectedProduct.pickedUpAt ? new Date(selectedProduct.pickedUpAt).toLocaleString('es-CO') : 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Variantes</h6>
                    {selectedProduct.variants ? (
                      <div>
                        {Object.entries(selectedProduct.variants).map(([key, value]) => (
                          <p key={key}><strong>{key}:</strong> {value}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">Sin variantes</p>
                    )}
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-12">
                    <h6>Información del Usuario</h6>
                    {selectedProduct.user ? (
                      <div className="card">
                        <div className="card-body">
                          <p className="mb-1"><strong>Nombre:</strong> {selectedProduct.user.nombre} {selectedProduct.user.apellido}</p>
                          <p className="mb-1"><strong>Email:</strong> {selectedProduct.user.email}</p>
                          <p className="mb-1"><strong>ID:</strong> {selectedProduct.user._id}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted">No hay información de usuario disponible</p>
                    )}
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-12">
                    <h6>Imagen</h6>
                    <img 
                      src={selectedProduct.product.imagen_url} 
                      alt={selectedProduct.product.nombre} 
                      className="img-fluid" 
                      style={{ maxHeight: 200 }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedProduct(null)}
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    // Aquí podrías implementar una acción específica para este producto
                    alert('Funcionalidad adicional no implementada');
                  }}
                >
                  Acciones Adicionales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportCompleteFlow;