import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import appointmentService from '../services/appointmentService';
import AppointmentScheduler from '../components/AppointmentScheduler';
import Locker3DVisualization from '../components/Locker3DVisualization';
import PackingOptimizationTips from '../components/PackingOptimizationTips';
import binPackingService from '../services/binPackingService';
import type { PackingResult, Bin3D, PackedItem } from '../services/binPackingService';
import type { Order, OrderItem } from '../types/order';
import type { CreateAppointmentData } from '../services/appointmentService';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagado - Selecciona casillero',
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

const OrdersPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [purchasedProducts, setPurchasedProducts] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Map<number, {
    quantity: number;
    lockerNumber: number;
  }>>(new Map());
  const [lockerAssignments, setLockerAssignments] = useState<Map<number, {
    totalVolume: number;
    items: Array<{ itemIndex: number; quantity: number; volume: number; productName: string }>;
  }>>(new Map());
  const [claimingProducts, setClaimingProducts] = useState(false);
  const [availableLockers, setAvailableLockers] = useState<number[]>([]);
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  const [schedulingAppointment, setSchedulingAppointment] = useState(false);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);
  const [showPackingOptimization, setShowPackingOptimization] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchPurchasedProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Obtener todos los productos comprados por el usuario
        const products = await orderService.getMyPurchasedProducts();
        console.log('Productos comprados:', products);
        setPurchasedProducts(products);
        
      } catch (err: any) {
        setError('Error al cargar tus productos comprados');
        console.error('Error fetching purchased products:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchPurchasedProducts();
  }, [isAuthenticated]);

  // Obtener casilleros disponibles
  useEffect(() => {
    const fetchAvailableLockers = async () => {
      try {
        const lockers = await orderService.getAvailableLockers();
        setAvailableLockers(lockers.available);
      } catch (err) {
        console.error('Error al obtener casilleros disponibles:', err);
      }
    };
    
    if (isAuthenticated) {
      fetchAvailableLockers();
    }
  }, [isAuthenticated]);

  // Cargar reservas activas
  useEffect(() => {
    const fetchMyAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const appointments = await appointmentService.getMyAppointments();
        setMyAppointments(appointments);
      } catch (err) {
        console.error('Error al cargar reservas:', err);
      } finally {
        setLoadingAppointments(false);
      }
    };
    
    if (isAuthenticated) {
      fetchMyAppointments();
    }
  }, [isAuthenticated]);

  // Calcular volumen total para un locker
  const calculateLockerVolume = (lockerNumber: number) => {
    const assignment = lockerAssignments.get(lockerNumber);
    return assignment ? assignment.totalVolume : 0;
  };

  // Verificar si un locker tiene espacio suficiente
  const hasLockerSpace = (lockerNumber: number, additionalVolume: number) => {
    const currentVolume = calculateLockerVolume(lockerNumber);
    const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm en cm³
    return (currentVolume + additionalVolume) <= LOCKER_MAX_VOLUME;
  };

  // Obtener porcentaje de uso del locker
  const getLockerUsagePercentage = (lockerNumber: number) => {
    const currentVolume = calculateLockerVolume(lockerNumber);
    const LOCKER_MAX_VOLUME = 125000;
    return Math.round((currentVolume / LOCKER_MAX_VOLUME) * 100);
  };

  // Utilidad para obtener dimensiones y volumen
  const getDimensiones = (item: OrderItem) => item.dimensiones || item.product?.dimensiones;
  const tieneDimensiones = (item: OrderItem) => {
    const d = getDimensiones(item);
    return d && d.largo && d.ancho && d.alto;
  };
  const getVolumen = (item: OrderItem) => {
    const d = getDimensiones(item);
    return d && d.largo && d.ancho && d.alto ? d.largo * d.ancho * d.alto : 0;
  };

  // Manejar selección de productos individuales
  const handleQuantityChange = (itemIndex: number, quantity: number) => {
    console.log(`🖱️ Cambiando cantidad para producto ${itemIndex}:`, quantity);
    
    const item = purchasedProducts[itemIndex];
    console.log('📦 Item:', item);
    
    // Solo permitir seleccionar productos no reclamados y no reservados
    if (item.isClaimed || item.assigned_locker) {
      console.log('❌ Producto no disponible para selección');
      return;
    }
    
    // Para productos individuales, solo permitir 0 o 1
    if (quantity !== 0 && quantity !== 1) {
      quantity = quantity > 0 ? 1 : 0;
    }
    
    console.log('✅ Cantidad final:', quantity);
    
    if (quantity === 0) {
      const newSelectedProducts = new Map(selectedProducts);
      newSelectedProducts.delete(itemIndex);
      console.log('🗑️ Eliminando producto de selección');
      setSelectedProducts(newSelectedProducts);
      updateLockerAssignments(newSelectedProducts);
      return;
    }

    const currentSelection = selectedProducts.get(itemIndex);
    const newSelectedProducts = new Map(selectedProducts);
    const defaultLocker = availableLockers.length > 0 ? availableLockers[0] : 1;
    
    newSelectedProducts.set(itemIndex, {
      quantity: 1, // Siempre 1 para productos individuales
      lockerNumber: currentSelection?.lockerNumber || defaultLocker
    });
    
    console.log('✅ Agregando producto a selección:', newSelectedProducts.get(itemIndex));
    setSelectedProducts(newSelectedProducts);
    updateLockerAssignments(newSelectedProducts);
  };

  // Manejar selección de locker
  const handleLockerChange = (itemIndex: number, lockerNumber: number) => {
    const currentSelection = selectedProducts.get(itemIndex);
    if (!currentSelection) return;

    const newSelectedProducts = new Map(selectedProducts);
    newSelectedProducts.set(itemIndex, {
      ...currentSelection,
      lockerNumber
    });
    
    setSelectedProducts(newSelectedProducts);
    updateLockerAssignments(newSelectedProducts);
  };

  // Actualizar asignaciones de lockers usando Bin Packing 3D
  const updateLockerAssignments = (newSelectedProducts: Map<number, { quantity: number; lockerNumber: number }>) => {
    console.log('🔄 Actualizando asignaciones de lockers...');
    console.log('Productos seleccionados:', newSelectedProducts);
    
    if (newSelectedProducts.size === 0) {
      console.log('❌ No hay productos seleccionados');
      setPackingResult(null);
      setLockerAssignments(new Map());
      return;
    }

    // Convertir productos seleccionados al formato del algoritmo
    const selectedItems = Array.from(newSelectedProducts.entries()).map(([itemIndex, selection]) => {
      const item = purchasedProducts[itemIndex];
      console.log(`📦 Producto ${itemIndex}:`, item.product.nombre, 'Cantidad:', selection.quantity);
      return {
        ...item,
        quantity: selection.quantity
      };
    });

    console.log('📋 Items convertidos:', selectedItems);

    // Aplicar algoritmo de Bin Packing 3D
    const products3D = binPackingService.convertProductsTo3D(selectedItems);
    console.log('🎯 Productos 3D:', products3D);
    
    const result = binPackingService.packProducts3D(products3D);
    console.log('📊 Resultado Bin Packing:', result);
    
    setPackingResult(result);

    // Convertir resultado del Bin Packing al formato original para compatibilidad
    const newAssignments = new Map();
    result.bins.forEach((bin, binIndex) => {
      const lockerNumber = binIndex + 1; // Asignar números de casillero secuencialmente
      const items = bin.items.map((packedItem, itemIndex) => {
        const originalItemIndex = selectedItems.findIndex(item => 
          item._id === packedItem.product.id
        );
        return {
          itemIndex: originalItemIndex >= 0 ? originalItemIndex : itemIndex,
          quantity: packedItem.product.quantity,
          volume: packedItem.volume,
          productName: packedItem.product.name
        };
      });

      newAssignments.set(lockerNumber, {
        totalVolume: bin.usedVolume,
        items
      });
    });

    console.log('🏷️ Asignaciones finales:', newAssignments);
    setLockerAssignments(newAssignments);
    
    // Actualizar selectedProducts con los números de casillero asignados por el algoritmo
    const updatedSelectedProducts = new Map(newSelectedProducts);
    
    result.bins.forEach((bin, binIndex) => {
      const lockerNumber = binIndex + 1;
      bin.items.forEach((packedItem) => {
        // Encontrar el índice del producto original
        const originalItemIndex = selectedItems.findIndex(item => 
          item._id === packedItem.product.id
        );
        
        if (originalItemIndex >= 0) {
          const currentSelection = updatedSelectedProducts.get(originalItemIndex);
          if (currentSelection) {
            updatedSelectedProducts.set(originalItemIndex, {
              ...currentSelection,
              lockerNumber: lockerNumber
            });
          }
        }
      });
    });
    
    console.log('🔄 Actualizando selectedProducts con asignaciones del algoritmo:', updatedSelectedProducts);
    setSelectedProducts(updatedSelectedProducts);
  };

  // Verificar si hay errores de validación
  const getValidationErrors = () => {
    const errors: string[] = [];

    // Si tenemos un resultado del Bin Packing, confiar en él
    if (packingResult && packingResult.bins.length > 0) {
      console.log('✅ Usando validación del Bin Packing - todos los productos caben correctamente');
      return errors; // No hay errores si el Bin Packing fue exitoso
    }

    // Solo validar manualmente si no hay resultado del Bin Packing
    selectedProducts.forEach((selection, itemIndex) => {
      const item = purchasedProducts[itemIndex];
      if (item.isClaimed || item.assigned_locker) return;
      if (!tieneDimensiones(item)) {
        errors.push(`El producto ${item.product.nombre} no tiene dimensiones configuradas`);
      }
      const itemVolume = getVolumen(item) * selection.quantity;
      if (!hasLockerSpace(selection.lockerNumber, itemVolume)) {
        errors.push(`Los productos en el casillero ${selection.lockerNumber} exceden el espacio disponible`);
      }
    });
    return errors;
  };

  // Manejar envío de reclamación
  const handleClaimSubmit = async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      alert('Errores de validación:\n' + errors.join('\n'));
      return;
    }

    if (selectedProducts.size === 0) {
      alert('Por favor selecciona al menos un producto para reclamar');
      return;
    }

    try {
      setClaimingProducts(true);
      
      const selectedItemsArray = Array.from(selectedProducts.entries()).map(([itemIndex, selection]) => {
        const item = purchasedProducts[itemIndex];
        return {
          individualProductId: item._id || '', // ID del producto individual
          lockerNumber: selection.lockerNumber
        };
      });

      const result = await orderService.claimIndividualProducts(selectedItemsArray);
      
      alert(`Productos reclamados exitosamente!\n\nCasilleros asignados:\n${result.lockerAssignments.map(la => 
        `Casillero ${la.locker}: ${la.volumePercentage}% de uso (${la.volume.toLocaleString()} cm³)`
      ).join('\n')}`);
      
      // Recargar los datos
      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);
      setSelectedProducts(new Map());
      setLockerAssignments(new Map());
      
    } catch (err: any) {
      alert(err.message || 'Error al reclamar productos');
    } finally {
      setClaimingProducts(false);
    }
  };

  // Limpiar selección
  const handleClearSelection = () => {
    setSelectedProducts(new Map());
    setLockerAssignments(new Map());
  };

  // Cancelar reserva
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      return;
    }

    try {
      await appointmentService.cancelAppointment(appointmentId);
      
      // Recargar las reservas
      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);
      
      alert('Reserva cancelada exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al cancelar la reserva');
    }
  };

  // Manejar agendamiento de cita
  const handleScheduleAppointment = async (appointmentData: CreateAppointmentData) => {
    try {
      setSchedulingAppointment(true);
      const result = await appointmentService.createAppointment(appointmentData);
      
      alert(`¡Casillero reservado exitosamente!\n\nFecha: ${new Date(appointmentData.scheduledDate).toLocaleDateString('es-CO')}\nHora: ${appointmentData.timeSlot}`);
      
      // Recargar los datos
      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);
      setSelectedProducts(new Map());
      setLockerAssignments(new Map());
      setShowAppointmentScheduler(false);
      
      // Recargar las reservas
      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);
      
    } catch (err: any) {
      alert(err.message || 'Error al agendar la cita');
    } finally {
      setSchedulingAppointment(false);
    }
  };

  const renderProductCard = (item: OrderItem, index: number) => {
    const isClaimed = item.isClaimed || false;
    const selectedProduct = selectedProducts.get(index);
    
    console.log(`🎯 Renderizando producto ${index}:`, {
      itemName: item.product.nombre,
      selectedProduct,
      isClaimed,
      assigned_locker: item.assigned_locker
    });
    
    return (
      <div key={index} className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-2">
              <img 
                src={item.product.imagen_url} 
                alt={item.product.nombre} 
                className="img-fluid rounded"
                style={{ width: 80, height: 80, objectFit: 'cover' }} 
              />
            </div>
            <div className="col-md-3">
              <h6 className="mb-1">{item.product.nombre}</h6>
              <p className="text-muted mb-1">{item.product.descripcion}</p>
              <div className="d-flex gap-2 flex-wrap">
                <span className="badge bg-primary">${item.unit_price.toLocaleString('es-CO')}</span>
                {(() => {
                  const d = getDimensiones(item);
                  return d ? (
                    <span className="badge bg-info">
                      {d.largo}×{d.ancho}×{d.alto} cm
                    </span>
                  ) : null;
                })()}
                {(() => {
                  const v = getVolumen(item);
                  return v ? (
                    <span className="badge bg-secondary">
                      {(v / 1000).toFixed(1)} L
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="col-md-2 text-center">
              <div className="mb-1">
                <strong>Producto:</strong> {item.individualIndex}/{item.totalInOrder}
              </div>
              <div className="mb-1">
                <span className={`badge ${isClaimed ? 'bg-success' : item.assigned_locker ? 'bg-warning' : 'bg-info'}`}>
                  {isClaimed ? 'Reclamado' : item.assigned_locker ? 'Reservado' : 'Disponible'}
                </span>
              </div>
              {isClaimed && item.assigned_locker && (
                <div>
                  <span className="badge bg-primary">Casillero {item.assigned_locker}</span>
                </div>
              )}
            </div>
            <div className="col-md-3">
              {!isClaimed && !item.assigned_locker ? (
                <div className="d-flex flex-column gap-2">
                  {/* Selector simple para productos individuales */}
                  <div className="d-flex align-items-center gap-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`select-${index}`}
                        checked={selectedProduct?.quantity === 1}
                        onChange={(e) => handleQuantityChange(index, e.target.checked ? 1 : 0)}
                      />
                      <label className="form-check-label small" htmlFor={`select-${index}`}>
                        Seleccionar producto
                      </label>
                    </div>
                  </div>
                  
                  {selectedProduct && (
                    <div className="d-flex align-items-center gap-2">
                      <label className="form-label mb-0 small">Casillero:</label>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary">
                          Casillero {selectedProduct.lockerNumber}
                        </span>
                        <small className="text-muted">
                          (Asignado automáticamente)
                        </small>
                      </div>
                    </div>
                  )}
                  
                  {selectedProduct && !tieneDimensiones(item) && (
                    <small className="text-warning">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Sin dimensiones
                    </small>
                  )}
                </div>
              ) : isClaimed ? (
                <div className="text-center">
                  <span className="badge bg-success">Ya reclamado</span>
                </div>
              ) : item.assigned_locker ? (
                <div className="text-center">
                  <span className="badge bg-warning">Ya reservado</span>
                </div>
              ) : null}
            </div>
            <div className="col-md-2 text-center">
              {isClaimed && item.assigned_locker && (
                <div>
                  <span className="badge bg-primary mb-2">Casillero {item.assigned_locker}</span>
                  <br />
                  <small className="text-muted">Asignado</small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <i className="bi bi-box-seam me-2"></i>
              Mis Productos Comprados
            </h2>
            {selectedProducts.size > 0 && (
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={handleClearSelection}
                  disabled={claimingProducts}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Limpiar Selección
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleClaimSubmit}
                  disabled={claimingProducts}
                >
                  {claimingProducts ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-seam me-1"></i>
                      Reclamar {selectedProducts.size} Producto{selectedProducts.size > 1 ? 's' : ''}
                    </>
                  )}
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => setShowAppointmentScheduler(true)}
                  disabled={claimingProducts}
                >
                  <i className="bi bi-calendar-check me-1"></i>
                  Reservar Casillero
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center">{error}</div>
          ) : purchasedProducts.length > 0 ? (
            <>
              {/* Productos */}
              <div className="mb-5">
                <h4 className="mb-3">
                  <i className="bi bi-cart me-2"></i>
                  Mis Productos Comprados
                </h4>
                {purchasedProducts.map((item, index) => renderProductCard(item, index))}
              </div>

              {/* Visualización de Casilleros con Bin Packing 3D */}
              {lockerAssignments.size > 0 && (
                <div className="mb-5">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">
                      <i className="bi bi-grid-3x3-gap me-2"></i>
                      Casilleros Optimizados (Bin Packing 3D)
                    </h4>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className={`btn ${showPackingOptimization ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setShowPackingOptimization(!showPackingOptimization)}
                      >
                        <i className="bi bi-cube me-1"></i>
                        {showPackingOptimization ? 'Vista Simple' : 'Vista 3D'}
                      </button>
                    </div>
                  </div>

                  {/* Estadísticas y recomendaciones del empaquetado */}
                  {packingResult && (
                    <div className="mb-3">
                      <PackingOptimizationTips result={packingResult} />
                    </div>
                  )}

                  <div className="row">
                    {showPackingOptimization && packingResult ? (
                      // Vista 3D optimizada
                      packingResult.bins.map((bin, index) => (
                        <div key={bin.id} className="col-md-6 mb-4">
                          <div className="card border-primary">
                            <div className="card-header bg-primary text-white">
                              <h6 className="mb-0">
                                <i className="bi bi-box me-2"></i>
                                Casillero {index + 1} - Optimizado
                              </h6>
                            </div>
                            <div className="card-body">
                              <Locker3DVisualization 
                                bin={bin}
                                showDetails={true}
                                onItemClick={(item) => {
                                  console.log('Producto clickeado:', item);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Vista simple original
                      Array.from(lockerAssignments.entries()).map(([lockerNumber, assignment]) => (
                        <div key={lockerNumber} className="col-md-4 mb-3">
                          <div className="card border-primary">
                            <div className="card-header bg-primary text-white">
                              <h6 className="mb-0">
                                <i className="bi bi-box me-2"></i>
                                Casillero {lockerNumber}
                              </h6>
                            </div>
                            <div className="card-body">
                              <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <small>Uso del espacio:</small>
                                  <small>{getLockerUsagePercentage(lockerNumber)}%</small>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                  <div 
                                    className={`progress-bar ${getLockerUsagePercentage(lockerNumber) > 90 ? 'bg-danger' : getLockerUsagePercentage(lockerNumber) > 70 ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${getLockerUsagePercentage(lockerNumber)}%` }}
                                  ></div>
                                </div>
                                <small className="text-muted">
                                  {assignment.totalVolume.toLocaleString()} / 125,000 cm³
                                </small>
                              </div>
                              <div>
                                <small className="text-muted d-block mb-2">Productos asignados:</small>
                                {assignment.items.map((item, idx) => (
                                  <div key={idx} className="d-flex justify-content-between align-items-center mb-1">
                                    <small className="text-truncate" style={{ maxWidth: '150px' }}>
                                      {item.productName}
                                    </small>
                                    <small className="badge bg-secondary">
                                      {item.quantity} × {(item.volume / item.quantity / 1000).toFixed(1)}L
                                    </small>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Errores de validación */}
              {getValidationErrors().length > 0 && (
                <div className="alert alert-warning">
                  <h6 className="alert-heading">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Errores de validación:
                  </h6>
                  <ul className="mb-0">
                    {getValidationErrors().map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mis Reservas Activas */}
              <div className="mb-5">
                <h4 className="mb-3">
                  <i className="bi bi-calendar-check me-2"></i>
                  Mis Reservas Activas
                </h4>
                
                {loadingAppointments ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Cargando reservas...</span>
                    </div>
                  </div>
                ) : myAppointments.length > 0 ? (
                  <div className="row">
                    {myAppointments
                      .filter(appointment => appointment.status !== 'cancelled' && appointment.status !== 'completed')
                      .map((appointment) => (
                        <div key={appointment._id} className="col-md-6 mb-3">
                          <div className="card border-success">
                            <div className="card-header bg-success text-white">
                              <div className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">
                                  <i className="bi bi-calendar-event me-2"></i>
                                  Reserva #{appointment._id.slice(-6)}
                                </h6>
                                <span className={`badge ${appointment.status === 'confirmed' ? 'bg-light text-dark' : 'bg-warning'}`}>
                                  {appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                </span>
                              </div>
                            </div>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <p className="mb-1">
                                    <strong>Fecha:</strong><br />
                                    {new Date(appointment.scheduledDate).toLocaleDateString('es-CO')}
                                  </p>
                                  <p className="mb-1">
                                    <strong>Hora:</strong><br />
                                    {appointment.timeSlot}
                                  </p>
                                </div>
                                <div className="col-md-6">
                                  <p className="mb-1">
                                    <strong>Casilleros:</strong><br />
                                    {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
                                  </p>
                                  <p className="mb-1">
                                    <strong>Productos:</strong><br />
                                    {appointment.itemsToPickup.length} producto{appointment.itemsToPickup.length > 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleCancelAppointment(appointment._id)}
                                >
                                  <i className="bi bi-x-circle me-1"></i>
                                  Cancelar Reserva
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="alert alert-info text-center">
                    <i className="bi bi-calendar-x me-2"></i>
                    No tienes reservas activas
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="alert alert-info text-center">
              <h5>No tienes productos comprados</h5>
              <p>Cuando hagas una compra, tus productos aparecerán aquí para que puedas reclamarlos.</p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Ir a Comprar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Agendamiento de Citas */}
      {showAppointmentScheduler && (
        <AppointmentScheduler
          isOpen={showAppointmentScheduler}
          onClose={() => setShowAppointmentScheduler(false)}
          onSchedule={handleScheduleAppointment}
          orderId={purchasedProducts[0]?.orderId || ''}
          itemsToPickup={Array.from(selectedProducts.entries()).map(([itemIndex, selection]) => ({
            product: purchasedProducts[itemIndex]._id || '', // ID del producto individual
            quantity: selection.quantity,
            lockerNumber: selection.lockerNumber
          }))}
          loading={schedulingAppointment}
        />
      )}
    </div>
  );
};

export default OrdersPage; 