import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import appointmentService from '../../services/appointmentService';
import AppointmentScheduler from '../../components/AppointmentScheduler';
import PackingOptimizationTips from '../../components/PackingOptimizationTips';
import gridPackingService from '../../services/gridPackingService';
import type { CreateAppointmentData } from '../../services/appointmentService';
import type { Appointment } from '../../services/appointmentService';
import { getDimensiones, getVolumen, tieneDimensiones, hasLockerSpace } from './utils/productUtils';
import { createLocalDate, hasExpiredAppointments } from './utils/dateUtils';
import { useOrdersPage } from './hooks/useOrdersPage';
import ProductCard from './components/ProductCard';
import LockerVisualization from './components/LockerVisualization';
import AppointmentCard from './components/AppointmentCard';
import EditAppointmentModal from './components/EditAppointmentModal';
import LoadingOverlay from './components/LoadingOverlay';
import './OrdersPage.css';

const isDev = import.meta.env.DEV;

const OrdersPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const {
    // Estados
    purchasedProducts,
    loading,
    error,
    selectedProducts,
    lockerAssignments,
    claimingProducts,
    availableLockers,
    showAppointmentScheduler,
    schedulingAppointment,
    myAppointments,
    loadingAppointments,
    packingResult,
    showPackingOptimization,
    recentlyUnlockedProducts,
    cancellingAppointment,
    reservingLocker,
    updatingAppointment,
    showEditAppointmentModal,
    selectedAppointmentForEdit,
    editAppointmentDate,
    editAppointmentTime,
    editAppointmentLocker,
    penalizedDates,
    penaltyWarning,
    visualizationKey,

    // Setters
    setPurchasedProducts,
    setSelectedProducts,
    setLockerAssignments,
    setPackingResult,
    setRecentlyUnlockedProducts,
    setShowAppointmentScheduler,
    setShowPackingOptimization,
    setCancellingAppointment,
    setReservingLocker,
    setUpdatingAppointment,
    setSchedulingAppointment,
    setShowEditAppointmentModal,
    setSelectedAppointmentForEdit,
    setEditAppointmentDate,
    setEditAppointmentTime,
    setEditAppointmentLocker,
    setPenaltyWarning,
    setMyAppointments,

    // Funciones
    forceCleanupStates,
    fetchMyAppointments,
    selectAllAvailableProducts,
    updateLockerAssignments,
    canAddProductsToAppointment,
    forceVisualizationUpdate,
  } = useOrdersPage();

  // Mostrar solo 5 completadas inicialmente
  const [completedVisibleCount, setCompletedVisibleCount] = useState(5);

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Función para manejar selección de productos individuales
  const handleQuantityChange = (itemIndex: number, quantity: number) => {
    const item = purchasedProducts[itemIndex];

    if (item.isClaimed || item.assigned_locker) {
      return;
    }

    if (quantity !== 0 && quantity !== 1) {
      quantity = quantity > 0 ? 1 : 0;
    }

    if (quantity === 0) {
      const newSelectedProducts = new Map(selectedProducts);
      newSelectedProducts.delete(itemIndex);
      setSelectedProducts(newSelectedProducts);
      updateLockerAssignments(newSelectedProducts);
      return;
    }

    const currentSelection = selectedProducts.get(itemIndex);
    const newSelectedProducts = new Map(selectedProducts);
    const defaultLocker = availableLockers.length > 0 ? availableLockers[0] : 1;

    newSelectedProducts.set(itemIndex, {
      quantity: 1,
      lockerNumber: currentSelection?.lockerNumber || defaultLocker
    });

    setSelectedProducts(newSelectedProducts);
    updateLockerAssignments(newSelectedProducts);
  };

  // Función para manejar cambio de locker
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

  // Función para verificar errores de validación
  const getValidationErrors = () => {
    const errors: string[] = [];

    if (packingResult && packingResult.lockers.length > 0) {
      return errors;
    }

    selectedProducts.forEach((selection, itemIndex) => {
      const item = purchasedProducts[itemIndex];
      if (item.isClaimed || item.assigned_locker) return;
      if (!tieneDimensiones(item)) {
        errors.push(`El producto ${item.product?.nombre} no tiene dimensiones configuradas`);
      }
      const itemVolume = getVolumen(item) * selection.quantity;
      if (!hasLockerSpace(selection.lockerNumber, itemVolume, lockerAssignments)) {
        errors.push(`Los productos en el casillero ${selection.lockerNumber} exceden el espacio disponible`);
      }
    });
    return errors;
  };

  // Función para manejar envío de reclamación
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
      const selectedItemsArray = Array.from(selectedProducts.entries()).map(([itemIndex, selection]) => {
        const item = purchasedProducts[itemIndex];
        return {
          individualProductId: item._id || '',
          lockerNumber: selection.lockerNumber
        };
      });

      const result = await orderService.claimIndividualProducts(selectedItemsArray);

      alert(`Productos reclamados exitosamente!\n\nCasilleros asignados:\n${result.lockerAssignments.map((la: any) =>
        `Casillero ${la.locker}: ${la.volumePercentage}% de uso (${la.volume.toLocaleString()} cm³)`
      ).join('\n')}`);

      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);
      setSelectedProducts(new Map());
      setLockerAssignments(new Map());

    } catch (err: any) {
      alert(err.message || 'Error al reclamar productos');
    }
  };

  // Función para limpiar selección
  const handleClearSelection = () => {
    setSelectedProducts(new Map());
    setLockerAssignments(new Map());
  };

  // Función para mostrar información de optimización
  const showOptimizationInfo = () => {
    if (!packingResult || packingResult.lockers.length === 0) return;

    const totalSlots = packingResult.lockers.reduce((sum, locker) => sum + locker.usedSlots, 0);
    const totalCapacity = packingResult.lockers.length * 27;
    const overallUsage = (totalSlots / totalCapacity) * 100;

    const hasFullLocker = packingResult.lockers.some(locker => {
      const usagePercentage = (locker.usedSlots / 27) * 100;
      return usagePercentage >= 80;
    });

    let message = `📊 Información de Optimización\n\n`;
    message += `Casilleros utilizados: ${packingResult.lockers.length}\n`;
    message += `Slots ocupados: ${totalSlots}/${totalCapacity}\n`;
    message += `Uso total: ${overallUsage.toFixed(1)}%\n\n`;

    if (hasFullLocker) {
      message += `✅ Excelente optimización: Al menos un casillero está bien lleno.`;
    } else if (overallUsage >= 50) {
      message += `⚠️ Optimización moderada: Considera agregar más productos para llenar completamente un casillero.`;
    } else {
      message += `⚠️ Optimización baja: El espacio no se está aprovechando eficientemente.`;
    }

    alert(message);
  };

  // Función para cancelar reserva
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      return;
    }

    try {
      setCancellingAppointment(true);

      const appointmentToCancel = myAppointments.find(app => app._id === appointmentId);
      const productsInReservation = appointmentToCancel?.itemsToPickup || [];

      await appointmentService.cancelAppointment(appointmentId);

      forceCleanupStates();

      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);

      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);

      const message = productsInReservation.length > 0
        ? `✅ Reserva cancelada exitosamente\n\n📦 ${productsInReservation.length} producto${productsInReservation.length > 1 ? 's' : ''} han sido desbloqueado${productsInReservation.length > 1 ? 's' : ''} y están disponibles para nueva reserva.`
        : '✅ Reserva cancelada exitosamente';

      alert(message);

    } catch (err: any) {
      alert(err.message || 'Error al cancelar la reserva');
    } finally {
      setCancellingAppointment(false);
    }
  };

  // Función para editar reserva
  const handleEditAppointment = (appointment: Appointment, forceEdit = false) => {
    let initialDate = '';
    let initialTime = '';
    let initialLocker = appointment.itemsToPickup[0]?.lockerNumber || 1;

    // Siempre usar la fecha actual al abrir el modal de edición
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    initialDate = `${year}-${month}-${day}`;

    // No seleccionar automáticamente la hora original, dejar que el modal la seleccione
    // basándose en los horarios disponibles del backend
    initialTime = '';
    setSelectedAppointmentForEdit(appointment);
    setEditAppointmentDate(initialDate);
    setEditAppointmentTime(initialTime);
    setEditAppointmentLocker(initialLocker);
    setShowEditAppointmentModal(true);
  };

  // Función para actualizar reserva
  const handleUpdateAppointment = async (appointmentId: string, data: any) => {
    try {
      setUpdatingAppointment(true);

      const result = await appointmentService.updateMyAppointment(appointmentId, data);

      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);

      setShowEditAppointmentModal(false);
      setSelectedAppointmentForEdit(null);
      setEditAppointmentDate('');
      setEditAppointmentTime('');
      setEditAppointmentLocker(1);

      alert(result.message);

    } catch (err: any) {
      alert(err.message || 'Error al actualizar la reserva');
    } finally {
      setUpdatingAppointment(false);
    }
  };

  // Función para manejar reservas inteligentes
  const handleSmartReservation = async () => {
    try {
      setReservingLocker(true);

      if (!packingResult || !packingResult.lockers.length) {
        alert('No hay casilleros para reservar');
        return;
      }

      const hasFullLocker = packingResult.lockers.some(locker => {
        const usagePercentage = (locker.usedSlots / 27) * 100;
        return usagePercentage >= 80;
      });

      if (!hasFullLocker) {
        const totalSlots = packingResult.lockers.reduce((sum, locker) => sum + locker.usedSlots, 0);
        const totalCapacity = packingResult.lockers.length * 27;
        const overallUsage = (totalSlots / totalCapacity) * 100;

        const shouldContinue = confirm(
          `⚠️ Optimización de espacio\n\n` +
          `Tu selección actual usa ${overallUsage.toFixed(1)}% del espacio total.\n` +
          `Para una mejor optimización, considera agregar más productos para llenar completamente al menos un casillero.\n\n` +
          `¿Deseas continuar con la reserva de todas formas?`
        );

        if (!shouldContinue) {
          return;
        }
      }

      setShowAppointmentScheduler(true);

    } catch (error: any) {
      alert(error.message || 'Error al procesar la reserva inteligente');
    } finally {
      setReservingLocker(false);
    }
  };

  // Función para generar datos de packing combinados para todas las reservas activas
  const generateCombinedPackingForAllAppointments = () => {
    // Usar visualizationKey para forzar la actualización cuando cambie
    if (isDev) console.log('🔄 Generando visualización combinada (key:', visualizationKey, ')');
    try {
      if (isDev) console.log('🔍 Generando packing combinado para todas las reservas activas');

      // Obtener todas las reservas activas
      const activeAppointments = myAppointments.filter(
        appointment => appointment.status !== 'cancelled' && appointment.status !== 'completed'
      );

      if (isDev) console.log(`📅 Reservas activas encontradas: ${activeAppointments.length}`);

      // Agrupar productos por casillero
      const lockerProducts = new Map<number, Array<{
        id: string;
        name: string;
        dimensions: { length: number; width: number; height: number };
        quantity: number;
        volume: number;
        appointmentId: string;
      }>>();

      activeAppointments.forEach(appointment => {
        if (isDev) console.log(`📋 Procesando reserva ${appointment._id.slice(-6)}`);

        appointment.itemsToPickup?.forEach((item: any) => {
          const lockerNumber = item.lockerNumber;

          if (!lockerProducts.has(lockerNumber)) {
            lockerProducts.set(lockerNumber, []);
          }

          // Buscar el producto individual correspondiente
          // Verificar que item.product existe antes de procesar
          if (!item.product) {
            if (isDev) console.warn('⚠️ Item sin producto:', item);
            return;
          }

          // Primero intentar buscar por ID directo (nuevas reservas con productos individuales)
          let individualProduct = purchasedProducts.find(p =>
            p._id === item.product._id
          );

          // Si no se encuentra, buscar por nombre del producto (reservas antiguas con productos base)
          if (!individualProduct) {
            individualProduct = purchasedProducts.find(p =>
              p.product?.nombre === item.product.nombre
            );
          }

          // Si aún no se encuentra, buscar por ID del producto base (reservas antiguas)
          if (!individualProduct) {
            individualProduct = purchasedProducts.find(p =>
              p.product?._id === item.product._id
            );
          }

          let dimensions = { length: 15, width: 15, height: 15 };
          let volume = 15 * 15 * 15;

          // Usar las dimensiones calculadas del backend si están disponibles
          if (isDev) console.log(`🔍 Item de reserva para ${item.product.nombre}:`, {
            hasDimensiones: !!item.dimensiones,
            dimensiones: item.dimensiones,
            volumen: item.volumen,
            variants: item.variants,
            individualProductId: item.individualProductId
          });

          // Resolver dimensiones como en la previsualización: construir fuente con
          // - product: el más completo (para tener attributes/definesDimensions)
          // - variants: selección real del item (o alternativas)
          const candidateFromPurchased = purchasedProducts.find(p => p._id === (item as any).individualProduct)
            || purchasedProducts.find(p => p._id === (item as any).individualProductId)
            || purchasedProducts.find(p => p.product?._id === (item as any).originalProduct)
            || purchasedProducts.find(p => p._id === item.product._id)
            || purchasedProducts.find(p => p.product?.nombre === item.product.nombre)
            || purchasedProducts.find(p => p.product?._id === item.product._id);
          const rawSelectedVariants = (item as any).variants || (item as any).variantSelections || candidateFromPurchased?.variants || (candidateFromPurchased as any)?.variantSelections || {};
          // Prefiere el producto con estructura completa de variantes
          const fullProduct = candidateFromPurchased?.product && candidateFromPurchased.product.variants ? candidateFromPurchased.product : item.product;
          // Normalizar claves de variantes a los nombres de atributos del producto (case-insensitive)
          const normalizeVariants = (product: any, selection: Record<string, string>) => {
            try {
              const result: Record<string, string> = {};
              const selEntries = Object.entries(selection || {}).map(([k, v]) => [String(k).toLowerCase(), v]) as [string, string][];
              const attrs = product?.variants?.attributes || [];
              attrs.forEach((attr: any) => {
                const keyLc = String(attr?.name || '').toLowerCase();
                const match = selEntries.find(([k]) => k === keyLc);
                if (match) result[attr.name] = match[1];
              });
              return Object.keys(result).length > 0 ? result : (selection || {});
            } catch {
              return selection || {};
            }
          };
          const selectedVariants = normalizeVariants(fullProduct, rawSelectedVariants);
          const sourceForDims = {
            ...(candidateFromPurchased || {}),
            product: fullProduct,
            variants: selectedVariants,
            dimensiones: item.dimensiones || candidateFromPurchased?.dimensiones,
          } as any;
          const dimsFromHelper = getDimensiones(sourceForDims);
          if (dimsFromHelper && dimsFromHelper.largo && dimsFromHelper.ancho && dimsFromHelper.alto) {
            dimensions = {
              length: dimsFromHelper.largo,
              width: dimsFromHelper.ancho,
              height: dimsFromHelper.alto
            };
            volume = item.volumen || getVolumen(sourceForDims) || (dimensions.length * dimensions.width * dimensions.height);
            if (isDev) console.log(`✅ Usando dimensiones vía helper para ${item.product.nombre}:`, dimensions);
          } else if (item.dimensiones) {
            // Fallback directo a backend si por alguna razón el helper no devuelve
            dimensions = {
              length: item.dimensiones.largo,
              width: item.dimensiones.ancho,
              height: item.dimensiones.alto
            };
            volume = item.volumen || (item.dimensiones.largo * item.dimensiones.ancho * item.dimensiones.alto);
            if (isDev) console.log(`✅ Usando dimensiones del backend para ${item.product.nombre}:`, dimensions);
          }

          // Asegurar que el volumen se calcule correctamente solo si no se calculó antes
          if (volume === 0 && dimensions && dimensions.length && dimensions.width && dimensions.height) {
            volume = dimensions.length * dimensions.width * dimensions.height;
          }

          if (isDev) console.log(`📏 Producto ${item.product.nombre} en reserva:`, {
            dimensions,
            volume,
            volumeCalculated: volume,
            expectedVolume: dimensions.length * dimensions.width * dimensions.height,
            hasIndividualProduct: !!individualProduct,
            individualProductId: individualProduct?._id,
            productId: item.product._id,
            productName: item.product.nombre,
            searchStrategies: {
              directMatch: purchasedProducts.find(p => p._id === item.product._id),
              nameMatch: purchasedProducts.find(p => p.product?.nombre === item.product.nombre),
              baseProductMatch: purchasedProducts.find(p => p.product?._id === item.product._id)
            },
            individualProductDetails: individualProduct ? {
              id: individualProduct._id,
              hasDimensiones: !!individualProduct.dimensiones,
              dimensiones: individualProduct.dimensiones,
              variants: individualProduct.variants
            } : null
          });

          lockerProducts.get(lockerNumber)!.push({
            id: item.product._id,
            name: item.product.nombre,
            dimensions,
            quantity: item.quantity,
            volume,
            appointmentId: appointment._id
          });
        });
      });

      if (isDev) console.log('🏪 Productos agrupados por casillero:', lockerProducts);

      // Generar visualización para cada casillero
      const combinedLockers: any[] = [];

      lockerProducts.forEach((products, lockerNumber) => {
        if (isDev) console.log(`🎨 Generando visualización para casillero ${lockerNumber} con ${products.length} productos`);

        // Convertir al formato Product3D
        const products3D: any[] = products.map(product => ({
          id: product.id,
          name: product.name,
          dimensions: product.dimensions,
          quantity: product.quantity,
          volume: product.volume
        }));

        // Realizar bin packing para este casillero
        const result = gridPackingService.packProducts3D(products3D);

        if (result.lockers.length > 0) {
          const combinedLocker = {
            ...result.lockers[0],
            id: `locker_${lockerNumber}`,
            lockerNumber: lockerNumber,
            products: products // Mantener información de qué reserva tiene cada producto
          };
          combinedLockers.push(combinedLocker);
        }
      });

      if (isDev) console.log('📊 Resultado del packing combinado:', combinedLockers);
      return combinedLockers;
    } catch (error) {
      console.error('Error al generar packing combinado:', error);
      return [];
    }
  };

  // Función para generar datos de packing para una reserva (mantener para compatibilidad)
  const generatePackingForAppointment = (appointment: Appointment) => {
    try {
      if (isDev) console.log('🔍 Generando packing para reserva individual:', appointment._id);
      if (isDev) console.log('📦 Productos en la reserva:', appointment.itemsToPickup);

      // Convertir productos de la reserva al formato Product3D
      const products = appointment.itemsToPickup.map((item: any) => {
        // Verificar que item.product existe antes de procesar
        if (!item.product) {
          if (isDev) console.warn('⚠️ Item sin producto:', item);
          return null;
        }

        // Buscar el producto individual correspondiente para obtener dimensiones correctas (incluyendo variantes)
        // Buscar el producto individual correspondiente
        // Primero intentar buscar por ID directo (nuevas reservas con productos individuales)
        let individualProduct = purchasedProducts.find(p =>
          p._id === item.product._id
        );

        // Si no se encuentra, buscar por nombre del producto (reservas antiguas con productos base)
        if (!individualProduct) {
          individualProduct = purchasedProducts.find(p =>
            p.product?.nombre === item.product.nombre
          );
        }

        // Si aún no se encuentra, buscar por ID del producto base (reservas antiguas)
        if (!individualProduct) {
          individualProduct = purchasedProducts.find(p =>
            p.product?._id === item.product._id
          );
        }

        let dimensions = { length: 15, width: 15, height: 15 };
        let volume = 15 * 15 * 15;

        // Usar las dimensiones calculadas del backend si están disponibles
        if (isDev) console.log(`🔍 Item de reserva para ${item.product.nombre}:`, {
          hasDimensiones: !!item.dimensiones,
          dimensiones: item.dimensiones,
          volumen: item.volumen,
          variants: item.variants,
          individualProductId: item.individualProductId
        });

        // Usar directamente las dimensiones del backend si están disponibles
        if (item.dimensiones) {
          dimensions = {
            length: item.dimensiones.largo,
            width: item.dimensiones.ancho,
            height: item.dimensiones.alto
          };
          volume = item.volumen || (item.dimensiones.largo * item.dimensiones.ancho * item.dimensiones.alto);
          if (isDev) console.log(`✅ Usando dimensiones del backend para ${item.product.nombre}:`, dimensions);
        } else {
          // Fallback: buscar en el producto individual correspondiente
          if (isDev) console.log(`⚠️ No hay dimensiones del backend para ${item.product.nombre}, buscando en producto individual`);

          // Buscar el producto individual correspondiente
          let individualProduct = purchasedProducts.find(p =>
            p._id === item.product._id
          );

          if (!individualProduct) {
            individualProduct = purchasedProducts.find(p =>
              p.product?.nombre === item.product.nombre
            );
          }

          if (!individualProduct) {
            individualProduct = purchasedProducts.find(p =>
              p.product?._id === item.product._id
            );
          }

          if (individualProduct && individualProduct.dimensiones) {
            dimensions = {
              length: individualProduct.dimensiones.largo,
              width: individualProduct.dimensiones.ancho,
              height: individualProduct.dimensiones.alto
            };
            volume = individualProduct.product?.volumen || (individualProduct.dimensiones.largo * individualProduct.dimensiones.ancho * individualProduct.dimensiones.alto);
            if (isDev) console.log(`✅ Usando dimensiones del producto individual para ${item.product.nombre}:`, dimensions);
          } else {
            // Último fallback: usar la misma lógica que la visualización previa a la reserva
            if (isDev) console.log(`⚠️ No hay dimensiones del producto individual para ${item.product.nombre}, usando fallback`);
            const dimensiones = getDimensiones(item);
            if (dimensiones) {
              dimensions = {
                length: dimensiones.largo,
                width: dimensiones.ancho,
                height: dimensiones.alto
              };
              volume = getVolumen(item);
              if (isDev) console.log(`📏 Usando dimensiones del fallback para ${item.product.nombre}:`, dimensions);
            }
          }
        }

        // Asegurar que el volumen se calcule correctamente solo si no se calculó antes
        if (volume === 0 && dimensions && dimensions.length && dimensions.width && dimensions.height) {
          volume = dimensions.length * dimensions.width * dimensions.height;
        }

        if (isDev) console.log(`📏 Producto ${item.product.nombre}:`, {
          dimensions,
          volume,
          volumeCalculated: volume,
          expectedVolume: dimensions.length * dimensions.width * dimensions.height,
          hasIndividualProduct: !!individualProduct,
          individualProductId: individualProduct?._id,
          hasDimensionsInReservation: !!item.product.dimensiones,
          productId: item.product._id,
          productName: item.product.nombre,
          searchStrategies: {
            directMatch: purchasedProducts.find(p => p._id === item.product._id),
            nameMatch: purchasedProducts.find(p => p.product?.nombre === item.product.nombre),
            baseProductMatch: purchasedProducts.find(p => p.product?._id === item.product._id)
          },
          individualProductDetails: individualProduct ? {
            id: individualProduct._id,
            hasDimensiones: !!individualProduct.dimensiones,
            dimensiones: individualProduct.dimensiones,
            variants: individualProduct.variants
          } : null
        });

        return {
          id: item.product._id,
          name: item.product.nombre,
          dimensions,
          quantity: item.quantity,
          volume
        };
      });

      if (isDev) console.log('📋 Productos convertidos para packing:', products);

      // Filtrar productos nulos y realizar bin packing
      const validProducts = products.filter(product => product !== null);
      const result = gridPackingService.packProducts3D(validProducts);
      if (isDev) console.log('📊 Resultado del packing:', result);
      return result;
    } catch (error) {
      console.error('Error al generar packing para reserva:', error);
      return null;
    }
  };

  // Función para agendar cita
  const handleScheduleAppointment = async (appointmentsData: CreateAppointmentData[]) => {
    // MEJORADA: Validación más específica de penalizaciones
    const penalizedAppointments = appointmentsData.filter(app => penalizedDates.includes(app.scheduledDate));

    if (penalizedAppointments.length > 0) {
      const penalizedDatesList = penalizedAppointments.map(app =>
        new Date(app.scheduledDate).toLocaleDateString('es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      ).join(', ');

      setPenaltyWarning(`No puedes reservar para las siguientes fechas debido a reservas vencidas: ${penalizedDatesList}. Las penalizaciones expiran en 24 horas.`);
      return;
    }
    setPenaltyWarning('');

    try {
      setSchedulingAppointment(true);

      const existingLockers: number[] = [];
      const newLockers: number[] = [];

      if (packingResult) {
        packingResult.lockers.forEach(locker => {
          const lockerNumber = parseInt(locker.id.replace('locker_', ''));
          const isExisting = myAppointments.some(appointment =>
            appointment.status !== 'cancelled' &&
            appointment.status !== 'completed' &&
            appointment.itemsToPickup?.some((item: any) => item.lockerNumber === lockerNumber)
          );

          if (isExisting) {
            existingLockers.push(lockerNumber);
          } else {
            newLockers.push(lockerNumber);
          }
        });
      }

      // Procesar productos para casilleros existentes
      if (existingLockers.length > 0) {
        for (const lockerNumber of existingLockers) {
          const existingAppointment = myAppointments.find(appointment =>
            appointment.status !== 'cancelled' &&
            appointment.status !== 'completed' &&
            appointment.itemsToPickup?.some((item: any) => item.lockerNumber === lockerNumber)
          );

          if (existingAppointment) {
            const productsForThisLocker = Array.from(selectedProducts.entries())
              .filter(([itemIndex, selection]) => selection.lockerNumber === lockerNumber)
              .map(([itemIndex, selection]) => {
                const item = purchasedProducts[itemIndex];
                return {
                  productId: item._id || '',
                  quantity: 1,
                  lockerNumber: lockerNumber
                };
              })
              .filter(product => product.productId);

            if (productsForThisLocker.length > 0) {
              await appointmentService.addProductsToAppointment(existingAppointment._id, productsForThisLocker);
            }
          }
        }
      }

      // Crear múltiples reservas para casilleros nuevos
      if (newLockers.length > 0) {
        const result = await appointmentService.createMultipleAppointments(appointmentsData);

        let message = `¡Reservas creadas exitosamente!\n\n`;

        if (existingLockers.length > 0) {
          message += `✅ Productos agregados a ${existingLockers.length} reserva(s) existente(s)\n`;
        }

        if (result.appointments.length > 0) {
          message += `📅 Se crearon ${result.appointments.length} nueva(s) reserva(s):\n\n`;

          result.appointments.forEach((appointment: any) => {
            message += `📅 Casillero ${appointment.lockerNumber}: ${new Date(appointment.scheduledDate).toLocaleDateString('es-CO')} a las ${appointment.timeSlot}\n`;
          });
        }

        alert(message);
      } else if (existingLockers.length > 0) {
        alert('✅ Productos agregados exitosamente a tus reservas existentes');
      }

      // Recargar los datos
      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);
      setSelectedProducts(new Map());
      setLockerAssignments(new Map());
      setPackingResult(null);
      setShowAppointmentScheduler(false);

      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);

      // Forzar actualización de la visualización
      forceVisualizationUpdate();

    } catch (err: any) {
      alert(err.message || 'Error al agendar las reservas');
    } finally {
      setSchedulingAppointment(false);
    }
  };

  // Filtrar productos válidos
  // Filtrar productos válidos (que no hayan sido reclamados o recogidos)
  const validPurchasedProducts = purchasedProducts.filter(
    p => p.orderId && p.status !== 'claimed' && p.status !== 'picked_up'
  );

  // Verificar productos en reservas
  const productosEnReservas = new Set<string>();
  myAppointments.forEach(appointment => {
    if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
      appointment.itemsToPickup.forEach((item: any) => {
        // Verificar que item.product existe antes de acceder a _id
        if (item.product && item.product._id) {
          productosEnReservas.add(item.product._id);
        }
      });
    }
  });

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Verificando autenticación...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    return null;
  }

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
            <div className="d-flex gap-2 align-items-center">
              {validPurchasedProducts.length > 0 && selectedProducts.size === 0 && (
                <>
                  {(() => {
                    // Verificar si hay reservas vencidas usando la función utilitaria
                    const hasExpired = hasExpiredAppointments(myAppointments);

                    if (hasExpired) {
                      return (
                        <div className="text-danger fw-bold">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Primero actualiza tus reservas vencidas
                        </div>
                      );
                    }

                    return (
                      <button
                        className="btn btn-outline-primary"
                        onClick={selectAllAvailableProducts}
                        disabled={loading}
                      >
                        <i className="bi bi-check-all me-1"></i>
                        Seleccionar Todos los Productos
                      </button>
                    );
                  })()}
                </>
              )}
              {selectedProducts.size > 0 && (
                <>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleClearSelection}
                    disabled={claimingProducts || reservingLocker}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Limpiar Selección
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleSmartReservation}
                    disabled={claimingProducts || reservingLocker}
                  >
                    {reservingLocker ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-calendar-check me-1"></i>
                        Reservar Casillero
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger text-center">{error}</div>
          ) : validPurchasedProducts.length > 0 ? (
            <>
              {/* Productos */}
              <div className="mb-5">
                <h4 className="mb-3">
                  <i className="bi bi-cart me-2"></i>
                  Mis Productos Comprados
                </h4>
                {validPurchasedProducts.map((item, index) => {
                  const selectedProduct = selectedProducts.get(index);
                  const isRecentlyUnlocked = recentlyUnlockedProducts.has(item._id || '');
                  const yaEstaEnReserva = productosEnReservas.has(item._id || '');

                  return (
                    <ProductCard
                      key={index}
                      item={item}
                      index={index}
                      selectedProduct={selectedProduct}
                      isRecentlyUnlocked={isRecentlyUnlocked}
                      yaEstaEnReserva={yaEstaEnReserva}
                    />
                  );
                })}
              </div>

              {/* Visualización de Casilleros */}
              {lockerAssignments.size > 0 && packingResult && (
                <div className="mb-5">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">
                      <i className="bi bi-grid-3x3-gap me-2"></i>
                      Casilleros Optimizados (Bin Packing 3D)
                    </h4>
                  </div>

                  <div className="row">
                    {packingResult.lockers.map((locker, index) => {
                      const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                      const isExistingLocker = myAppointments.some(appointment =>
                        appointment.status !== 'cancelled' &&
                        appointment.status !== 'completed' &&
                        appointment.itemsToPickup?.some((item: any) => item.lockerNumber === lockerNumber)
                      );

                      return (
                        <LockerVisualization
                          key={locker.id}
                          locker={locker}
                          index={index}
                          isExistingLocker={isExistingLocker}
                          selectedProductId={(() => {
                            const firstSelected = Array.from(selectedProducts.keys())[0];
                            if (firstSelected !== undefined) {
                              const item = purchasedProducts[firstSelected];
                              return item?._id || item?.product?._id || null;
                            }
                            return null;
                          })()}
                        />
                      );
                    })}
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

              {/* Advertencia de penalización */}
              {penaltyWarning && (
                <div className="alert alert-info">
                  <h6 className="alert-heading">
                    <i className="bi bi-clock-history me-2"></i>
                    Información de Penalizaciones
                  </h6>
                  <p className="mb-0">{penaltyWarning}</p>
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
                  <div className="row mb-4">
                    {myAppointments
                      .filter(appointment => appointment.status !== 'cancelled' && appointment.status !== 'completed')
                      .map(appointment => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          onEdit={handleEditAppointment}
                          onCancel={handleCancelAppointment}
                          cancellingAppointment={cancellingAppointment}
                          updatingAppointment={updatingAppointment}
                          purchasedProducts={purchasedProducts}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="alert alert-info text-center">
                    <i className="bi bi-calendar-x me-2"></i>
                    No tienes reservas activas
                  </div>
                )}

                {/* Visualización combinada eliminada para aligerar la página */}
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

          {/* Mis Reservas Completadas - Siempre visible (limitadas con "Cargar más") */}
          <div className="mb-5">
            <h4 className="mb-3">
              <i className="bi bi-check-circle me-2"></i>
              Mis Reservas Completadas
            </h4>
            {(() => {
              // Estado local para mostrar 5 y cargar más
              // Nota: React no permite hooks condicionales; definimos fuera del render condicional
              return null;
            })()}

            {loadingAppointments ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Cargando reservas completadas...</span>
                </div>
              </div>
            ) : myAppointments.filter(appointment => appointment.status === 'completed').length > 0 ? (
              <>
                <div className="row mb-4">
                  {myAppointments
                    .filter(appointment => appointment.status === 'completed')
                    .slice(0, completedVisibleCount)
                    .map(appointment => (
                      <div key={appointment._id} className="col-12 mb-3">
                        <div className="card border-success appointment-card">
                          <div className="card-header bg-success text-white">
                            <div className="d-flex justify-content-between align-items-center">
                              <h6 className="mb-0">
                                <i className="bi bi-calendar-check me-2"></i>
                                Reserva #{appointment._id.slice(-6)} - Completada
                              </h6>
                              <span className="badge bg-success">
                                <i className="bi bi-check-circle me-1"></i>
                                Completada
                              </span>
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-3">
                                <p className="mb-1">
                                  <strong>Fecha:</strong><br />
                                  {new Date(appointment.scheduledDate).toLocaleDateString('es-CO', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="mb-1">
                                  <strong>Hora:</strong><br />
                                  {appointment.timeSlot}
                                </p>
                                <p className="mb-1">
                                  <strong>Completada el:</strong><br />
                                  {appointment.completedAt ? new Date(appointment.completedAt).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </p>
                              </div>
                              <div className="col-md-3">
                                <p className="mb-1">
                                  <strong>Casilleros utilizados:</strong><br />
                                  {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
                                </p>
                                <p className="mb-1">
                                  <strong>Productos recogidos:</strong><br />
                                  {appointment.itemsToPickup.length} producto{appointment.itemsToPickup.length > 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="col-md-6">
                                <div className="alert alert-success mb-3">
                                  <i className="bi bi-info-circle me-2"></i>
                                  <strong>Reserva Finalizada:</strong> Esta reserva fue completada exitosamente.
                                  Los productos han sido recogidos y los casilleros liberados.
                                </div>

                                {/* Productos de la reserva completada */}
                                <div className="mt-3">
                                  <h6 className="mb-2">
                                    <i className="bi bi-box-seam me-2"></i>
                                    Productos Recogidos:
                                    <small className="text-muted ms-2">
                                      <i className="bi bi-cursor me-1"></i>
                                      Haz clic en cualquier producto para verlo
                                    </small>
                                  </h6>
                                  <div className="row">
                                    {appointment.itemsToPickup.map((item: any, itemIndex: number) => (
                                      <div key={itemIndex} className="col-md-6 mb-2">
                                        <div
                                          className="card border-success product-item-card"
                                          style={{ cursor: 'pointer' }}
                                          onClick={() => {
                                            let productId = null;

                                            if (item.product?._id) {
                                              productId = item.product._id;
                                            } else if (item.individualProduct?._id) {
                                              productId = item.individualProduct._id;
                                            } else if (item.originalProduct?._id) {
                                              productId = item.originalProduct._id;
                                            } else {
                                              const searchName = item.product?.nombre ||
                                                (item.individualProduct as any)?.product?.nombre ||
                                                (item.originalProduct as any)?.nombre;
                                              if (searchName) {
                                                const found = purchasedProducts.find(p => p.product?.nombre === searchName);
                                                if (found?.product?._id) productId = found.product._id;
                                              }
                                            }

                                            if (productId) {
                                              navigate(`/productos/${productId}`);
                                            } else {
                                              alert('No se pudo encontrar la información del producto.');
                                            }
                                          }}
                                          title="Haz clic para ver el producto"
                                        >
                                          <div className="card-body p-2">
                                            <div className="d-flex align-items-center">
                                              {/* Imagen del producto */}
                                              <div className="product-image-container me-3">
                                                {(() => {
                                                  // Buscar la imagen del producto
                                                  let productImage = null;
                                                  let productName = '';

                                                  // Estrategia 1: Imagen del producto directo
                                                  if (item.product?.imagen_url) {
                                                    productImage = item.product.imagen_url;
                                                    productName = item.product.nombre;
                                                  }
                                                  // Estrategia 2: Imagen del IndividualProduct
                                                  else if (item.individualProduct?.product?.imagen_url) {
                                                    productImage = item.individualProduct.product.imagen_url;
                                                    productName = item.individualProduct.product.nombre;
                                                  }
                                                  // Estrategia 3: Imagen del OriginalProduct
                                                  else if (item.originalProduct?.imagen_url) {
                                                    productImage = item.originalProduct.imagen_url;
                                                    productName = item.originalProduct.nombre;
                                                  }
                                                  // Estrategia 4: Buscar en productos comprados
                                                  else {
                                                    const searchName = item.product?.nombre ||
                                                      (item.individualProduct as any)?.product?.nombre ||
                                                      (item.originalProduct as any)?.nombre;
                                                    if (searchName) {
                                                      const foundProduct = purchasedProducts.find(p =>
                                                        p.product?.nombre === searchName
                                                      );
                                                      if (foundProduct?.product?.imagen_url) {
                                                        productImage = foundProduct.product.imagen_url;
                                                        productName = foundProduct.product.nombre;
                                                      }
                                                    }
                                                  }

                                                  if (productImage) {
                                                    return (
                                                      <img
                                                        src={productImage}
                                                        alt={productName}
                                                        className="product-thumbnail"
                                                        style={{
                                                          width: '44px',
                                                          height: '44px',
                                                          objectFit: 'cover',
                                                          borderRadius: '6px',
                                                          border: '1px solid #d4edda'
                                                        }}
                                                        onError={(e) => {
                                                          e.currentTarget.style.display = 'none';
                                                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                                          if (placeholder) placeholder.style.display = 'flex';
                                                        }}
                                                      />
                                                    );
                                                  } else {
                                                    return (
                                                      <div className="bg-success-light rounded d-flex align-items-center justify-content-center product-placeholder"
                                                        style={{ width: '44px', height: '44px', backgroundColor: '#f8fff9' }}
                                                        title="Imagen no disponible">
                                                        <i className="bi bi-box text-success" style={{ fontSize: '18px' }}></i>
                                                      </div>
                                                    );
                                                  }
                                                })()}
                                              </div>

                                              <div className="flex-grow-1">
                                                <h6 className="mb-0 text-success">
                                                  {item.product?.nombre ||
                                                    (item.individualProduct as any)?.product?.nombre ||
                                                    (item.originalProduct as any)?.nombre || 'Producto sin nombre'}
                                                </h6>
                                                <small className="text-muted">
                                                  Cantidad: {item.quantity} | Casillero: {item.lockerNumber}
                                                </small>
                                              </div>
                                              <div className="text-end">
                                                <i className="bi bi-arrow-right-circle text-success"></i>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                {myAppointments.filter(a => a.status === 'completed').length > completedVisibleCount && (
                  <div className="text-center">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setCompletedVisibleCount(c => c + 5)}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Cargar más
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="alert alert-info text-center">
                <i className="bi bi-calendar-x me-2"></i>
                No tienes reservas completadas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edición de Reserva */}
      <EditAppointmentModal
        isOpen={showEditAppointmentModal}
        appointment={selectedAppointmentForEdit}
        editAppointmentDate={editAppointmentDate}
        editAppointmentTime={editAppointmentTime}
        editAppointmentLocker={editAppointmentLocker}
        penalizedDates={penalizedDates}
        myAppointments={myAppointments}
        updatingAppointment={updatingAppointment}
        onClose={() => {
          setShowEditAppointmentModal(false);
          setSelectedAppointmentForEdit(null);
          setEditAppointmentDate('');
          setEditAppointmentTime('');
          setEditAppointmentLocker(1);
        }}
        onUpdate={handleUpdateAppointment}
        onDateChange={setEditAppointmentDate}
        onTimeChange={setEditAppointmentTime}
        onLockerChange={setEditAppointmentLocker}
      />

      {/* Modal de Agendamiento de Citas */}
      {showAppointmentScheduler && packingResult && (
        <AppointmentScheduler
          isOpen={showAppointmentScheduler}
          onClose={() => setShowAppointmentScheduler(false)}
          onSchedule={handleScheduleAppointment}
          orderId={(() => {
            const firstValid = Array.from(selectedProducts.keys())
              .map(idx => validPurchasedProducts[idx])
              .find(p => p && p.orderId);
            return firstValid?.orderId || '';
          })()}
          itemsToPickup={(() => {
            const lockersToInclude = packingResult.lockers.filter(locker => {
              const lockerNumber = parseInt(locker.id.replace('locker_', ''));
              const isExisting = myAppointments.some(appointment =>
                appointment.status !== 'cancelled' &&
                appointment.status !== 'completed' &&
                appointment.itemsToPickup?.some((item: any) => item.lockerNumber === lockerNumber)
              );
              return !isExisting;
            });

            return lockersToInclude.map((locker, idx) => {
              const lockerNumber = parseInt(locker.id.replace('locker_', ''));

              const productsInThisLocker = Array.from(selectedProducts.entries())
                .filter(([itemIndex, selection]) => selection.lockerNumber === lockerNumber)
                .map(([itemIndex, selection]) => {
                  const item = purchasedProducts[itemIndex];
                  return {
                    name: item.product?.nombre || `Producto ${itemIndex + 1}`,
                    count: 1,
                    productId: item._id
                  };
                });

              return {
                lockerIndex: idx + 1,
                lockerNumber: lockerNumber,
                quantity: productsInThisLocker.length,
                products: productsInThisLocker
              };
            });
          })()}
          loading={schedulingAppointment}
          onlyNewLockers={true}
          onlyExistingLockers={false}
          existingLockersCount={0}
        />
      )}

      {/* Loading Overlays */}
      <LoadingOverlay
        isVisible={cancellingAppointment}
        title="Cancelando Reserva"
        message="Liberando productos y actualizando el sistema..."
      />

      <LoadingOverlay
        isVisible={reservingLocker}
        title="Procesando Reserva"
        message="Preparando casilleros y optimizando espacio..."
      />

      <LoadingOverlay
        isVisible={schedulingAppointment}
        title="Agendando Cita"
        message="Creando reservas y agregando productos a casilleros..."
      />

      {penaltyWarning && (
        <div className="alert alert-danger text-center">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {penaltyWarning}
        </div>
      )}
    </div>
  );
};

export default OrdersPage; 