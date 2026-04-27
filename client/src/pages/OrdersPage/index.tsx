import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useOrdersPage } from './hooks/useOrdersPage';
import orderService from '../../services/orderService';
import appointmentService from '../../services/appointmentService';
import AppointmentScheduler from '../../components/AppointmentScheduler';
import type { CreateAppointmentData, Appointment } from '../../services/appointmentService';
import { tieneDimensiones, getVolumen, getDimensiones } from './utils/productUtils';
import { hasExpiredAppointments } from './utils/dateUtils';
import ProductCard from './components/ProductCard';
import LockerVisualization from './components/LockerVisualization';
import AppointmentCard from './components/AppointmentCard';
import EditAppointmentModal from './components/EditAppointmentModal';
import LoadingOverlay from './components/LoadingOverlay';
import ConfirmModal from '../../components/ConfirmModal';
import './OrdersPage.css';
import gridPackingService from '../../services/gridPackingService';

const isDev = import.meta.env.DEV;

const OrdersPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const {
    // Estados
    purchasedProducts,
    loading,
    error,
    selectedProducts,
    lockerAssignments,
    showAppointmentScheduler,
    schedulingAppointment,
    myAppointments,
    loadingAppointments,
    packingResult,
    recentlyUnlockedProducts,
    cancellingAppointment,
    reservingLocker,
    updatingAppointment,
    showEditAppointmentModal,
    selectedAppointmentForEdit,
    editAppointmentDate,
    editAppointmentTime,
    penalizedDates,
    penaltyWarning,
    visualizationKey,
    claimingProducts,
    setPurchasedProducts,
    setSelectedProducts,
    setLockerAssignments,
    setPackingResult,
    setShowAppointmentScheduler,
    setCancellingAppointment,
    setReservingLocker,
    setUpdatingAppointment,
    setSchedulingAppointment,
    setShowEditAppointmentModal,
    setSelectedAppointmentForEdit,
    setEditAppointmentDate,
    setEditAppointmentTime,
    setPenaltyWarning,
    setMyAppointments,
    forceCleanupStates,
    selectAllAvailableProducts,
    forceVisualizationUpdate,
  } = useOrdersPage();

  // Función para verificar errores de validación
  const getValidationErrors = () => {
    const errors: string[] = [];

    // Si el algoritmo de packing ya generó lockers, no hay errores de validación de espacio
    if (packingResult && packingResult.lockers.length > 0) {
      return errors;
    }

    selectedProducts.forEach((_, itemIndex) => {
      const item = purchasedProducts[itemIndex];
      if (item.isClaimed || item.assigned_locker) return;

      if (!tieneDimensiones(item)) {
        errors.push(`El producto ${item.product?.nombre || 'sin nombre'} no tiene dimensiones configuradas.`);
      }
    });

    return errors;
  };

  // Estado para el modal de confirmación/alerta personalizado
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

  // Funciones auxiliares para mostrar el modal
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
        type: 'alert',
        variant
      });
    });
  };

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

  // Mostrar solo 5 completadas inicialmente
  const [completedVisibleCount, setCompletedVisibleCount] = useState(5);

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Función para limpiar selección
  const handleClearSelection = () => {
    setSelectedProducts(new Map());
    setLockerAssignments(new Map());
  };

  // Función para cancelar reserva
  const handleCancelAppointment = async (appointmentId: string) => {
    const confirmed = await showConfirm(
      'Confirmar Cancelación',
      '¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer.',
      'danger',
      'Cancelar Reserva'
    );

    if (!confirmed) {
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

      setCancellingAppointment(false);
      await showAlert('¡Éxito!', message, 'success');

    } catch (err: any) {
      setCancellingAppointment(false);
      await showAlert('Error', err.message || 'Error al cancelar la reserva', 'danger');
    } finally {
      setCancellingAppointment(false);
    }
  };

  // Función para editar reserva
  const handleEditAppointment = (appointment: Appointment, _forceEdit = false) => {
    let initialDate = '';
    let initialTime = '';
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

      setUpdatingAppointment(false);
      await showAlert('¡Éxito!', result.message, 'success');

    } catch (err: any) {
      setUpdatingAppointment(false);
      await showAlert('Error', err.message || 'Error al actualizar la reserva', 'danger');
    } finally {
      setUpdatingAppointment(false);
    }
  };

  // Función para manejar reservas inteligentes
  const handleSmartReservation = async () => {
    try {
      setReservingLocker(true);

      if (!packingResult || !packingResult.lockers.length) {
        await showAlert('Atención', 'No hay casilleros para reservar', 'warning');
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

        const shouldContinue = await showConfirm(
          'Optimización de Espacio',
          `⚠️ Tu selección actual usa ${overallUsage.toFixed(1)}% del espacio total.\n\n` +
          `Para una mejor optimización, considera agregar más productos para llenar completamente al menos un casillero.\n\n` +
          `¿Deseas continuar con la reserva de todas formas?`,
          'warning',
          'Continuar'
        );

        if (!shouldContinue) {
          return;
        }
      }

      setShowAppointmentScheduler(true);

    } catch (error: any) {
      await showAlert('Error', error.message || 'Error al procesar la reserva inteligente', 'danger');
    } finally {
      setReservingLocker(false);
    }
  };
  // Función para generar datos de packing combinados para todas las reservas activas
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _generateCombinedPackingForAllAppointments = () => {
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
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _generatePackingForAppointment = (appointment: Appointment) => {
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
              .filter(([_, selection]) => selection.lockerNumber === lockerNumber)
              .map(([itemIndex]) => {
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

        setSchedulingAppointment(false);
        await showAlert('¡Reservas creadas!', message, 'success');
      } else if (existingLockers.length > 0) {
        setSchedulingAppointment(false);
        await showAlert('¡Éxito!', '✅ Productos agregados exitosamente a tus reservas existentes', 'success');
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
      setSchedulingAppointment(false);
      await showAlert('Error', err.message || 'Error al agendar las reservas', 'danger');
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
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <h2 className="mb-0 fs-3 fw-bold">
              <i className="bi bi-box-seam me-2 text-primary"></i>
              Mis Productos Comprados
            </h2>
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-md-end">
              {validPurchasedProducts.length > 0 && selectedProducts.size === 0 && (
                <>
                  {(() => {
                    const hasExpired = hasExpiredAppointments(myAppointments);

                    if (hasExpired) {
                      return (
                        <div className="text-danger fw-bold small">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Primero actualiza tus reservas vencidas
                        </div>
                      );
                    }

                    return (
                      <button
                        className="btn btn-outline-primary btn-sm px-3"
                        onClick={selectAllAvailableProducts}
                        disabled={loading}
                      >
                        <i className="bi bi-check-all me-1"></i>
                        Seleccionar Todos
                      </button>
                    );
                  })()}
                </>
              )}
              {selectedProducts.size > 0 && (
                <>
                  <button
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={handleClearSelection}
                    disabled={claimingProducts || reservingLocker}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    Limpiar
                  </button>
                  <button
                    className="btn btn-success btn-sm px-3 shadow-sm"
                    onClick={handleSmartReservation}
                    disabled={claimingProducts || reservingLocker}
                  >
                    {reservingLocker ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Cargando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-calendar-check me-1"></i>
                        Reservar
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mb-5">
              <h4 className="mb-3 skeleton-shimmer" style={{ width: '200px', height: '24px', borderRadius: '4px' }}></h4>
              {[1, 2, 3].map(i => (
                <div key={i} className="product-card--skeleton">
                  <div className="skeleton-shimmer"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-box skeleton-img"></div>
                    <div className="skeleton-info">
                      <div className="skeleton-box skeleton-title"></div>
                      <div className="skeleton-box skeleton-text"></div>
                      <div className="skeleton-box skeleton-text" style={{ width: '60%' }}></div>
                      <div className="skeleton-badge-row">
                        <div className="skeleton-box skeleton-badge"></div>
                        <div className="skeleton-box skeleton-badge"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                  <div className="row mb-4">
                    {[1, 2].map(i => (
                      <div key={i} className="col-12 mb-3">
                        <div className="product-card--skeleton" style={{ minHeight: '100px' }}>
                          <div className="skeleton-shimmer"></div>
                          <div className="skeleton-content">
                            <div className="skeleton-info">
                              <div className="skeleton-box skeleton-title" style={{ width: '30%' }}></div>
                              <div className="skeleton-box skeleton-text" style={{ width: '70%' }}></div>
                              <div className="skeleton-box skeleton-text" style={{ width: '50%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                                              showAlert('Información', 'No se pudo encontrar la información del producto detallada para este catálogo.', 'info');
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
        penalizedDates={penalizedDates}
        updatingAppointment={updatingAppointment}
        onClose={() => {
          setShowEditAppointmentModal(false);
          setSelectedAppointmentForEdit(null);
          setEditAppointmentDate('');
          setEditAppointmentTime('');
        }}
        onUpdate={handleUpdateAppointment}
        onDateChange={setEditAppointmentDate}
        onTimeChange={setEditAppointmentTime}
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
                .filter(([_, selection]) => selection.lockerNumber === lockerNumber)
                .map(([itemIndex]) => {
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