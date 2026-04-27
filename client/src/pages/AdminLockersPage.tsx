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
import authService from '../services/authService';

import './AdminLockersPage.css';
import './AdminModalImprovements.css';
import ConfirmModal from '../components/ConfirmModal';

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

  // Estados para actualización automática
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectingTime, setSelectingTime] = useState(false);

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

  // Estado para el modal de confirmación
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'primary' | 'danger' | 'warning' | 'success';
    type?: 'confirm' | 'alert';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
  });

  // Helper para mostrar confirmación asíncrona
  const showConfirm = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' = 'primary', confirmText: string = 'Confirmar'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        variant,
        confirmText,
        type: 'confirm',
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve(false);
        }
      });
    });
  };

  // Helper para mostrar alertas
  const showAlert = (title: string, message: string, variant: 'primary' | 'danger' | 'warning' | 'success' = 'primary'): Promise<void> => {
    return new Promise((resolve) => {
      setModalConfig({
        show: true,
        title,
        message,
        variant,
        type: 'alert',
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve();
        },
        onCancel: () => {
          setModalConfig(prev => ({ ...prev, show: false }));
          resolve();
        }
      });
    });
  };

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

  // Estados para mostrar citas canceladas
  const [showCancelledAppointments, setShowCancelledAppointments] = useState(false);
  const [cancelledAppointments, setCancelledAppointments] = useState<Appointment[]>([]);

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
      loadCancelledAppointmentsForDate(selectedDate);
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

  // Efecto para actualización automática
  useEffect(() => {
    if (autoRefresh && selectedDate && selectedTime && !loading) {
      console.log('🔄 Iniciando actualización automática cada 30 segundos');

      const interval = setInterval(async () => {
        try {
          console.log('🔄 Actualización automática ejecutándose...');
          await loadReservationsForDateTime(selectedDate, selectedTime, true);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error en actualización automática:', error);
        }
      }, 30000); // 30 segundos

      setRefreshInterval(interval);

      return () => {
        console.log('🔄 Limpiando intervalo de actualización automática');
        clearInterval(interval);
      };
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, selectedDate, selectedTime, loading]);

  // Limpiar intervalo al desmontar el componente
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Actualizar modal de detalles cuando cambien las reservas
  useEffect(() => {
    if (showDetailModal && selectedReservation) {
      const currentReservation = reservations.find(r => r.lockerNumber === selectedReservation.lockerNumber);
      if (currentReservation && currentReservation !== selectedReservation) {
        console.log('🔄 Actualizando modal de detalles con datos frescos');
        setSelectedReservation(currentReservation);
      }
    }
  }, [reservations, showDetailModal, selectedReservation]);

  // Actualizar datos 3D cuando cambien las reservas y el modal 3D esté abierto
  useEffect(() => {
    if (show3DView && selectedLocker && hasChanges) {
      console.log('🔄 Actualizando datos 3D automáticamente debido a cambios detectados');
      generate3DDataForLocker(selectedLocker).then(freshData => {
        setLocker3DData(freshData);
        setHasChanges(false);
      });
    }
  }, [reservations, show3DView, selectedLocker, hasChanges]);

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

  // Función para cargar citas canceladas
  const loadCancelledAppointmentsForDate = async (date: string) => {
    try {
      console.log('🔍 loadCancelledAppointmentsForDate - Fecha solicitada:', date);

      // Cargar citas canceladas para la fecha
      const cancelledData = await appointmentService.getAllAppointments({
        date: date,
        status: 'cancelled'
      });

      console.log('🔍 loadCancelledAppointmentsForDate - Citas canceladas:', cancelledData.length);
      setCancelledAppointments(cancelledData);
    } catch (err: any) {
      console.error('Error loading cancelled appointments:', err);
      setCancelledAppointments([]);
    }
  };

  // Función de prueba para verificar la API
  const testAPI = async () => {
    try {
      console.log('🔍 Probando API...');
      const testData = await appointmentService.getAllAppointments({
        date: selectedDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
      });
      console.log('🔍 API funcionando, datos recibidos:', testData.length);
      await showAlert('Éxito', `API funcionando correctamente. Citas encontradas: ${testData.length}`, 'success');
    } catch (error) {
      console.error('🔍 Error en API:', error);
      await showAlert('Error', `Error en API: ${error}`, 'danger');
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

      await showAlert('Éxito', `Sincronización completada. ${assignments.length} asignaciones procesadas.`, 'success');

    } catch (err: any) {
      setError('Error al sincronizar: ' + err.message);
      console.error('Error syncing locker assignments:', err);
    } finally {
      setLoading(false);
    }
  };


  const loadReservationsForDateTime = async (date: string, time: string, isAutoRefresh = false, forceSync = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true);
      }
      setError('');

      console.log('🔍 loadReservationsForDateTime - Fecha seleccionada:', date);
      console.log('🔍 loadReservationsForDateTime - Hora seleccionada:', time);
      console.log('🔍 loadReservationsForDateTime - Es actualización automática:', isAutoRefresh);
      console.log('🔍 loadReservationsForDateTime - Forzar sincronización:', forceSync);

      // Obtener asignaciones de casilleros para la fecha y hora específicas
      let assignments = await lockerAssignmentService.getAssignmentsByDateTime(date, time);
      console.log('🔍 Asignaciones de casilleros obtenidas:', assignments);

      // Si no hay assignments o se fuerza la sincronización, intentar sincronizar automáticamente
      if ((assignments.length === 0 || forceSync) && !isAutoRefresh) {
        console.log('⚠️ No se encontraron assignments o se fuerza sincronización, intentando sincronizar...');
        console.log('🔍 Estado antes de sincronización:', {
          assignmentsCount: assignments.length,
          forceSync,
          date,
          time
        });

        if (!isAutoRefresh) {
          setSyncing(true);
        }
        try {
          console.log('🔄 Iniciando sincronización desde citas...');
          const syncResult = await lockerAssignmentService.syncFromAppointments(date);
          console.log('✅ Sincronización completada, resultado:', syncResult);

          // Reintentar obtener assignments después de la sincronización
          console.log('🔄 Obteniendo assignments después de sincronización...');
          assignments = await lockerAssignmentService.getAssignmentsByDateTime(date, time);
          console.log('🔍 Asignaciones después de sincronización:', assignments);
          console.log('🔍 Productos en assignments:', assignments.map(a => ({
            lockerNumber: a.lockerNumber,
            productsCount: a.products.length,
            products: a.products.map(p => ({ name: p.productName, quantity: p.quantity }))
          })));

          // Si se fuerza la sincronización, siempre actualizar las asignaciones
          if (forceSync) {
            console.log('⚠️ Forzando actualización completa de asignaciones...');
            await forceUpdateLockerAssignments(date, time);
            assignments = await lockerAssignmentService.getAssignmentsByDateTime(date, time);
            console.log('🔍 Asignaciones después de actualización forzada:', assignments);
            console.log('🔍 Productos después de actualización forzada:', assignments.map(a => ({
              lockerNumber: a.lockerNumber,
              productsCount: a.products.length,
              products: a.products.map(p => ({ name: p.productName, quantity: p.quantity }))
            })));
          }
        } catch (syncError) {
          console.error('❌ Error en sincronización automática:', syncError);
          // Continuar sin assignments si la sincronización falla
        } finally {
          if (!isAutoRefresh) {
            setSyncing(false);
          }
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
      console.log('🔍 Detalles de reservas:', reservationsData.map(r => ({
        lockerNumber: r.lockerNumber,
        userName: r.user.nombre,
        itemsCount: r.items.length,
        items: r.items.map(item => ({ name: item.productName, quantity: item.quantity }))
      })));

      // Detectar cambios si es una actualización automática
      if (isAutoRefresh) {
        const previousReservationsCount = reservations.length;
        const newReservationsCount = reservationsData.length;

        // Verificar si hay cambios en el número de reservas o productos
        const hasReservationChanges = previousReservationsCount !== newReservationsCount;
        const hasProductChanges = reservationsData.some(newReservation => {
          const oldReservation = reservations.find(r => r.lockerNumber === newReservation.lockerNumber);
          if (!oldReservation) return true; // Nueva reserva

          // Comparar productos
          const oldProductCount = oldReservation.items.reduce((sum, item) => sum + item.quantity, 0);
          const newProductCount = newReservation.items.reduce((sum, item) => sum + item.quantity, 0);

          return oldProductCount !== newProductCount ||
            oldReservation.items.length !== newReservation.items.length;
        });

        if (hasReservationChanges || hasProductChanges) {
          console.log('🔄 Cambios detectados en las reservas:', {
            hasReservationChanges,
            hasProductChanges,
            previousCount: previousReservationsCount,
            newCount: newReservationsCount
          });
          setHasChanges(true);

          // Limpiar datos obsoletos de visualización 3D y modal
          if (show3DView || showDetailModal) {
            console.log('🧹 Limpiando datos obsoletos de visualización 3D y modal');
            setLocker3DData(null);
            if (show3DView) {
              setShow3DView(false);
            }
            if (showDetailModal) {
              setShowDetailModal(false);
            }
          }

          // Mostrar notificación de cambios
          if (hasProductChanges) {
            console.log('📦 Nuevos productos detectados en las reservas');
          }
        }
      }


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
      if (!isAutoRefresh) {
        setLoading(false);
      }
    }
  };

  // Función para generar datos 3D para un casillero específico (NUEVA LÓGICA)
  const generate3DDataForLocker = async (lockerNumber: number) => {
    try {
      console.log(`🎯 Generando 3D para casillero ${lockerNumber}`);

      // Buscar la asignación del casillero específico
      const assignment = lockerAssignments.find(ass => ass.lockerNumber === lockerNumber);

      if (!assignment) {
        console.log(`❌ No se encontró asignación para el casillero ${lockerNumber}`);
        return null;
      }

      console.log(`✅ Asignación encontrada: ${assignment.products.length} productos`);

      // Convertir productos al formato Product3D usando la nueva lógica
      const products3DPromises = assignment.products.map(async (product, productIndex) => {
        console.log(`\n📦 Producto ${productIndex + 1}: ${product.productName}`);
        console.log(`📦 Variantes:`, product.variants);
        console.log(`📦 Dimensiones guardadas:`, product.dimensions);

        // ESTRATEGIA ALTERNATIVA: Obtener dimensiones directamente desde IndividualProduct
        let finalDims = product.dimensions; // Fallback por defecto
        let foundCorrectDimensions = false;

        console.log(`🔍 Obteniendo dimensiones desde BD para: ${product.productName}`);

        // Intentar obtener dimensiones desde IndividualProduct (que tiene las variantes específicas)
        if (product.individualProductId) {
          try {
            console.log(`🔍 Obteniendo IndividualProduct con ID: ${product.individualProductId}`);
            const response = await fetch(`/api/products/individual/${product.individualProductId}`);

            if (response.ok) {
              const individualProduct = await response.json();

              // Si el IndividualProduct tiene dimensiones calculadas, usarlas
              if (individualProduct.dimensions &&
                individualProduct.dimensions.largo &&
                individualProduct.dimensions.ancho &&
                individualProduct.dimensions.alto) {
                finalDims = individualProduct.dimensions;
                foundCorrectDimensions = true;
                console.log(`✅ USANDO DIMENSIONES DE INDIVIDUAL PRODUCT:`, finalDims);
                console.log(`✅ Variantes del IndividualProduct:`, individualProduct.variants);
              } else {
                console.log(`⚠️ IndividualProduct no tiene dimensiones específicas`);
              }
            } else {
              console.log(`⚠️ Error obteniendo IndividualProduct:`, response.status);
            }
          } catch (err) {
            console.log(`⚠️ Error obteniendo IndividualProduct:`, err);
          }
        }

        // Si no se encontraron dimensiones del IndividualProduct, intentar con variantes
        if (!foundCorrectDimensions && product.variants && Object.keys(product.variants).length > 0) {
          console.log(`🔍 Intentando con variantes de asignación:`, product.variants);

          const productIdsToTry = [
            product.originalProductId,
            product.productId
          ].filter(id => id);

          for (const productId of productIdsToTry) {
            if (productId) {
              try {
                const fullProduct = await productService.getProductById(productId);

                let variantsForCalculation = product.variants;
                if (product.variants instanceof Map) {
                  variantsForCalculation = Object.fromEntries(product.variants);
                }

                const dimsFromVariants = getVariantOrProductDimensions(fullProduct as any, variantsForCalculation as any);

                const areVariantDimsValid = dimsFromVariants &&
                  dimsFromVariants.largo &&
                  dimsFromVariants.ancho &&
                  dimsFromVariants.alto;

                if (areVariantDimsValid) {
                  finalDims = dimsFromVariants as any;
                  foundCorrectDimensions = true;
                  console.log(`✅ USANDO DIMENSIONES DE VARIANTES:`, finalDims);
                  break;
                }
              } catch (fetchErr) {
                console.log(`⚠️ Error obteniendo producto con ID ${productId}:`, fetchErr);
              }
            }
          }
        }

        if (!foundCorrectDimensions) {
          console.log(`⚠️ Usando dimensiones del producto base`);
        }

        const { largo, ancho, alto } = finalDims;
        const product3D = {
          id: product.productId,
          name: product.productName,
          dimensions: { length: largo, width: ancho, height: alto },
          quantity: product.quantity,
          volume: (finalDims.largo * finalDims.ancho * finalDims.alto)
        };

        // Calcular slots que debería ocupar
        const slotsX = Math.ceil(largo / 15);
        const slotsY = Math.ceil(ancho / 15);
        const slotsZ = Math.ceil(alto / 15);
        const expectedSlots = slotsX * slotsY * slotsZ;

        console.log(`📦 RESULTADO FINAL:`, {
          name: product.productName,
          dimensions: { length: largo, width: ancho, height: alto },
          expectedSlots: expectedSlots,
          volume: product3D.volume,
          usingVariantDims: foundCorrectDimensions
        });

        return product3D;
      });

      const products3D = await Promise.all(products3DPromises);

      // Realizar bin packing
      const result = gridPackingService.packProducts3D(products3D);

      console.log(`🎯 Bin packing: ${result.lockers.length} casilleros, eficiencia: ${result.totalEfficiency}%`);

      if (result.lockers.length > 0) {
        const locker = result.lockers[0];

        console.log(`🎯 Casillero final: ${locker.usedSlots}/27 slots usados`);
        locker.packedProducts.forEach((packedItem, index) => {
          console.log(`🎯 Producto ${index + 1}: ${packedItem.product.name} - ${packedItem.slotsUsed} slots`);
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
    console.log('🎯 Abriendo visualización 3D para casillero:', lockerNumber);
    setSelectedLocker(lockerNumber);

    // Siempre generar datos 3D frescos
    const lockerData = await generate3DDataForLocker(lockerNumber);
    console.log('🎯 Datos 3D generados:', lockerData);

    setLocker3DData(lockerData);
    setShow3DView(true);
  };

  const handleShowDetails = (reservation: LockerReservation) => {
    console.log('👁️ Abriendo detalles de reserva:', reservation);

    // Buscar la reserva más reciente en el estado actual
    const currentReservation = reservations.find(r => r.lockerNumber === reservation.lockerNumber);
    const reservationToShow = currentReservation || reservation;

    console.log('👁️ Usando reserva actualizada:', reservationToShow);
    setSelectedReservation(reservationToShow);
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

  // Función para forzar actualización de asignaciones de casilleros
  const forceUpdateLockerAssignments = async (date: string, time: string) => {
    try {
      console.log('🔄 Forzando actualización de asignaciones de casilleros...');

      // Obtener todas las citas para la fecha
      const allAppointments = await appointmentService.getAllAppointments({ date });
      console.log('🔍 Citas obtenidas para actualización:', allAppointments.length);

      // Filtrar citas por hora
      const appointmentsForTime = allAppointments.filter(apt => apt.timeSlot === time);
      console.log('🔍 Citas para la hora', time, ':', appointmentsForTime.length);

      // Para cada cita, actualizar o crear la asignación
      for (let i = 0; i < appointmentsForTime.length; i++) {
        const appointment = appointmentsForTime[i];
        console.log(`🔄 Procesando cita ${i + 1}/${appointmentsForTime.length}:`, appointment._id);

        // Crear productos desde itemsToPickup
        const products = appointment.itemsToPickup.map(item => {
          const productName = item.product?.nombre ||
            (item.individualProduct as any)?.product?.nombre ||
            (item.originalProduct as any)?.nombre || 'Producto sin nombre';

          // Extraer variantes del item si existen
          let variants = {};
          if (item.individualProduct && (item.individualProduct as any).variants) {
            // Si es un Map, convertir a objeto
            if ((item.individualProduct as any).variants instanceof Map) {
              variants = Object.fromEntries((item.individualProduct as any).variants);
            } else {
              variants = (item.individualProduct as any).variants;
            }
          } else if (item.originalProduct && (item.originalProduct as any).variants) {
            // Si es un Map, convertir a objeto
            if ((item.originalProduct as any).variants instanceof Map) {
              variants = Object.fromEntries((item.originalProduct as any).variants);
            } else {
              variants = (item.originalProduct as any).variants;
            }
          } else if (item.product && (item.product as any).variants) {
            // Si es un Map, convertir a objeto
            if ((item.product as any).variants instanceof Map) {
              variants = Object.fromEntries((item.product as any).variants);
            } else {
              variants = (item.product as any).variants;
            }
          }

          console.log(`🔍 Variantes extraídas para ${productName}:`, variants);

          return {
            productId: item.product?._id ||
              (item.individualProduct as any)?._id ||
              (item.originalProduct as any)?._id || 'unknown',
            productName: productName,
            individualProductId: (item.individualProduct as any)?._id,
            originalProductId: (item.originalProduct as any)?._id,
            variants: variants,
            dimensions: {
              largo: item.dimensiones?.largo || 10,
              ancho: item.dimensiones?.ancho || 10,
              alto: item.dimensiones?.alto || 10,
              peso: 1
            },
            calculatedSlots: 1,
            quantity: item.quantity,
            volume: item.volumen || (item.dimensiones?.largo || 10) * (item.dimensiones?.ancho || 10) * (item.dimensiones?.alto || 10)
          };
        });

        console.log(`🔍 Productos para cita ${appointment._id}:`, products.map(p => ({ name: p.productName, quantity: p.quantity })));

        // Buscar asignación existente
        const existingAssignment = await lockerAssignmentService.getAssignmentByLocker(i + 1, date, time);
        console.log(`🔍 Asignación existente para casillero ${i + 1}:`, existingAssignment ? 'SÍ' : 'NO');

        if (existingAssignment) {
          // Actualizar asignación existente
          console.log(`🔄 Actualizando asignación existente para casillero ${i + 1}`);
          console.log(`🔍 Productos actuales en asignación:`, existingAssignment.products.map(p => ({ name: p.productName, quantity: p.quantity })));
          console.log(`🔍 Productos nuevos a actualizar:`, products.map(p => ({ name: p.productName, quantity: p.quantity })));

          // Log detallado de los datos que se van a enviar
          console.log(`🔍 DATOS DETALLADOS PARA ACTUALIZACIÓN:`, {
            assignmentId: existingAssignment._id,
            products: products.map(p => ({
              productId: p.productId,
              productName: p.productName,
              individualProductId: p.individualProductId,
              originalProductId: p.originalProductId,
              variants: p.variants,
              dimensions: p.dimensions,
              calculatedSlots: p.calculatedSlots,
              quantity: p.quantity,
              volume: p.volume
            })),
            totalSlotsUsed: products.reduce((sum, p) => sum + p.calculatedSlots, 0)
          });

          const updateResult = await lockerAssignmentService.updateAssignment(existingAssignment._id, {
            products: products,
            totalSlotsUsed: products.reduce((sum, p) => sum + p.calculatedSlots, 0)
          });
          console.log(`✅ Asignación actualizada para casillero ${i + 1}:`, updateResult);
        } else {
          // Crear nueva asignación
          console.log(`🔄 Creando nueva asignación para casillero ${i + 1}`);

          // ← AQUÍ el log, justo antes del createAssignment
          console.log('📦 Datos enviados a createAssignment:',
            JSON.stringify({
              lockerNumber: i + 1,
              userId: appointment.user?._id || 'unknown',
              userName: appointment.user?.nombre || 'Usuario desconocido',
              userEmail: appointment.user?.email || 'email@desconocido.com',
              appointmentId: appointment._id,
              scheduledDate: new Date(appointment.scheduledDate).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
              timeSlot: appointment.timeSlot,
              products: products
            }, null, 2)
          );

          const createResult = await lockerAssignmentService.createAssignment({
            lockerNumber: i + 1,
            userId: appointment.user?._id || 'unknown',
            userName: appointment.user?.nombre || 'Usuario desconocido',
            userEmail: appointment.user?.email || 'email@desconocido.com',
            appointmentId: appointment._id,
            scheduledDate: new Date(appointment.scheduledDate).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
            timeSlot: appointment.timeSlot,
            products: products
          });
          console.log(`✅ Asignación creada para casillero ${i + 1}:`, createResult);
        }
      }

      console.log('✅ Actualización forzada de asignaciones completada');
    } catch (error) {
      console.error('❌ Error en actualización forzada:', error);
      throw error;
    }
  };


  // Función para actualización manual
  const handleManualRefresh = async () => {
    if (selectedDate && selectedTime) {
      try {
        setLoading(true);
        await loadReservationsForDateTime(selectedDate, selectedTime);
        setLastUpdate(new Date());
        setHasChanges(false);
        console.log('✅ Actualización manual completada');
      } catch (error) {
        console.error('Error en actualización manual:', error);
      } finally {
        setLoading(false);
      }
    }
  };


  // Función para toggle de auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    setHasChanges(false);
    console.log('🔄 Auto-refresh:', !autoRefresh ? 'activado' : 'desactivado');
  };

  const exportToCSV = async () => {
    if (filteredReservations.length === 0) {
      await showAlert('Aviso', 'No hay datos para exportar', 'warning');
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

  // Función para validar y actualizar estado de reserva
  const validateAndUpdateReservationStatus = async (reservation: LockerReservation, newStatus: string) => {
    try {
      console.log(`🔄 Validando cambio de estado para reserva ${reservation.lockerNumber}: ${reservation.status} -> ${newStatus}`);

      // Validar transiciones de estado permitidas
      const validTransitions: Record<string, string[]> = {
        'scheduled': ['confirmed', 'cancelled'],
        'confirmed': ['completed', 'cancelled', 'no_show'],
        'completed': [], // No se puede cambiar desde completado
        'cancelled': [], // No se puede cambiar desde cancelado
        'no_show': ['completed', 'cancelled'] // Se puede marcar como completado o cancelado
      };

      const currentStatus = reservation.status;
      const allowedTransitions = validTransitions[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus)) {
        const errorMessage = `No se puede cambiar el estado de "${getStatusLabel(currentStatus)}" a "${getStatusLabel(newStatus)}". Transiciones permitidas: ${allowedTransitions.map(s => getStatusLabel(s)).join(', ')}`;
        await showAlert('Cambio no permitido', errorMessage, 'warning');
        return false;
      }

      // Confirmar cambio de estado
      const confirmed = await showConfirm(
        'Confirmar cambio',
        `¿Estás seguro de que quieres cambiar el estado de la reserva del casillero ${reservation.lockerNumber} a "${getStatusLabel(newStatus)}"?`,
        'warning',
        'Confirmar Cambio'
      );
      
      if (!confirmed) {
        return false;
      }

      // Actualizar estado en el backend
      const token = authService.getToken();
      const response = await fetch(`/api/locker-assignments/${reservation.assignment._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado de la reserva');
      }

      const updatedAssignment = await response.json();
      console.log('✅ Estado actualizado exitosamente:', updatedAssignment);

      // Actualizar el estado local
      setReservations(prevReservations =>
        prevReservations.map(r =>
          r.lockerNumber === reservation.lockerNumber
            ? { ...r, status: newStatus, assignment: updatedAssignment }
            : r
        )
      );

      // Mostrar mensaje de éxito
      await showAlert('Éxito', `Estado de la reserva actualizado exitosamente a "${getStatusLabel(newStatus)}"`, 'success');

      return true;
    } catch (error) {
      console.error('Error actualizando estado de reserva:', error);
      await showAlert('Error', 'Error al actualizar el estado de la reserva: ' + error, 'danger');
      return false;
    }
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
                        min={DateUtils.getMinAllowedDate()}
                        max={DateUtils.getMaxAllowedDate()}
                        style={{
                          position: 'relative',
                          zIndex: 1
                        }}
                      />
                      {selectedDate && (
                        <div className="mt-1">
                          <small className="text-muted">
                            {formatDate(selectedDate)}
                          </small>
                          <div className="mt-1">
                            {DateUtils.isPast(selectedDate) && (
                              <span className="badge bg-secondary">
                                <i className="bi bi-clock-history me-1"></i>
                                Fecha Pasada
                              </span>
                            )}
                            {DateUtils.isToday(selectedDate) && (
                              <span className="badge bg-primary">
                                <i className="bi bi-calendar-check me-1"></i>
                                Hoy
                              </span>
                            )}
                            {DateUtils.isFuture(selectedDate) && (
                              <span className="badge bg-success">
                                <i className="bi bi-calendar-plus me-1"></i>
                                Fecha Futura
                              </span>
                            )}
                          </div>
                        </div>
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
                          <div className="col-md-2">
                            <small><strong>Fecha:</strong> {selectedDate || 'No seleccionada'}</small>
                          </div>
                          <div className="col-md-2">
                            <small><strong>Hora:</strong> {selectedTime || 'No seleccionada'}</small>
                          </div>
                          <div className="col-md-2">
                            <small><strong>Citas:</strong> {appointments.length}</small>
                          </div>
                          <div className="col-md-2">
                            <small><strong>Reservas:</strong> {reservations.length}</small>
                          </div>
                          <div className="col-md-2">
                            <small><strong>Auto-refresh:</strong>
                              <span className={`ms-1 badge ${autoRefresh ? 'bg-success' : 'bg-secondary'}`}>
                                {autoRefresh ? 'ON' : 'OFF'}
                              </span>
                            </small>
                          </div>
                          <div className="col-md-2">
                            <small><strong>Última actualización:</strong>
                              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Nunca'}
                            </small>
                          </div>
                        </div>
                        <div className="row mt-2">
                          <div className="col-md-4">
                            <small><strong>Rango de fechas:</strong>
                              <span className="badge bg-info ms-1">
                                <i className="bi bi-infinity me-1"></i>
                                Infinito (10 años)
                              </span>
                            </small>
                          </div>
                          <div className="col-md-4">
                            <small><strong>Tipo de fecha:</strong>
                              {selectedDate && DateUtils.isPast(selectedDate) && (
                                <span className="badge bg-secondary ms-1">Pasada</span>
                              )}
                              {selectedDate && DateUtils.isToday(selectedDate) && (
                                <span className="badge bg-primary ms-1">Hoy</span>
                              )}
                              {selectedDate && DateUtils.isFuture(selectedDate) && (
                                <span className="badge bg-success ms-1">Futura</span>
                              )}
                            </small>
                          </div>
                          <div className="col-md-4">
                            <small><strong>Estado:</strong>
                              {loading && <span className="badge bg-warning ms-1">Cargando</span>}
                              {error && <span className="badge bg-danger ms-1">Error</span>}
                              {!loading && !error && <span className="badge bg-success ms-1">Listo</span>}
                            </small>
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
                            className="btn btn-outline-success btn-sm me-2"
                            onClick={syncLockerAssignments}
                            title="Sincronizar asignaciones de casilleros"
                            disabled={!selectedDate}
                          >
                            <i className="bi bi-arrow-repeat me-1"></i>
                            Sincronizar
                          </button>
                          <button
                            className={`btn btn-sm me-2 ${autoRefresh ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={toggleAutoRefresh}
                            title={autoRefresh ? 'Desactivar actualización automática' : 'Activar actualización automática'}
                          >
                            <i className={`bi ${autoRefresh ? 'bi-pause-circle' : 'bi-play-circle'} me-1`}></i>
                            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                          </button>
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={handleManualRefresh}
                            title="Actualizar manualmente las reservas"
                            disabled={!selectedDate || !selectedTime || loading}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Actualizar Ahora
                          </button>
                          <button
                            className="btn btn-outline-warning btn-sm me-2"
                            onClick={async () => {
                              if (selectedDate && selectedTime) {
                                try {
                                  setLoading(true);
                                  console.log('🔄 Forzando actualización de asignaciones...');
                                  await forceUpdateLockerAssignments(selectedDate, selectedTime);
                                  await loadReservationsForDateTime(selectedDate, selectedTime);
                                  setLastUpdate(new Date());
                                  setHasChanges(false);
                                  console.log('✅ Actualización forzada completada');
                                } catch (error) {
                                  console.error('Error en actualización forzada:', error);
                                  setError('Error al actualizar asignaciones: ' + error);
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            title="Forzar actualización de asignaciones de casilleros con productos actualizados"
                            disabled={!selectedDate || !selectedTime || loading}
                          >
                            <i className="bi bi-arrow-repeat me-1"></i>
                            Forzar Actualización
                          </button>
                          {hasChanges && (
                            <span className="badge bg-warning text-dark">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              Cambios detectados
                            </span>
                          )}
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
                <div className={`alert selection-info ${DateUtils.isPast(selectedDate) ? 'alert-warning' :
                  DateUtils.isToday(selectedDate) ? 'alert-info' :
                    'alert-success'
                  }`}>
                  <i className={`bi me-2 ${DateUtils.isPast(selectedDate) ? 'bi-clock-history' :
                    DateUtils.isToday(selectedDate) ? 'bi-info-circle' :
                      'bi-calendar-check'
                    }`}></i>
                  <strong>Mostrando reservas para:</strong> {formatDate(selectedDate)} a las {selectedTime}
                  <span className="badge bg-primary ms-2">{filteredReservations.length} reservas</span>
                  {DateUtils.isPast(selectedDate) && (
                    <span className="badge bg-warning text-dark ms-2">
                      <i className="bi bi-clock-history me-1"></i>
                      Reservas Pasadas
                    </span>
                  )}
                  {hasChanges && (
                    <span className="badge bg-warning text-dark ms-2">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      ¡Cambios detectados! Haz clic en "Actualizar Ahora"
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notificación de cambios detectados */}
          {hasChanges && selectedDate && selectedTime && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="alert alert-warning alert-dismissible fade show">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>¡Cambios detectados!</strong> Se han detectado modificaciones en las reservas.
                  <button
                    type="button"
                    className="btn btn-warning btn-sm ms-2"
                    onClick={handleManualRefresh}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Actualizar Ahora
                  </button>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setHasChanges(false)}
                    aria-label="Cerrar"
                  ></button>
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
                    Selecciona una hora específica para ver las reservas de casilleros.
                    <strong>Nota:</strong> Al seleccionar una hora, se sincronizarán automáticamente los datos más recientes.
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

          {/* Sección de Citas Canceladas */}
          {selectedDate && !selectedTime && cancelledAppointments.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card cancelled-appointments-card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-x-circle text-danger me-2"></i>
                      Citas Canceladas para {formatDate(selectedDate)}
                      <span className="badge bg-danger ms-2">{cancelledAppointments.length}</span>
                    </h5>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowCancelledAppointments(!showCancelledAppointments)}
                    >
                      <i className={`bi ${showCancelledAppointments ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
                      {showCancelledAppointments ? 'Ocultar' : 'Mostrar'} Canceladas
                    </button>
                  </div>
                  {showCancelledAppointments && (
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-hover table-sm">
                          <thead className="table-danger">
                            <tr>
                              <th>Hora</th>
                              <th>Usuario</th>
                              <th>Email</th>
                              <th>Productos</th>
                              <th>Motivo de Cancelación</th>
                              <th>Fecha de Cancelación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cancelledAppointments.map((appointment, index) => (
                              <tr key={index} className="table-light">
                                <td data-label="Hora">
                                  <span className="badge bg-danger">
                                    {appointment.timeSlot}
                                  </span>
                                </td>
                                <td data-label="Usuario">
                                  <div className="user-info">
                                    <div className="user-name">{appointment.user?.nombre || 'N/A'}</div>
                                  </div>
                                </td>
                                <td data-label="Email">
                                  <div className="user-email">{appointment.user?.email || 'N/A'}</div>
                                </td>
                                <td data-label="Productos">
                                  <div className="items-list">
                                    {appointment.itemsToPickup.map((item, idx) => (
                                      <div key={idx} className="item-badge">
                                        <div className="d-flex align-items-center">
                                          <div className="bg-danger rounded me-2 d-flex align-items-center justify-content-center"
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
                                <td data-label="Motivo de Cancelación">
                                  <small className="text-muted">
                                    {appointment.cancellationReason || 'No especificado'}
                                  </small>
                                </td>
                                <td data-label="Fecha de Cancelación">
                                  <small className="text-muted">
                                    {appointment.updatedAt ? new Date(appointment.updatedAt).toLocaleDateString() : 'N/A'}
                                  </small>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
                                <td data-label="Casillero">
                                  <span className="locker-badge">
                                    Casillero {reservation.lockerNumber}
                                  </span>
                                </td>
                                <td data-label="Usuario">
                                  <div className="user-info">
                                    <div className="user-name">{reservation.user.nombre}</div>
                                  </div>
                                </td>
                                <td data-label="Email">
                                  <div className="user-email">{reservation.user.email}</div>
                                </td>
                                <td data-label="Objetos">
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
                                <td data-label="Estado">
                                  <span className={`badge bg-${getStatusColor(reservation.status)}`}>
                                    {getStatusLabel(reservation.status)}
                                  </span>
                                </td>
                                <td data-label="Acciones">
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
                                    {/* Botones de cambio de estado */}
                                    {reservation.status === 'confirmed' && (
                                      <>
                                        <button
                                          className="btn btn-outline-success btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'completed')}
                                          title="Marcar como completada"
                                        >
                                          <i className="bi bi-check-circle"></i>
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'cancelled')}
                                          title="Cancelar reserva"
                                        >
                                          <i className="bi bi-x-circle"></i>
                                        </button>
                                        <button
                                          className="btn btn-outline-warning btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'no_show')}
                                          title="Marcar como no se presentó"
                                        >
                                          <i className="bi bi-person-x"></i>
                                        </button>
                                      </>
                                    )}
                                    {reservation.status === 'scheduled' && (
                                      <>
                                        <button
                                          className="btn btn-outline-primary btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'confirmed')}
                                          title="Confirmar reserva"
                                        >
                                          <i className="bi bi-check-circle"></i>
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'cancelled')}
                                          title="Cancelar reserva"
                                        >
                                          <i className="bi bi-x-circle"></i>
                                        </button>
                                      </>
                                    )}
                                    {reservation.status === 'no_show' && (
                                      <>
                                        <button
                                          className="btn btn-outline-success btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'completed')}
                                          title="Marcar como completada"
                                        >
                                          <i className="bi bi-check-circle"></i>
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() => validateAndUpdateReservationStatus(reservation, 'cancelled')}
                                          title="Cancelar reserva"
                                        >
                                          <i className="bi bi-x-circle"></i>
                                        </button>
                                      </>
                                    )}
                                    {(reservation.status === 'completed' || reservation.status === 'cancelled') && (
                                      <span className="text-muted small">
                                        <i className="bi bi-lock"></i> Finalizado
                                      </span>
                                    )}
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
                    <div className="mt-3">
                      <span className="badge bg-info">
                        <i className="bi bi-infinity me-1"></i>
                        Rango infinito: Puedes ver reservas desde hace 10 años hasta 10 años en el futuro
                      </span>
                    </div>
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
                              <td data-label="Hora">
                                <span className="time-badge">
                                  {appointment.timeSlot}
                                </span>
                              </td>
                              <td data-label="Usuario">
                                <div className="user-info">
                                  <div className="user-name">{appointment.user?.nombre || 'N/A'}</div>
                                </div>
                              </td>
                              <td data-label="Email">
                                <div className="user-email">{appointment.user?.email || 'N/A'}</div>
                              </td>
                              <td data-label="Productos">
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
                              <td data-label="Estado">
                                <span className={`badge bg-${getStatusColor(appointment.status)}`}>
                                  {getStatusLabel(appointment.status)}
                                </span>
                              </td>
                              <td data-label="Acciones">
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={async () => {
                                    setSelectingTime(true);
                                    setSelectedTime(appointment.timeSlot);
                                    // Cargar reservas forzando sincronización para obtener datos actualizados
                                    console.log('🔄 Seleccionando hora y forzando sincronización...');
                                    try {
                                      await loadReservationsForDateTime(selectedDate, appointment.timeSlot, false, true);
                                      console.log('✅ Reservas cargadas con datos actualizados');
                                    } catch (error) {
                                      console.error('❌ Error al cargar reservas:', error);
                                    } finally {
                                      setSelectingTime(false);
                                    }
                                  }}
                                  disabled={selectingTime}
                                  title="Seleccionar esta hora y sincronizar datos"
                                >
                                  {selectingTime ? (
                                    <>
                                      <div className="spinner-border spinner-border-sm me-1" role="status">
                                        <span className="visually-hidden">Sincronizando...</span>
                                      </div>
                                      Sincronizando...
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-clock me-1"></i>
                                      Seleccionar
                                    </>
                                  )}
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
          <div className="modal-dialog modal-xl admin-dashboard">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-cube me-2"></i>
                  Visualización 3D - Casillero {selectedLocker}
                  {hasChanges && (
                    <span className="badge bg-warning text-dark ms-2">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Actualizando...
                    </span>
                  )}
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
                <button
                  type="button"
                  className="btn btn-outline-primary me-2"
                  onClick={async () => {
                    if (selectedLocker) {
                      console.log('🔄 Regenerando datos 3D...');
                      const freshData = await generate3DDataForLocker(selectedLocker);
                      setLocker3DData(freshData);
                    }
                  }}
                  title="Regenerar visualización 3D con datos actualizados"
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualizar 3D
                </button>
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
          <div className="modal-dialog modal-lg admin-dashboard">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-info-circle me-2"></i>
                  Detalles de Reserva - Casillero {selectedReservation.lockerNumber}
                  {hasChanges && (
                    <span className="badge bg-warning text-dark ms-2">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Datos actualizados
                    </span>
                  )}
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
                          <span className={`badge ms-2 ${selectedReservation.status === 'pending' ? 'bg-warning' :
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
                  className="btn btn-outline-primary me-2"
                  onClick={() => {
                    // Actualizar los detalles con datos frescos
                    const currentReservation = reservations.find(r => r.lockerNumber === selectedReservation.lockerNumber);
                    if (currentReservation) {
                      setSelectedReservation(currentReservation);
                      setHasChanges(false);
                    }
                  }}
                  title="Actualizar detalles con datos más recientes"
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualizar Detalles
                </button>
                <button
                  type="button"
                  className="btn btn-primary me-2"
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
      {/* Modal de Confirmación Global */}
      <ConfirmModal {...modalConfig} />
    </div>
  );
};

export default AdminLockersPage;
