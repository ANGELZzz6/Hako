import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as supportService from '../services/supportService';
import orderService from '../services/orderService';
import productService from '../services/productService';
import debugService from '../services/debugService';
import type { Product } from '../services/productService';
import userService from '../services/userService';
import type { User } from '../services/userService';
import './AdminOrdersPage.css';
import './AdminModalImprovements.css';
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
  user?: {
    _id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
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
  const [individualProducts, setIndividualProducts] = useState<any[]>([]);
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
  
  // Estados para mostrar productos del usuario
  const [selectedUserForProducts, setSelectedUserForProducts] = useState<User | null>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [showUserProductsModal, setShowUserProductsModal] = useState(false);
  const [userProductsLoading, setUserProductsLoading] = useState(false);
  
  // Estados para manejo de reservas y debugging
  const [showReservationStatusModal, setShowReservationStatusModal] = useState(false);
  const [selectedUserForReservations, setSelectedUserForReservations] = useState<User | null>(null);
  const [reservationStatusLoading, setReservationStatusLoading] = useState(false);
  const [reservationActions, setReservationActions] = useState<Array<{
    productId: string;
    productName: string;
    currentStatus: string;
    newStatus: string;
    action: string;
  }>>([]);
  
  // Estados para debugging automático
  const [debugMode, setDebugMode] = useState(false);
  const [autoDebugEnabled, setAutoDebugEnabled] = useState(true);
  
  // Verificar autenticación y permisos
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);
  
  // Cargar usuarios y productos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setUsersLoading(true);
        setProductsLoading(true);
        
        const [usersResponse, productsResponse] = await Promise.all([
          userService.getAllUsers(),
          productService.getAllProducts()
        ]);
        
        setUsers(usersResponse);
        setProducts(productsResponse);
        
        logDebugError('Datos cargados correctamente', { 
          usersCount: usersResponse.length, 
          productsCount: productsResponse.length 
        }, 'info');
      } catch (err: any) {
        logDebugError('Error al cargar datos', err, 'error');
      } finally {
        setUsersLoading(false);
        setProductsLoading(false);
      }
    };
    
    if (isAuthenticated && isAdmin) {
      fetchData();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Función para cargar productos individuales
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

  // Cargar productos individuales
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchIndividualProducts();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Sistema de debugging automático
  useEffect(() => {
    if (!autoDebugEnabled) return;
    
    // Capturar errores globales de JavaScript
    const handleGlobalError = (event: ErrorEvent) => {
      logDebugError('Error global de JavaScript', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
        timestamp: new Date().toISOString()
      }, 'error');
    };
    
    // Capturar promesas rechazadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logDebugError('Promesa rechazada no manejada', {
        reason: event.reason,
        timestamp: new Date().toISOString()
      }, 'error');
    };
    
    // Agregar event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Log de inicio del sistema de debugging
    logDebugError('Sistema de debugging automático iniciado', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }, 'info');
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [autoDebugEnabled]);
  
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
  const logDebugError = async (message: string, details: any = null, severity: DebugError['severity'] = 'info') => {
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
    
    // Enviar log al servidor si el debug automático está habilitado
    if (autoDebugEnabled) {
      try {
        await debugService.sendDebugLog({
          id: newError.id,
          message: newError.message,
          timestamp: newError.timestamp,
          severity: newError.severity,
          details: newError.details,
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      } catch (err) {
        // No loguear errores del servicio de debug para evitar loops infinitos
        console.warn('No se pudo enviar log de debug al servidor:', err);
      }
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
      
      // Debug: Log de la información del producto seleccionado
      logDebugError('Iniciando asignación de producto', {
        userId: selectedUser._id,
        userName: selectedUser.nombre,
        productId: selectedProductToAdd._id,
        productName: selectedProductToAdd.nombre,
        quantity,
        selectedVariants,
        hasVariants: !!selectedProductToAdd.variants,
        variantsEnabled: selectedProductToAdd.variants?.enabled,
        variantsAttributes: selectedProductToAdd.variants?.attributes?.length || 0
      }, 'info');
      
      // Validar que el producto tenga stock disponible
      if (selectedProductToAdd.stock < quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${selectedProductToAdd.stock}, Solicitado: ${quantity}`);
      }
      
      // Validar variantes si el producto las tiene
      if (selectedProductToAdd.variants && selectedProductToAdd.variants.enabled) {
        const requiredAttributes = selectedProductToAdd.variants.attributes.filter(attr => attr.required);
        
        logDebugError('Validando variantes requeridas', {
          totalAttributes: selectedProductToAdd.variants.attributes.length,
          requiredAttributes: requiredAttributes.length,
          selectedVariants: Object.keys(selectedVariants).length
        }, 'info');
        
        for (const attr of requiredAttributes) {
          if (!selectedVariants[attr.name]) {
            throw new Error(`Debes seleccionar una opción para el atributo requerido: ${attr.name}`);
          }
          
          // Validar que la opción seleccionada existe
          const optionExists = attr.options.some(opt => opt.value === selectedVariants[attr.name]);
          if (!optionExists) {
            throw new Error(`La opción seleccionada para ${attr.name} no es válida`);
          }
          
          // Solo validar stock de la variante específica si el producto no tiene stock general suficiente
          // Si hay stock general, permitir la asignación aunque la variante específica no tenga stock
          if (selectedProductToAdd.stock < quantity) {
            const selectedOption = attr.options.find(opt => opt.value === selectedVariants[attr.name]);
            if (selectedOption && selectedOption.stock < quantity) {
              throw new Error(`Stock insuficiente para la variante ${attr.name}: ${selectedOption.value}. Disponible: ${selectedOption.stock}`);
            }
          }
        }
        
        logDebugError('Variantes validadas correctamente', {
          selectedVariants,
          requiredAttributes: requiredAttributes.map(attr => attr.name)
        }, 'info');
      }
      
      // Llamar al API para asignar el producto al usuario
      const response = await supportService.addProductToUser(
        selectedUser._id,
        selectedProductToAdd._id,
        quantity,
        Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined
      );
      
      logDebugError('Producto asignado manualmente', response, 'info');
      
      // Log del precio calculado
      console.log('💰 Precio del producto asignado:', {
        precioBase: selectedProductToAdd.precio,
        variantesSeleccionadas: selectedVariants,
        precioTotal: response.products?.[0]?.unitPrice || 'No disponible'
      });
      
      // Log de la estructura de la respuesta para debugging
      console.log('🔍 Estructura de la respuesta del servidor:', {
        responseKeys: Object.keys(response),
        hasProducts: !!response.products,
        productsType: typeof response.products,
        productsLength: response.products?.length,
        firstProduct: response.products?.[0],
        firstProductVariants: response.products?.[0]?.variants,
        variantsType: typeof response.products?.[0]?.variants
      });
      
      // Actualizar la lista de productos individuales solo si hay productos en la respuesta
      if (response.products && Array.isArray(response.products)) {
        setIndividualProducts(prev => [
          ...response.products.map((p: any) => {
            // Validar y convertir variants de forma segura
            let variants = undefined;
            if (p.variants) {
              try {
                if (p.variants instanceof Map) {
                  variants = Object.fromEntries(p.variants);
                } else if (Array.isArray(p.variants)) {
                  variants = Object.fromEntries(p.variants);
                } else if (typeof p.variants === 'object') {
                  variants = p.variants;
                }
              } catch (error) {
                console.warn('Error al convertir variants:', error, p.variants);
                variants = undefined;
              }
            }

            return {
              _id: p._id,
              product: p.product,
              status: p.status,
              unit_price: p.unitPrice,
              orderCreatedAt: p.createdAt,
              variants,
              user: p.user
            };
          }) as IndividualProduct[],
          ...prev
        ]);
      } else {
        console.warn('⚠️ La respuesta no contiene productos válidos:', response);
      }
      
      // Limpiar selecciones del modal pero mantener el usuario seleccionado
      setSelectedProductToAdd(null);
      setSelectedVariants({});
      setQuantity(1);
      setShowAddProductModal(false);
      
      // Mostrar mensaje de éxito
      alert(response.message || `Producto asignado a ${selectedUser.nombre} correctamente`);
      
      // Recargar la lista de productos individuales para mostrar el nuevo producto
      await fetchIndividualProducts();
    } catch (err: any) {
      const errorMessage = err.message || err.toString();
      setAddProductError(errorMessage);
      logDebugError('Error al asignar producto', {
        error: errorMessage,
        selectedUser: selectedUser?._id,
        selectedProduct: selectedProductToAdd?._id,
        selectedVariants,
        quantity
      }, 'error');
    } finally {
      setAddProductLoading(false);
    }
  };
  
  // Función para abrir el modal de agregar producto a un usuario específico
  const openAddProductModal = (user: User) => {
    setSelectedUser(user);
    setShowAddProductModal(true);
  };
  
  // Función para mostrar productos de un usuario específico
  const showUserProducts = async (user: User) => {
    try {
      setSelectedUserForProducts(user);
      setUserProductsLoading(true);
      setShowUserProductsModal(true);
      
      // Usar el nuevo servicio para obtener productos del usuario específico
      const userProductsList = await orderService.getUserProducts(user._id);
      
      setUserProducts(userProductsList);
      
      logDebugError('Productos del usuario cargados', {
        userId: user._id,
        userName: user.nombre,
        productsCount: userProductsList.length
      }, 'info');
      
    } catch (err: any) {
      logDebugError('Error al cargar productos del usuario', err, 'error');
      alert('Error al cargar productos del usuario: ' + (err.message || err.toString()));
    } finally {
      setUserProductsLoading(false);
    }
  };
  
  // Función para mostrar y gestionar el estado de las reservas del usuario
  const showReservationStatus = async (user: User) => {
    try {
      setSelectedUserForReservations(user);
      setReservationStatusLoading(true);
      setShowReservationStatusModal(true);
      
      // Obtener productos del usuario para mostrar sus estados
      const userProductsList = await orderService.getUserProducts(user._id);
      
      // Preparar acciones disponibles para cada producto
      const actions = userProductsList
        .filter(product => product._id || product.originalItemId)
        .map(product => ({
          productId: (product._id || product.originalItemId) || '',
          productName: product.product.nombre,
          currentStatus: product.isClaimed ? 'claimed' : product.isReserved ? 'reserved' : 'available',
          newStatus: '',
          action: ''
        }));
      
      setReservationActions(actions);
      
      logDebugError('Estado de reservas cargado', {
        userId: user._id,
        userName: user.nombre,
        productsCount: userProductsList.length
      }, 'info');
      
    } catch (err: any) {
      logDebugError('Error al cargar estado de reservas', err, 'error');
      alert('Error al cargar estado de reservas: ' + (err.message || err.toString()));
    } finally {
      setReservationStatusLoading(false);
    }
  };
  
  // Función para cambiar el estado de un producto
  const changeProductStatus = async (productId: string, newStatus: string, action: string) => {
    try {
      setManualActionLoading(true);
      
      // Aquí implementaremos la lógica para cambiar el estado
      // Por ahora solo logueamos la acción
      logDebugError('Cambio de estado solicitado', {
        productId,
        newStatus,
        action,
        timestamp: new Date().toISOString()
      }, 'info');
      
      // TODO: Implementar llamada al servidor para cambiar estado
      alert(`Acción ${action} aplicada al producto ${productId}. Estado: ${newStatus}`);
      
    } catch (err: any) {
      logDebugError('Error al cambiar estado del producto', err, 'error');
      alert('Error al cambiar estado: ' + (err.message || err.toString()));
    } finally {
      setManualActionLoading(false);
    }
  };
  
  // Función para manejar selección de variantes
  const handleVariantChange = (attributeName: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [attributeName]: value
    }));
    
    // Debug: Log del cambio de variante
    logDebugError('Variante seleccionada', {
      attributeName,
      value,
      allSelectedVariants: { ...selectedVariants, [attributeName]: value }
    }, 'info');
  };
  
  // Función para validar si se pueden agregar productos
  const canAddProduct = () => {
    if (!selectedUser || !selectedProductToAdd) return false;
    
    // Validar variantes requeridas
    if (selectedProductToAdd.variants && selectedProductToAdd.variants.enabled) {
      const requiredAttributes = selectedProductToAdd.variants.attributes.filter(attr => attr.required);
      for (const attr of requiredAttributes) {
        if (!selectedVariants[attr.name]) return false;
      }
    }
    
    return true;
  };
  
  // Función para obtener el mensaje de error de validación
  const getValidationMessage = () => {
    if (!selectedUser) return 'Debes seleccionar un usuario';
    if (!selectedProductToAdd) return 'Debes seleccionar un producto';
    
    if (selectedProductToAdd.variants && selectedProductToAdd.variants.enabled) {
      const requiredAttributes = selectedProductToAdd.variants.attributes.filter(attr => attr.required);
      for (const attr of requiredAttributes) {
        if (!selectedVariants[attr.name]) {
          return `Debes seleccionar una opción para: ${attr.name}`;
        }
      }
    }
    
    return '';
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
        ...individualProducts.map(product => [
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
      
      logDebugError('Exportación CSV realizada', { count: individualProducts.length }, 'info');
    } catch (err: any) {
      logDebugError('Error al exportar CSV', err, 'error');
      alert('Error al exportar: ' + (err.message || err.toString()));
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
        <div className="modal-dialog modal-lg admin-dashboard">
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
                    <div><strong>Nombre:</strong> {selectedUser.nombre}</div>
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
                        {user.nombre} ({user.email})
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
                    
                    // Debug: Log del producto seleccionado
                    if (product) {
                      logDebugError('Producto seleccionado', {
                        id: product._id,
                        nombre: product.nombre,
                        tieneVariantes: !!product.variants,
                        variantesHabilitadas: product.variants?.enabled,
                        atributos: product.variants?.attributes?.length || 0
                      }, 'info');
                    }
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
                  {/* Debug info para variantes */}
                  <div className="small text-muted mb-2">
                    <strong>Debug:</strong> Producto: {selectedProductToAdd.nombre} | 
                    Variantes habilitadas: {selectedProductToAdd.variants.enabled ? 'Sí' : 'No'} | 
                    Cantidad de atributos: {selectedProductToAdd.variants.attributes?.length || 0}
                  </div>
                  
                  {selectedProductToAdd.variants.attributes && selectedProductToAdd.variants.attributes.length > 0 ? (
                    selectedProductToAdd.variants.attributes.map(attr => (
                      <div key={attr.name} className="mb-2">
                        <label className="form-label">
                          {attr.name} {attr.required && <span className="text-danger">*</span>}
                          <small className="text-muted ms-2">
                            ({attr.options?.length || 0} opciones disponibles)
                          </small>
                        </label>
                        <select
                          className="form-select"
                          value={selectedVariants[attr.name] || ''}
                          onChange={(e) => handleVariantChange(attr.name, e.target.value)}
                          disabled={addProductLoading}
                          required={attr.required}
                        >
                          <option value="">Seleccionar {attr.name}...</option>
                          {attr.options && attr.options.length > 0 ? (
                            attr.options.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.value} - ${option.price} (Stock: {option.stock})
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No hay opciones disponibles</option>
                          )}
                        </select>
                        {attr.required && !selectedVariants[attr.name] && (
                          <div className="text-danger small mt-1">
                            Este campo es obligatorio
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      El producto tiene variantes habilitadas pero no se encontraron atributos configurados.
                    </div>
                  )}
                </div>
              )}
              
              {/* Debug info adicional */}
              {selectedProductToAdd && (
                <div className="mb-3 small text-muted">
                  <details>
                    <summary>Información de Debug del Producto</summary>
                    <pre className="mt-2" style={{ fontSize: '0.8em', maxHeight: '200px', overflow: 'auto' }}>
                      {JSON.stringify({
                        id: selectedProductToAdd._id,
                        nombre: selectedProductToAdd.nombre,
                        tieneVariantes: !!selectedProductToAdd.variants,
                        variantesHabilitadas: selectedProductToAdd.variants?.enabled,
                        atributos: selectedProductToAdd.variants?.attributes?.length || 0,
                        stock: selectedProductToAdd.stock
                      }, null, 2)}
                    </pre>
                  </details>
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
                disabled={addProductLoading || !canAddProduct()}
                title={getValidationMessage() || 'Agregar producto al usuario'}
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
                    
                    {/* Panel de Debugging */}
                    <div className="ms-auto">
                      <button
                        className={`btn btn-sm ${debugMode ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setDebugMode(!debugMode)}
                        title="Activar/Desactivar modo debug"
                      >
                        <i className="bi bi-bug"></i> Debug Mode
                      </button>
                      <button
                        className={`btn btn-sm ${autoDebugEnabled ? 'btn-success' : 'btn-outline-secondary'} ms-2`}
                        onClick={() => setAutoDebugEnabled(!autoDebugEnabled)}
                        title="Activar/Desactivar debug automático"
                      >
                        <i className="bi bi-robot"></i> Auto-Debug
                      </button>
                    </div>
                  </div>
                  
                  {/* Panel de Debugging Expandido */}
                  {debugMode && (
                    <div className="mt-3 p-3 bg-light border rounded">
                      <h6 className="mb-3">
                        <i className="bi bi-bug text-danger"></i> Panel de Debugging
                      </h6>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-2">
                            <strong>Estado del Sistema:</strong>
                            <span className="badge bg-success ms-2">Operativo</span>
                          </div>
                          <div className="mb-2">
                            <strong>Productos Cargados:</strong>
                            <span className="badge bg-info ms-2">{individualProducts.length}</span>
                          </div>
                          <div className="mb-2">
                            <strong>Usuarios Cargados:</strong>
                            <span className="badge bg-info ms-2">{users.length}</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-2">
                            <strong>Debug Automático:</strong>
                            <span className={`badge ${autoDebugEnabled ? 'bg-success' : 'bg-secondary'} ms-2`}>
                              {autoDebugEnabled ? 'Activado' : 'Desactivado'}
                            </span>
                          </div>
                          <div className="mb-2">
                            <strong>Errores Capturados:</strong>
                            <span className="badge bg-warning ms-2">{debugErrors.length}</span>
                          </div>
                          <div className="mb-2">
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => setShowDebugPanel(!showDebugPanel)}
                            >
                              <i className="bi bi-list-ul"></i> Ver Errores
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="d-flex gap-2 flex-wrap">
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
                            <div className="d-flex gap-2 flex-wrap">
                              <button 
                                className="btn btn-sm btn-outline-primary" 
                                onClick={() => showUserProducts(user)}
                                title="Ver productos del usuario"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-warning" 
                                onClick={() => showReservationStatus(user)}
                                title="Gestionar estado de reservas"
                              >
                                <i className="bi bi-clock-history"></i>
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
          <div className="modal-dialog modal-lg admin-dashboard">
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
      
      {/* Modal para mostrar productos del usuario */}
      {showUserProductsModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-lg admin-dashboard">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Productos de {selectedUserForProducts?.nombre}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowUserProductsModal(false)}></button>
              </div>
              <div className="modal-body">
                {userProductsLoading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                  </div>
                ) : userProducts.length === 0 ? (
                  <div className="alert alert-info">
                    Este usuario no tiene productos asignados.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Producto</th>
                          <th>Estado</th>
                          <th>Casillero</th>
                          <th>Precio</th>
                          <th>Fecha</th>
                          <th>Variantes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProducts.map(product => (
                          <tr key={product._id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <img 
                                  src={product.product.imagen_url} 
                                  alt={product.product.nombre}
                                  className="me-2"
                                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px' }}
                                />
                                <div>
                                  <div className="fw-bold">{product.product.nombre}</div>
                                  <small className="text-muted">ID: {product._id.substring(0, 8)}</small>
                                </div>
                              </div>
                            </td>
                            <td>{renderStatusBadge(product.status)}</td>
                            <td>{product.assigned_locker || 'Sin asignar'}</td>
                            <td>${product.unit_price?.toLocaleString('es-CO')}</td>
                            <td>
                              {product.orderCreatedAt ? 
                                new Date(product.orderCreatedAt).toLocaleDateString('es-CO') : 
                                'N/A'
                              }
                            </td>
                            <td>
                              {product.variants ? (
                                <div className="small">
                                  {Object.entries(product.variants).map(([key, value]) => (
                                    <div key={key}>
                                      <strong>{key}:</strong> {value}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">Sin variantes</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserProductsModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para gestionar estado de reservas */}
      {showReservationStatusModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-xl admin-dashboard">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Gestión de Estado de Reservas - {selectedUserForReservations?.nombre}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReservationStatusModal(false)}></button>
              </div>
              <div className="modal-body">
                {reservationStatusLoading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                  </div>
                ) : reservationActions.length === 0 ? (
                  <div className="alert alert-info">
                    Este usuario no tiene productos para gestionar.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Producto</th>
                          <th>Estado Actual</th>
                          <th>Nuevo Estado</th>
                          <th>Acción</th>
                          <th>Operaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationActions.map((action, index) => (
                          <tr key={action.productId}>
                            <td>
                              <div className="fw-bold">{action.productName}</div>
                              <small className="text-muted">ID: {action.productId.substring(0, 8)}</small>
                            </td>
                            <td>
                              <span className={`badge bg-${
                                action.currentStatus === 'claimed' ? 'success' : 
                                action.currentStatus === 'reserved' ? 'warning' : 'primary'
                              }`}>
                                {action.currentStatus === 'claimed' ? 'Reclamado' : 
                                 action.currentStatus === 'reserved' ? 'Reservado' : 'Disponible'}
                              </span>
                            </td>
                            <td>
                              <select 
                                className="form-select form-select-sm"
                                value={action.newStatus}
                                onChange={(e) => {
                                  const newActions = [...reservationActions];
                                  newActions[index].newStatus = e.target.value;
                                  setReservationActions(newActions);
                                }}
                              >
                                <option value="">Seleccionar...</option>
                                <option value="available">Disponible</option>
                                <option value="reserved">Reservado</option>
                                <option value="claimed">Reclamado</option>
                                <option value="picked_up">Recogido</option>
                              </select>
                            </td>
                            <td>
                              <select 
                                className="form-select form-select-sm"
                                value={action.action}
                                onChange={(e) => {
                                  const newActions = [...reservationActions];
                                  newActions[index].action = e.target.value;
                                  setReservationActions(newActions);
                                }}
                              >
                                <option value="">Seleccionar...</option>
                                <option value="force_available">Forzar Disponible</option>
                                <option value="force_reserved">Forzar Reservado</option>
                                <option value="force_claimed">Forzar Reclamado</option>
                                <option value="force_picked_up">Forzar Recogido</option>
                                <option value="reset_status">Resetear Estado</option>
                                <option value="fix_locker">Reparar Casillero</option>
                                <option value="clear_penalties">Limpiar Penalizaciones</option>
                              </select>
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-warning"
                                disabled={!action.newStatus && !action.action}
                                onClick={() => changeProductStatus(action.productId, action.newStatus, action.action)}
                              >
                                {manualActionLoading && manualActionProduct === action.productId ? (
                                  <span className="spinner-border spinner-border-sm" role="status" />
                                ) : (
                                  <i className="bi bi-tools"></i>
                                )}
                                Aplicar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReservationStatusModal(false)}>
                  Cerrar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    // Aplicar todos los cambios pendientes
                    alert('Funcionalidad de aplicación masiva en desarrollo');
                  }}
                >
                  Aplicar Todos los Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal del Panel de Debugging */}
      {showDebugPanel && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-xl admin-dashboard">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-bug text-danger"></i> Panel de Debugging - Errores y Logs
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDebugPanel(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={() => {
                        // Capturar estado actual del sistema
                        const systemState = {
                          timestamp: new Date().toISOString(),
                          individualProducts: individualProducts.length,
                          users: users.length,
                          products: products.length,
                          debugMode,
                          autoDebugEnabled
                        };
                        logDebugError('Estado del sistema capturado', systemState, 'info');
                      }}
                    >
                      <i className="bi bi-camera"></i> Capturar Estado
                    </button>
                    <button
                      className="btn btn-outline-warning btn-sm ms-2"
                      onClick={() => {
                        // Simular error para testing
                        logDebugError('Error de prueba generado', {
                          message: 'Este es un error de prueba para verificar el sistema de debugging',
                          timestamp: new Date().toISOString()
                        }, 'error');
                      }}
                    >
                      <i className="bi bi-exclamation-triangle"></i> Generar Error de Prueba
                    </button>
                  </div>
                  <div className="col-md-6 text-end">
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setDebugErrors([])}
                    >
                      <i className="bi bi-trash"></i> Limpiar Logs
                    </button>
                  </div>
                </div>
                
                {debugErrors.length === 0 ? (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No hay errores o logs de debug registrados.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Timestamp</th>
                          <th>Severidad</th>
                          <th>Mensaje</th>
                          <th>Detalles</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugErrors.map((error, index) => (
                          <tr key={error.id}>
                            <td>
                              <small>{new Date(error.timestamp).toLocaleString('es-CO')}</small>
                            </td>
                            <td>
                              <span className={`badge bg-${
                                error.severity === 'error' ? 'danger' : 
                                error.severity === 'warning' ? 'warning' : 'info'
                              }`}>
                                {error.severity === 'error' ? 'Error' : 
                                 error.severity === 'warning' ? 'Advertencia' : 'Info'}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold">{error.message}</div>
                            </td>
                            <td>
                              <details>
                                <summary>Ver detalles</summary>
                                <pre className="mt-2 small" style={{ maxHeight: '100px', overflow: 'auto' }}>
                                  {JSON.stringify(error.details, null, 2)}
                                </pre>
                              </details>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  const newErrors = debugErrors.filter((_, i) => i !== index);
                                  setDebugErrors(newErrors);
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDebugPanel(false)}>
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Exportar logs a archivo
                    const logsText = debugErrors.map(error => 
                      `[${error.timestamp}] ${error.severity.toUpperCase()}: ${error.message}`
                    ).join('\n');
                    const blob = new Blob([logsText], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `debug_logs_${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  <i className="bi bi-download"></i> Exportar Logs
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