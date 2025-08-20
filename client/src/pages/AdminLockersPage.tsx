import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import appointmentService from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import Locker3DCanvas from '../components/Locker3DCanvas';
import gridPackingService from '../services/gridPackingService';
import './AdminLockersPage.css';

interface LockerReservation {
  lockerNumber: number;
  appointment: Appointment;
  user: {
    nombre: string;
    email: string;
  };
  items: any[];
  status: string;
}

interface FilterOptions {
  status: string;
  userSearch: string;
  lockerNumber: string;
}

// Función para obtener dimensiones de un item (copiada de OrdersPage)
const getDimensiones = (item: any) => {
  console.log('🔍 getDimensiones llamado con:', {
    itemId: item._id,
    hasDimensiones: !!item.dimensiones,
    dimensiones: item.dimensiones,
    hasVariants: !!item.variants,
    variants: item.variants,
    hasProduct: !!item.product,
    productVariants: item.product?.variants,
    productDimensiones: item.product?.dimensiones,
    // NUEVO: Verificar la nueva estructura del backend
    hasIndividualProduct: !!item.individualProduct,
    individualProductDimensions: item.individualProduct?.dimensiones,
    individualProductName: item.individualProduct?.product?.nombre,
    individualProductVariants: item.individualProduct?.variants,
    individualProductProductVariants: item.individualProduct?.product?.variants,
    hasOriginalProduct: !!item.originalProduct,
    originalProductDimensions: item.originalProduct?.dimensiones,
    originalProductName: item.originalProduct?.nombre,
    originalProductVariants: item.originalProduct?.variants
  });

  // PRIORIDAD 1: Si el item tiene dimensiones propias (ya calculadas en el backend), usarlas
  if (item.dimensiones) {
    console.log('✅ Usando dimensiones propias del item (backend):', item.dimensiones);
    return item.dimensiones;
  }
  
  // PRIORIDAD 2: Si el item tiene individualProduct con variantes, procesar las variantes
  if (item.individualProduct?.variants && item.individualProduct?.product?.variants?.enabled) {
    console.log('🔍 Procesando variantes del producto individual');
    
    // Convertir Map a objeto si es necesario
    const variants = item.individualProduct.variants instanceof Map 
      ? Object.fromEntries(item.individualProduct.variants)
      : item.individualProduct.variants;
    
    console.log('🔍 Variantes del producto individual:', variants);
    
    // Buscar atributos que definen dimensiones
    const dimensionAttributes = item.individualProduct.product.variants.attributes.filter((a: any) => a.definesDimensions);
    console.log('📏 Atributos que definen dimensiones:', dimensionAttributes);
    
    // Si hay múltiples atributos que definen dimensiones, usar el primero que tenga dimensiones válidas
    for (const attr of dimensionAttributes) {
      const selectedValue = variants[attr.name];
      console.log(`🔍 Atributo ${attr.name}, valor seleccionado:`, selectedValue);
      
      if (selectedValue) {
        const option = attr.options.find((opt: any) => opt.value === selectedValue);
        console.log(`🔍 Opción encontrada para ${attr.name}:`, option);
        
        if (option && option.dimensiones && 
            option.dimensiones.largo && 
            option.dimensiones.ancho && 
            option.dimensiones.alto) {
          console.log('✅ Usando dimensiones de la variante del producto individual:', option.dimensiones);
          return option.dimensiones;
        }
      }
    }
  }
  
  // PRIORIDAD 3: Si el item tiene originalProduct con variantes, procesar las variantes
  if (item.originalProduct?.variants && item.originalProduct?.variants?.enabled) {
    console.log('🔍 Procesando variantes del producto original');
    
    // Convertir Map a objeto si es necesario
    const variants = item.originalProduct.variants instanceof Map 
      ? Object.fromEntries(item.originalProduct.variants)
      : item.originalProduct.variants;
    
    console.log('🔍 Variantes del producto original:', variants);
    
    // Buscar atributos que definen dimensiones
    const dimensionAttributes = item.originalProduct.variants.attributes.filter((a: any) => a.definesDimensions);
    console.log('📏 Atributos que definen dimensiones:', dimensionAttributes);
    
    // Si hay múltiples atributos que definen dimensiones, usar el primero que tenga dimensiones válidas
    for (const attr of dimensionAttributes) {
      const selectedValue = variants[attr.name];
      console.log(`🔍 Atributo ${attr.name}, valor seleccionado:`, selectedValue);
      
      if (selectedValue) {
        const option = attr.options.find((opt: any) => opt.value === selectedValue);
        console.log(`🔍 Opción encontrada para ${attr.name}:`, option);
        
        if (option && option.dimensiones && 
            option.dimensiones.largo && 
            option.dimensiones.ancho && 
            option.dimensiones.alto) {
          console.log('✅ Usando dimensiones de la variante del producto original:', option.dimensiones);
          return option.dimensiones;
        }
      }
    }
  }
  
  // PRIORIDAD 4: Si el item tiene individualProduct con dimensiones, usarlas
  if (item.individualProduct?.dimensiones) {
    console.log('✅ Usando dimensiones del producto individual:', item.individualProduct.dimensiones);
    return item.individualProduct.dimensiones;
  }
  
  // PRIORIDAD 5: Si el item tiene originalProduct con dimensiones, usarlas
  if (item.originalProduct?.dimensiones) {
    console.log('✅ Usando dimensiones del producto original:', item.originalProduct.dimensiones);
    return item.originalProduct.dimensiones;
  }
  
  // PRIORIDAD 6: Si el item tiene variantes seleccionadas y el producto tiene variantes, intentar calcular dimensiones de la variante
  if (item.variants && item.product?.variants?.enabled && item.product.variants.attributes) {
    console.log('🔍 Procesando variantes para dimensiones');
    
    // Buscar atributos que definen dimensiones
    const dimensionAttributes = item.product.variants.attributes.filter((a: any) => a.definesDimensions);
    console.log('📏 Atributos que definen dimensiones:', dimensionAttributes);
    
    // Si hay múltiples atributos que definen dimensiones, usar el primero que tenga dimensiones válidas
    for (const attr of dimensionAttributes) {
      const selectedValue = item.variants[attr.name];
      console.log(`🔍 Atributo ${attr.name}, valor seleccionado:`, selectedValue);
      
      if (selectedValue) {
        const option = attr.options.find((opt: any) => opt.value === selectedValue);
        console.log(`🔍 Opción encontrada para ${attr.name}:`, option);
        
        if (option && option.dimensiones && 
            option.dimensiones.largo && 
            option.dimensiones.ancho && 
            option.dimensiones.alto) {
          console.log('✅ Usando dimensiones de la variante:', option.dimensiones);
          return option.dimensiones;
        }
      }
    }
  }
  
  // PRIORIDAD 7: Si no, usar dimensiones del producto base
  console.log('⚠️ Usando dimensiones del producto base:', item.product?.dimensiones);
  return item.product?.dimensiones;
};

