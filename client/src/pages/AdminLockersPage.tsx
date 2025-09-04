import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import Locker3DCanvas from '../components/Locker3DCanvas';
import gridPackingService from '../services/gridPackingService';
import productService, { getVariantOrProductDimensions } from '../services/productService';
import lockerAssignmentService, { type LockerAssignment, type LockerProduct } from '../services/lockerAssignmentService';
import DateUtils from '../utils/dateUtils';

import './AdminLockersPage.css';

interface LockerReservation {
  lockerNumber: number;
  assignment: LockerAssignment;
  user: {
    nombre: string;
    email: string;
  };
  items: LockerProduct[];
  status: string;
}

interface FilterOptions {
  status: string;
  userSearch: string;
  lockerNumber: string;
}



const AdminLockersPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lockerAssignments, setLockerAssignments] = useState<LockerAssignment[]>([]);
  const [reservations, setReservations] = useState<LockerReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para visualización 3D
  const [show3DView, setShow3DView] = useState(false);
  const [selectedLocker, setSelectedLocker] = useState<number | null>(null);
  const [locker3DData, setLocker3DData] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<LockerReservation | null>(null);
  
  // Estados para filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    userSearch: '',
    lockerNumber: ''
  });

  // Horarios disponibles
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00'
  ];

  // Opciones de estado para filtros
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'scheduled', label: 'Programada' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'no_show', label: 'No se presentó' }
  ];

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  // Establecer fecha actual por defecto
  useEffect(() => {
    setSelectedDate(DateUtils.getCurrentDate());
  }, []);

  // Cargar citas cuando cambia la fecha
  useEffect(() => {
    if (selectedDate) {
      console.log('🔍 useEffect - Fecha seleccionada:', selectedDate);
      loadAppointmentsForDate(selectedDate);
    }
  }, [selectedDate]);

  // Cargar reservas cuando cambia la hora
  useEffect(() => {
    if (selectedDate && selectedTime) {
      console.log('🔍 useEffect - Fecha y hora seleccionadas:', selectedDate, selectedTime);
      loadReservationsForDateTime(selectedDate, selectedTime);
    }
  }, [selectedDate, selectedTime]);

  // Debug: Log del estado actual
  useEffect(() => {
    console.log('🔍 Estado actual AdminLockersPage:', {
      selectedDate,
      selectedTime,
      appointmentsCount: appointments.length,
      reservationsCount: reservations.length,
      loading,
      error
    });
  }, [selectedDate, selectedTime, appointments, reservations, loading, error]);

  const loadAppointmentsForDate = async (date: string) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 loadAppointmentsForDate - Fecha solicitada:', date);
      
      // Llamar al servicio real del backend
      const appointmentsData = await appointmentService.getAllAppointments({
        date: date
      });
      
      console.log('🔍 loadAppointmentsForDate - Citas recibidas del backend:', appointmentsData.length);
      console.log('🔍 loadAppointmentsForDate - Primera cita:', appointmentsData[0]);
      
      setAppointments(appointmentsData);
    } catch (err: any) {
      setError('Error al cargar las citas: ' + err.message);
      console.error('Error loading appointments:', err);
      
      // Debug adicional
      console.error('🔍 Error completo:', err);
      console.error('🔍 Error message:', err.message);
      console.error('🔍 Error stack:', err.stack);
    } finally {
      setLoading(false);
    }
  };

  // Función de prueba para verificar la API
  const testAPI = async () => {
    try {
      console.log('🔍 Probando API...');
      const testData = await appointmentService.getAllAppointments({
        date: selectedDate || new Date().toISOString().split('T')[0]
      });
      console.log('🔍 API funcionando, datos recibidos:', testData.length);
      alert(`API funcionando correctamente. Citas encontradas: ${testData.length}`);
    } catch (error) {
      console.error('🔍 Error en API:', error);
      alert(`Error en API: ${error}`);
    }
  };

  // Función para sincronizar asignaciones desde citas existentes
  const syncLockerAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Sincronizando asignaciones de casilleros para fecha:', selectedDate);
      
      const assignments = await lockerAssignmentService.syncFromAppointments(selectedDate);
      console.log('🔍 Asignaciones sincronizadas:', assignments);
      
      // Si hay hora seleccionada, cargar las reservas para esa hora
      if (selectedTime) {
        await loadReservationsForDateTime(selectedDate, selectedTime);
      }
      
      alert(`Sincronización completada. ${assignments.length} asignaciones procesadas.`);
      
    } catch (err: any) {
      setError('Error al sincronizar: ' + err.message);
      console.error('Error syncing locker assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para sincronizar todas las citas existentes
  const syncAllAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Sincronizando todas las citas existentes...');
      
      const response = await fetch('/api/sync/sync-all-appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error en la sincronización');
      }
      
      const result = await response.json();
      console.log('🔍 Resultado de sincronización:', result);
      
      // Recargar las citas y reservas
      await loadAppointmentsForDate(selectedDate);
      if (selectedTime) {
        await loadReservationsForDateTime(selectedDate, selectedTime);
      }
      
      alert('Sincronización completa de todas las citas exitosa.');
      
    } catch (err: any) {
      setError('Error al sincronizar todas las citas: ' + err.message);
      console.error('Error syncing all appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReservationsForDateTime = async (date: string, time: string) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 loadReservationsForDateTime - Fecha seleccionada:', date);
      console.log('🔍 loadReservationsForDateTime - Hora seleccionada:', time);
      
      // Obtener asignaciones de casilleros para la fecha y hora específicas
      let assignments = await lockerAssignmentService.getAssignmentsByDateTime(date, time);
      console.log('🔍 Asignaciones de casilleros obtenidas:', assignments);
      
      // Si no hay assignments, intentar sincronizar automáticamente
      if (assignments.length === 0) {
        console.log('⚠️ No se encontraron assignments, intentando sincronizar...');
        setSyncing(true);
        try {
          await lockerAssignmentService.syncFromAppointments(date);
          console.log('✅ Sincronización completada, reintentando obtener assignments...');
          
          // Reintentar obtener assignments después de la sincronización
          assignments = await lockerAssignmentService.getAssignmentsByDateTime(date, time);
          console.log('🔍 Asignaciones después de sincronización:', assignments);
        } catch (syncError) {
          console.error('❌ Error en sincronización automática:', syncError);
          // Continuar sin assignments si la sincronización falla
        } finally {
          setSyncing(false);
        }
      }
      
      // Convertir a formato de reservas
      const reservationsData: LockerReservation[] = assignments.map(assignment => ({
        lockerNumber: assignment.lockerNumber,
        assignment: assignment,
        user: {
          nombre: assignment.userName,
          email: assignment.userEmail
        },
        items: assignment.products,
        status: assignment.status
      }));

      console.log('🔍 Reservas generadas:', reservationsData.length);
      setReservations(reservationsData);
      setLockerAssignments(assignments);
      
      // Si aún no hay reservas, mostrar mensaje informativo
      if (reservationsData.length === 0) {
        setError('No se encontraron reservas para esta fecha y hora. Intenta sincronizar manualmente usando los botones de sincronización.');
      }
      
    } catch (err: any) {
      setError('Error al cargar las reservas: ' + err.message);
      console.error('Error loading reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar datos 3D para un casillero específico (NUEVA LÓGICA)
  const generate3DDataForLocker = async (lockerNumber: number) => {
    try {
      // Buscar la asignación del casillero específico
      const assignment = lockerAssignments.find(ass => ass.lockerNumber === lockerNumber);
      
      if (!assignment) {
        console.log(`🔍 No se encontró asignación para el casillero ${lockerNumber}`);
        return null;
      }

      console.log(`🔍 Generando datos 3D para casillero ${lockerNumber}:`, assignment);

      // Convertir productos al formato Product3D usando la nueva lógica
      const products3DPromises = assignment.products.map(async (product) => {
        console.log(`🔍 Procesando producto: ${product.productName}`, {
          dimensions: product.dimensions,
          variantDimensions: (product as any).variantDimensions,
          calculatedSlots: product.calculatedSlots,
          volume: product.volume,
          variants: product.variants
        });

        // Priorizar dimensiones de variantes buscando en la colección de productos por ID
        const productIdToFetch = product.originalProductId || product.productId;
        let finalDims = product.dimensions;
        try {
          const fullProduct = await productService.getProductById(productIdToFetch);
          const dimsFromVariants = getVariantOrProductDimensions(fullProduct as any, product.variants as any);
          if (dimsFromVariants && dimsFromVariants.largo && dimsFromVariants.ancho && dimsFromVariants.alto) {
            finalDims = dimsFromVariants as any;
          }
        } catch (fetchErr) {
          console.warn('⚠️ No se pudo obtener el producto para dimensiones de variante:', fetchErr);
        }

        const { largo, ancho, alto } = finalDims;
        return {
          id: product.productId,
          name: product.productName,
          dimensions: { length: largo, width: ancho, height: alto },
          quantity: product.quantity,
          volume: (finalDims.largo * finalDims.ancho * finalDims.alto)
        };
      });

      const products3D = await Promise.all(products3DPromises);

      console.log('📦 Productos 3D generados:', products3D);

      // Realizar bin packing
      const result = gridPackingService.packProducts3D(products3D);
      
      console.log('🎯 Resultado del bin packing:', {
        lockers: result.lockers.length,
        failedProducts: result.failedProducts.length,
        rejectedProducts: result.rejectedProducts.length,
        totalEfficiency: result.totalEfficiency
      });

      if (result.lockers.length > 0) {
        // Usar el primer locker (que debería ser el único)
        const locker = result.lockers[0];
        console.log('📊 Casillero seleccionado:', {
          id: locker.id,
          usedSlots: locker.usedSlots,
          totalSlots: 27,
          products: locker.packedProducts.length,
          isFull: locker.isFull,
          productsList: locker.packedProducts.map(p => p.product.name)
        });

        return {
          ...locker,
          id: `locker_${lockerNumber}`,
          lockerNumber: lockerNumber
        };
      }

      return null;
    } catch (error) {
      console.error('Error generando datos 3D:', error);
      return null;
    }
  };

  // Aplicar filtros avanzados
  const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      // Filtro por estado
      if (filters.status && reservation.status !== filters.status) return false;
      
      // Filtro por usuario
      if (filters.userSearch) {
        const searchLower = filters.userSearch.toLowerCase();
        const userName = reservation.user.nombre.toLowerCase();
        const userEmail = reservation.user.email.toLowerCase();
        if (!userName.includes(searchLower) && !userEmail.includes(searchLower)) {
          return false;
        }
      }
      
      // Filtro por número de casillero
      if (filters.lockerNumber && reservation.lockerNumber.toString() !== filters.lockerNumber) {
        return false;
      }
      
      return true;
    });
  }, [reservations, filters]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(''); // Resetear hora al cambiar fecha
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
  };

  const handleShow3DView = async (lockerNumber: number) => {
    setSelectedLocker(lockerNumber);
    const lockerData = await generate3DDataForLocker(lockerNumber);
    setLocker3DData(lockerData);
    setShow3DView(true);
  };

  const handleShowDetails = (reservation: LockerReservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const handleClose3DView = () => {
    setShow3DView(false);
    setSelectedLocker(null);
    setLocker3DData(null);
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      userSearch: '',
      lockerNumber: ''
    });
  };

  const exportToCSV = () => {
    if (filteredReservations.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = [
      'Fecha', 'Hora', 'Casillero', 'Usuario', 'Email', 
      'Estado', 'Productos', 'Cantidad Total'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredReservations.map(reservation => [
        selectedDate,
        selectedTime,
        reservation.lockerNumber,
        `"${reservation.user.nombre}"`,
        `"${reservation.user.email}"`,
        reservation.status,
                 `"${reservation.items.map(item => item.productName).join('; ')}"`,
         reservation.items.reduce((total, item) => total + item.quantity, 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_${selectedDate}_${selectedTime}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return DateUtils.formatDateForDisplay(dateString);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Programada',
      'confirmed': 'Confirmada',
      'completed': 'Completada',
      'cancelled': 'Cancelada',
      'no_show': 'No se presentó'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'scheduled': 'warning',
      'confirmed': 'primary',
      'completed': 'success',
      'cancelled': 'danger',
      'no_show': 'secondary'
    };
    return colorMap[status] || 'secondary';
  };

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-dashboard admin-lockers-page" data-theme="light">
      <header className="admin-header-bar">
        <div className="header-content">
          <div className="header-left">
            <i className="bi bi-boxes header-icon"></i>
            <span className="header-title">Gestión de Casilleros</span>
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
          {/* Selector de Fecha y Hora */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card date-time-selector">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-calendar-event me-2"></i>
                    Seleccionar Fecha y Hora
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-calendar me-1"></i>
                        Fecha
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        min={DateUtils.getCurrentDate()}
                        max={DateUtils.getMaxAllowedDate()}
                        style={{ 
                          position: 'relative',
                          zIndex: 1
                        }}
                      />
                      {selectedDate && (
                        <small className="text-muted">
                          {formatDate(selectedDate)}
                        </small>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-clock me-1"></i>
                        Hora
                      </label>
                      <select
                        className="form-select"
                        value={selectedTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        disabled={!selectedDate}
                      >
                        <option value="">Seleccionar hora...</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Panel de Debug */}
                  <div className="row mt-3">
                    <div className="col-12">
                      <div className="alert alert-secondary debug-panel">
                        <h6 className="mb-2">
                          <i className="bi bi-info-circle me-2"></i>
                          Estado del Sistema
                        </h6>
                        <div className="row">
                          <div className="col-md-3">
                            <small><strong>Fecha:</strong> {selectedDate || 'No seleccionada'}</small>
                          </div>
                          <div className="col-md-3">
                            <small><strong>Hora:</strong> {selectedTime || 'No seleccionada'}</small>
                          </div>
                          <div className="col-md-3">
                            <small><strong>Citas:</strong> {appointments.length}</small>
                          </div>
                          <div className="col-md-3">
                            <small><strong>Reservas:</strong> {reservations.length}</small>
                          </div>
                        </div>
                        {loading && (
                          <div className="mt-2">
                            <small className="text-info">
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Cargando...
                            </small>
                          </div>
                        )}
                        {error && (
                          <div className="mt-2">
                            <small className="text-danger">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              Error: {error}
                            </small>
                          </div>
                        )}
                                                 <div className="mt-2">
                           <button
                             className="btn btn-outline-warning btn-sm me-2"
                             onClick={testAPI}
                             title="Probar conexión con la API"
                           >
                             <i className="bi bi-wifi me-1"></i>
                             Probar API
                           </button>
                           <button
                             className="btn btn-outline-success btn-sm"
                             onClick={syncLockerAssignments}
                             title="Sincronizar asignaciones de casilleros"
                             disabled={!selectedDate}
                           >
                             <i className="bi bi-arrow-repeat me-1"></i>
                             Sincronizar
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información de la Selección */}
          {selectedDate && selectedTime && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="alert alert-info selection-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Mostrando reservas para:</strong> {formatDate(selectedDate)} a las {selectedTime}
                  <span className="badge bg-primary ms-2">{filteredReservations.length} reservas</span>
                </div>
              </div>
            </div>
          )}

          {/* Información de Citas Disponibles */}
          {selectedDate && !selectedTime && appointments.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="alert alert-success">
                  <i className="bi bi-calendar-check me-2"></i>
                  <strong>Citas disponibles para {formatDate(selectedDate)}:</strong> {appointments.length} citas encontradas
                  <br />
                  <small className="text-muted">
                    Selecciona una hora específica para ver las reservas de casilleros
                  </small>
                  <div className="mt-2">
                    <button
                      className="btn btn-outline-success btn-sm"
                      onClick={() => loadAppointmentsForDate(selectedDate)}
                      title="Recargar citas"
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Recargar Citas
                    </button>
                    <button
                      className="btn btn-outline-info btn-sm ms-2"
                      onClick={() => {
                        console.log('🔍 Debug - Estado completo:', {
                          selectedDate,
                          selectedTime,
                          appointments,
                          reservations,
                          loading,
                          error
                        });
                      }}
                      title="Mostrar debug en consola"
                    >
                      <i className="bi bi-bug me-1"></i>
                      Debug
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información de Citas Disponibles */}
          {selectedDate && !selectedTime && appointments.length === 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>No hay citas programadas para {formatDate(selectedDate)}</strong>
                  <br />
                  <small className="text-muted">
                    No se encontraron citas para esta fecha
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* Filtros Avanzados */}
          {selectedDate && selectedTime && reservations.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card advanced-filters">
                  <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">
                        <i className="bi bi-funnel me-2"></i>
                        Filtros Avanzados
                      </h6>
                      <div className="export-filters-buttons">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={exportToCSV}
                        >
                          <i className="bi bi-download me-1"></i>
                          Exportar CSV
                        </button>
                        <button
                          className="btn btn-outline-success btn-sm me-2"
                          onClick={syncLockerAssignments}
                          disabled={loading || syncing}
                        >
                          {syncing ? (
                            <>
                              <div className="spinner-border spinner-border-sm me-1" role="status">
                                <span className="visually-hidden">Sincronizando...</span>
                              </div>
                              Sincronizando...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Sincronizar Fecha
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-outline-warning btn-sm me-2"
                          onClick={syncAllAppointments}
                          disabled={loading || syncing}
                        >
                          {syncing ? (
                            <>
                              <div className="spinner-border spinner-border-sm me-1" role="status">
                                <span className="visually-hidden">Sincronizando...</span>
                              </div>
                              Sincronizando...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-arrow-repeat me-1"></i>
                              Sincronizar Todo
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        >
                          <i className="bi bi-gear me-1"></i>
                          {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} Filtros
                        </button>
                      </div>
                    </div>
                  </div>
                  {showAdvancedFilters && (
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-3">
                          <label className="form-label">Estado</label>
                          <select
                            className="form-select form-select-sm"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Buscar Usuario</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Nombre o email..."
                            value={filters.userSearch}
                            onChange={(e) => handleFilterChange('userSearch', e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Número de Casillero</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Ej: 1, 2, 3..."
                            value={filters.lockerNumber}
                            onChange={(e) => handleFilterChange('lockerNumber', e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">&nbsp;</label>
                          <button
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={clearFilters}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            Limpiar Filtros
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lista de Reservas */}
          {selectedDate && selectedTime && (
            <div className="row">
              <div className="col-12">
                <div className="card reservations-table">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-list-ul me-2"></i>
                      Reservas para {selectedTime}
                    </h5>
                  </div>
                  <div className="card-body">
                    {loading ? (
                      <div className="text-center">
                        <div className="spinner-border loading-spinner" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                      </div>
                    ) : syncing ? (
                      <div className="alert alert-info text-center">
                        <div className="d-flex align-items-center justify-content-center">
                          <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Sincronizando...</span>
                          </div>
                          <span>Sincronizando asignaciones de casilleros...</span>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="alert alert-danger text-center">{error}</div>
                    ) : filteredReservations.length === 0 ? (
                      <div className="text-center empty-state">
                        <i className="bi bi-inbox display-1 text-muted"></i>
                        <p className="text-muted mt-3">
                          {reservations.length === 0 
                            ? 'No hay reservas para esta fecha y hora'
                            : 'No hay reservas que coincidan con los filtros aplicados'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-dark">
                            <tr>
                              <th>Casillero</th>
                              <th>Usuario</th>
                              <th>Email</th>
                              <th>Objetos</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReservations.map((reservation, index) => (
                              <tr key={index}>
                                <td>
                                  <span className="locker-badge">
                                    Casillero {reservation.lockerNumber}
                                  </span>
                                </td>
                                <td>
                                  <div className="user-info">
                                    <div className="user-name">{reservation.user.nombre}</div>
                                  </div>
                                </td>
                                <td>
                                  <div className="user-email">{reservation.user.email}</div>
                                </td>
                                <td>
                                                                     <div className="items-list">
                                     {reservation.items.map((item, idx) => (
                                       <div key={idx} className="item-badge">
                                         <div className="d-flex align-items-center">
                                           <div className="bg-secondary rounded me-2 d-flex align-items-center justify-content-center" 
                                                style={{ width: 20, height: 20 }}>
                                             <i className="bi bi-box text-white" style={{ fontSize: '10px' }}></i>
                                           </div>
                                           <span className="item-name">{item.productName}</span>
                                         </div>
                                         <span className="item-quantity">x{item.quantity}</span>
                                       </div>
                                     ))}
                                   </div>
                                </td>
                                <td>
                                  <span className={`badge bg-${getStatusColor(reservation.status)}`}>
                                    {getStatusLabel(reservation.status)}
                                  </span>
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm action-buttons">
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => handleShow3DView(reservation.lockerNumber)}
                                      title="Ver visualización 3D"
                                    >
                                      <i className="bi bi-box"></i>
                                      <span>3D</span>
                                    </button>
                                    <button
                                      className="btn btn-outline-info"
                                      onClick={() => handleShowDetails(reservation)}
                                      title="Ver detalles"
                                    >
                                      <i className="bi bi-eye"></i>
                                      <span>Ver</span>
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
                </div>
              </div>
            </div>
          )}

          {/* Instrucciones */}
          {!selectedDate && (
            <div className="row">
              <div className="col-12">
                <div className="card instructions-card">
                  <div className="card-body text-center">
                    <i className="bi bi-calendar-plus display-1 text-muted"></i>
                    <h5 className="mt-3">Selecciona una fecha y hora</h5>
                    <p className="text-muted">
                      Elige una fecha y hora específica para ver las reservas de casilleros
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Citas Disponibles (antes de seleccionar hora) */}
          {selectedDate && !selectedTime && appointments.length > 0 && (
            <div className="row">
              <div className="col-12">
                <div className="card appointments-table">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-calendar-event me-2"></i>
                      Citas Disponibles para {formatDate(selectedDate)}
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Hora</th>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Productos</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((appointment, index) => (
                            <tr key={index}>
                              <td>
                                <span className="time-badge">
                                  {appointment.timeSlot}
                                </span>
                              </td>
                              <td>
                                <div className="user-info">
                                  <div className="user-name">{appointment.user?.nombre || 'N/A'}</div>
                                </div>
                              </td>
                              <td>
                                <div className="user-email">{appointment.user?.email || 'N/A'}</div>
                              </td>
                              <td>
                                                                 <div className="items-list">
                                   {appointment.itemsToPickup.map((item, idx) => (
                                     <div key={idx} className="item-badge">
                                       <div className="d-flex align-items-center">
                                         <div className="bg-secondary rounded me-2 d-flex align-items-center justify-content-center" 
                                              style={{ width: 20, height: 20 }}>
                                           <i className="bi bi-box text-white" style={{ fontSize: '10px' }}></i>
                                         </div>
                                         <span className="item-name">
                                           {item.product?.nombre || 
                                            (item.individualProduct as any)?.product?.nombre || 
                                            (item.originalProduct as any)?.nombre || 'Producto sin nombre'}
                                         </span>
                                       </div>
                                       <span className="item-quantity">x{item.quantity}</span>
                                     </div>
                                   ))}
                                 </div>
                              </td>
                              <td>
                                <span className={`badge bg-${getStatusColor(appointment.status)}`}>
                                  {getStatusLabel(appointment.status)}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={async () => {
                                    setSelectedTime(appointment.timeSlot);
                                    // Cargar reservas automáticamente al seleccionar hora
                                    await loadReservationsForDateTime(selectedDate, appointment.timeSlot);
                                  }}
                                  title="Seleccionar esta hora"
                                >
                                  <i className="bi bi-clock me-1"></i>
                                  Seleccionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Visualización 3D */}
      {show3DView && selectedLocker && locker3DData && (
        <div className="modal fade show d-block visualization-modal" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-cube me-2"></i>
                  Visualización 3D - Casillero {selectedLocker}
                </h5>
                <button type="button" className="btn-close" onClick={handleClose3DView}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  Visualización 3D del casillero {selectedLocker} para {formatDate(selectedDate)} a las {selectedTime}
                </div>
                
                {/* Componente Locker3DCanvas para visualización 3D real */}
                <div className="text-center">
                  <Locker3DCanvas 
                    bin={locker3DData}
                  />
                </div>
                
                {/* Información adicional del casillero */}
                <div className="mt-3">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Información del Casillero</h6>
                      <ul className="list-unstyled">
                        <li><strong>Casillero:</strong> {selectedLocker}</li>
                        <li><strong>Slots usados:</strong> {locker3DData.usedSlots}/27</li>
                        <li><strong>Productos:</strong> {locker3DData.packedProducts.length}</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6>Productos en el Casillero</h6>
                      <ul className="list-unstyled">
                        {locker3DData.packedProducts.map((item: any, index: number) => (
                          <li key={index}>
                            <strong>{item.product.name}</strong> x{item.product.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleClose3DView}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Reserva */}
      {showDetailModal && selectedReservation && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-info-circle me-2"></i>
                  Detalles de Reserva - Casillero {selectedReservation.lockerNumber}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Información General */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="bi bi-person me-2"></i>
                          Información del Usuario
                        </h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Nombre:</strong> {selectedReservation.user.nombre}</p>
                        <p><strong>Email:</strong> {selectedReservation.user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card h-100">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="bi bi-calendar me-2"></i>
                          Información de la Reserva
                        </h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Fecha:</strong> {formatDate(selectedDate)}</p>
                        <p><strong>Hora:</strong> {selectedTime}</p>
                        <p><strong>Casillero:</strong> {selectedReservation.lockerNumber}</p>
                        <p><strong>Estado:</strong> 
                          <span className={`badge ms-2 ${
                            selectedReservation.status === 'pending' ? 'bg-warning' :
                            selectedReservation.status === 'completed' ? 'bg-success' :
                            selectedReservation.status === 'cancelled' ? 'bg-danger' :
                            'bg-secondary'
                          }`}>
                            {selectedReservation.status === 'pending' ? 'Pendiente' :
                             selectedReservation.status === 'completed' ? 'Completada' :
                             selectedReservation.status === 'cancelled' ? 'Cancelada' :
                             selectedReservation.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productos Detallados */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="bi bi-box-seam me-2"></i>
                      Productos en la Reserva ({selectedReservation.items.length})
                    </h6>
                  </div>
                  <div className="card-body">
                                         <div className="row">
                       {selectedReservation.items.map((item, index) => (
                         <div key={index} className="col-md-6 mb-3">
                           <div className="card border">
                             <div className="card-body p-3">
                               <div className="d-flex align-items-center">
                                 <div className="bg-secondary rounded me-3 d-flex align-items-center justify-content-center" 
                                      style={{ width: '60px', height: '60px' }}>
                                   <i className="bi bi-box text-white" style={{ fontSize: '24px' }}></i>
                                 </div>
                                 <div className="flex-grow-1">
                                   <h6 className="mb-1">{item.productName}</h6>
                                   <p className="mb-0 text-muted">
                                     <strong>Cantidad:</strong> {item.quantity}
                                   </p>
                                   <p className="mb-0 text-muted">
                                     <strong>Slots:</strong> {item.calculatedSlots}
                                   </p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>

                {/* Información Técnica */}
                <div className="card mt-3">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="bi bi-gear me-2"></i>
                      Información Técnica
                    </h6>
                  </div>
                  <div className="card-body">
                                         <div className="row">
                       <div className="col-md-6">
                         <p><strong>ID de Reserva:</strong> <code>{selectedReservation.assignment._id}</code></p>
                         <p><strong>Fecha de Creación:</strong> {new Date(selectedReservation.assignment.createdAt || '').toLocaleDateString()}</p>
                       </div>
                       <div className="col-md-6">
                         <p><strong>Total de Productos:</strong> {selectedReservation.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                         <p><strong>Tipos de Productos:</strong> {selectedReservation.items.length}</p>
                         <p><strong>Total de Slots:</strong> {selectedReservation.assignment.totalSlotsUsed}/27</p>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleShow3DView(selectedReservation.lockerNumber);
                  }}
                >
                  <i className="bi bi-cube me-1"></i>
                  Ver Visualización 3D
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLockersPage;