// Función para obtener volumen de un item (copiada de OrdersPage)
const getVolumen = (item: any) => {
  const d = getDimensiones(item);
  return d && d.largo && d.ancho && d.alto ? d.largo * d.ancho * d.alto : 0;
};

const AdminLockersPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reservations, setReservations] = useState<LockerReservation[]>([]);
  const [loading, setLoading] = useState(false);
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
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
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

  const loadReservationsForDateTime = (date: string, time: string) => {
    console.log('🔍 loadReservationsForDateTime - Fecha seleccionada:', date);
    console.log('🔍 loadReservationsForDateTime - Hora seleccionada:', time);
    console.log('🔍 loadReservationsForDateTime - Citas disponibles:', appointments.length);
    
    // Filtrar citas para la fecha y hora seleccionadas
    const filteredAppointments = appointments.filter(apt => {
      // CORRECCIÓN: Usar una comparación más robusta para evitar problemas de zona horaria
      const appointmentDate = new Date(apt.scheduledDate);
      
      // Crear fecha de comparación en la zona horaria local
      const [year, month, day] = date.split('-');
      const comparisonDate = new Date(Number(year), Number(month) - 1, Number(day));
      
      // Comparar solo la fecha (sin hora) usando toDateString()
      const appointmentDateOnly = appointmentDate.toDateString();
      const comparisonDateOnly = comparisonDate.toDateString();
      
      console.log('🔍 Comparando cita:', {
        appointmentId: apt._id,
        appointmentDate: apt.scheduledDate,
        appointmentDateOnly: appointmentDateOnly,
        comparisonDateOnly: comparisonDateOnly,
        selectedDate: date,
        appointmentTimeSlot: apt.timeSlot,
        selectedTime: time,
        matches: appointmentDateOnly === comparisonDateOnly && apt.timeSlot === time
      });
      
      return appointmentDateOnly === comparisonDateOnly && apt.timeSlot === time;
    });

    console.log('🔍 Citas filtradas:', filteredAppointments.length);

    // Convertir a formato de reservas
    const reservationsData: LockerReservation[] = filteredAppointments.map(apt => ({
      lockerNumber: apt.itemsToPickup[0]?.lockerNumber || 0,
      appointment: apt,
      user: {
        nombre: apt.user?.nombre || 'N/A',
        email: apt.user?.email || 'N/A'
      },
      items: apt.itemsToPickup.map(item => {
        const productName = item.product?.nombre || 
                           ((item.individualProduct as any)?.product?.nombre) || 
                           ((item.originalProduct as any)?.nombre) || 
                           'Producto sin nombre';
        
        const productImage = item.product?.imagen_url || 
                            ((item.individualProduct as any)?.product?.imagen_url) || 
                            ((item.originalProduct as any)?.imagen_url) || 
                            '';
        
        return {
          nombre: productName,
          cantidad: item.quantity,
          imagen_url: productImage
        };
      }),
      status: apt.status
    }));

    console.log('🔍 Reservas generadas:', reservationsData.length);
    setReservations(reservationsData);
  };

  // Función para generar datos 3D para un casillero específico (CORREGIDA)
  const generate3DDataForLocker = (lockerNumber: number) => {
    try {
      // Obtener todas las reservas para este casillero en la fecha/hora seleccionada
      const lockerAppointments = appointments.filter(apt => {
        // Usar la misma lógica de comparación de fechas que en loadReservationsForDateTime
        const appointmentDate = new Date(apt.scheduledDate);
        const [year, month, day] = selectedDate.split('-');
        const comparisonDate = new Date(Number(year), Number(month) - 1, Number(day));
        
        const appointmentDateOnly = appointmentDate.toDateString();
        const comparisonDateOnly = comparisonDate.toDateString();
        
        return appointmentDateOnly === comparisonDateOnly && 
               apt.timeSlot === selectedTime &&
               apt.itemsToPickup.some(item => item.lockerNumber === lockerNumber);
      });

      if (lockerAppointments.length === 0) {
        return null;
      }

      console.log('🔍 Citas encontradas para casillero', lockerNumber, ':', lockerAppointments.length);
      console.log('🔍 Primera cita:', lockerAppointments[0]);

      // Convertir productos al formato Product3D usando la misma lógica que OrdersPage
      const products3D = lockerAppointments.flatMap(apt => 
        apt.itemsToPickup
          .filter(item => item.lockerNumber === lockerNumber)
          .map(item => {
            console.log('🔍 Item completo del backend:', item);
            console.log('🔍 Item.product:', item.product);
            console.log('🔍 Item.dimensiones:', item.dimensiones);
            console.log('🔍 Item.volumen:', item.volumen);
            console.log('🔍 Item.individualProduct:', item.individualProduct);
            console.log('🔍 Item.originalProduct:', item.originalProduct);
            console.log('🔍 Item.individualProductId:', (item as any).individualProductId);
            console.log('🔍 Item.originalProductId:', (item as any).originalProductId);
            console.log('🔍 Item.variants:', (item as any).variants);
            console.log('🔍 Item.quantity:', item.quantity);
            console.log('🔍 Item.lockerNumber:', item.lockerNumber);

            // Usar la misma lógica de dimensiones que en OrdersPage
            const dimensiones = getDimensiones(item);
            const volumen = getVolumen(item);
            
            console.log(`🔍 Procesando item ${item.product?.nombre}:`, {
              dimensiones: dimensiones,
              volumen: volumen,
              hasDimensiones: !!dimensiones,
              hasVolumen: !!volumen
            });

            // CORRECCIÓN: Usar la misma lógica que en OrdersPage
            let length = 15, width = 15, height = 15;
            let volume = 3375; // 15x15x15 como fallback
            
            // PRIORIDAD 1: Usar dimensiones del backend si están disponibles (como en OrdersPage)
            if (item.dimensiones) {
              length = item.dimensiones.largo;
              width = item.dimensiones.ancho;
              height = item.dimensiones.alto;
              volume = item.volumen || (length * width * height);
              console.log(`✅ Usando dimensiones del backend para ${item.product?.nombre}:`, { length, width, height, volume });
            } else if (dimensiones) {
              // PRIORIDAD 2: Usar dimensiones calculadas por getDimensiones
              length = dimensiones.largo;
              width = dimensiones.ancho;
              height = dimensiones.alto;
              volume = volumen || (length * width * height);
              console.log(`✅ Usando dimensiones calculadas para ${item.product?.nombre}:`, { length, width, height, volume });
            }

            // VERIFICAR: Si las dimensiones están en milímetros, convertir a centímetros
            if (length > 100 || width > 100 || height > 100) {
              console.log(`⚠️ Dimensiones muy grandes detectadas, convirtiendo de mm a cm:`, { length, width, height });
              length = length / 10;
              width = width / 10;
              height = height / 10;
              volume = length * width * height;
              console.log(`✅ Dimensiones convertidas:`, { length, width, height, volume });
            }

            console.log(`📏 Dimensiones finales para ${item.product?.nombre}:`, {
              original: dimensiones,
              backend: item.dimensiones,
              converted: { length, width, height },
              volume: length * width * height
            });

            const productName = item.product?.nombre || 
                               ((item.individualProduct as any)?.product?.nombre) || 
                               ((item.originalProduct as any)?.nombre) || 
                               'Producto sin nombre';
            
            console.log(`🏷️ Nombre del producto obtenido:`, {
              productName: productName,
              itemProduct: item.product?.nombre,
              individualProductName: (item.individualProduct as any)?.product?.nombre,
              originalProductName: (item.originalProduct as any)?.nombre
            });

            return {
              id: item.product?._id || 
                   ((item.individualProduct as any)?._id) || 
                   ((item.originalProduct as any)?._id) || 
                   'unknown',
              name: productName,
              dimensions: {
                length: length,
                width: width,
                height: height
              },
              quantity: item.quantity,
              volume: length * width * height
            };
          })
      );

      console.log('📦 Productos 3D generados:', products3D);

      // Realizar bin packing
      const result = gridPackingService.packProducts3D(products3D);
      
      console.log('🎯 Resultado del bin packing:', {
        lockers: result.lockers.length,
        failedProducts: result.failedProducts.length,
        rejectedProducts: result.rejectedProducts.length,
        totalEfficiency: result.totalEfficiency
      });

      // Log detallado de cada locker
      result.lockers.forEach((locker, index) => {
        console.log(`📦 Locker ${index + 1}:`, {
          id: locker.id,
          usedSlots: locker.usedSlots,
          totalSlots: 27,
          products: locker.packedProducts.length,
          isFull: locker.isFull,
          productsList: locker.packedProducts.map(p => p.product.name)
        });
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

  const handleShow3DView = (lockerNumber: number) => {
    setSelectedLocker(lockerNumber);
    const lockerData = generate3DDataForLocker(lockerNumber);
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
        `"${reservation.items.map(item => item.nombre).join('; ')}"`,
        reservation.items.reduce((total, item) => total + item.cantidad, 0)
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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
                        min={new Date().toISOString().split('T')[0]}
                        max={(() => {
                          const maxDate = new Date();
                          maxDate.setDate(maxDate.getDate() + 30); // Permitir hasta 30 días adelante
                          return maxDate.toISOString().split('T')[0];
                        })()}
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
                            className="btn btn-outline-warning btn-sm"
                            onClick={testAPI}
                            title="Probar conexión con la API"
                          >
                            <i className="bi bi-wifi me-1"></i>
                            Probar API
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
                                          <img 
                                            src={item.imagen_url} 
                                            alt={item.nombre}
                                            style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 2, marginRight: 8 }}
                                          />
                                          <span className="item-name">{item.nombre}</span>
                                        </div>
                                        <span className="item-quantity">x{item.cantidad}</span>
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
                                        <img 
                                          src={item.product?.imagen_url || 
                                               (item.individualProduct as any)?.product?.imagen_url || 
                                               (item.originalProduct as any)?.imagen_url || ''} 
                                          alt="Producto"
                                          style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 2, marginRight: 8 }}
                                        />
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
                                  onClick={() => {
                                    setSelectedTime(appointment.timeSlot);
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
                                {item.imagen_url && (
                                  <img 
                                    src={item.imagen_url} 
                                    alt={item.nombre}
                                    className="me-3"
                                    style={{ 
                                      width: '60px', 
                                      height: '60px', 
                                      objectFit: 'cover',
                                      borderRadius: '8px'
                                    }}
                                  />
                                )}
                                <div className="flex-grow-1">
                                  <h6 className="mb-1">{item.nombre}</h6>
                                  <p className="mb-0 text-muted">
                                    <strong>Cantidad:</strong> {item.cantidad}
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
                        <p><strong>ID de Reserva:</strong> <code>{selectedReservation.appointment._id}</code></p>
                        <p><strong>Fecha de Creación:</strong> {new Date(selectedReservation.appointment.createdAt || '').toLocaleDateString()}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Total de Productos:</strong> {selectedReservation.items.reduce((sum, item) => sum + item.cantidad, 0)}</p>
                        <p><strong>Tipos de Productos:</strong> {selectedReservation.items.length}</p>
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
