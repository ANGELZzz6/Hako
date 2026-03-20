import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../../../services/orderService';
import appointmentService from '../../../services/appointmentService';
import userService from '../../../services/userService';
import gridPackingService from '../../../services/gridPackingService';
import type { PackingResult, Locker3D, PackedItem, Product3D } from '../../../services/gridPackingService';
import type { Order, OrderItem } from '../../../types/order';
import type { CreateAppointmentData } from '../../../services/appointmentService';
import type { Appointment } from '../../../services/appointmentService';
import { getDimensiones, getVolumen, calculateSlotsNeeded } from '../utils/productUtils';
import { createLocalDate } from '../utils/dateUtils';

export const useOrdersPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
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
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);
  const [showPackingOptimization, setShowPackingOptimization] = useState(false);
  const [recentlyUnlockedProducts, setRecentlyUnlockedProducts] = useState<Set<string>>(new Set());
  const [cancellingAppointment, setCancellingAppointment] = useState(false);
  const [reservingLocker, setReservingLocker] = useState(false);
  const [updatingAppointment, setUpdatingAppointment] = useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<Appointment | null>(null);
  const [editAppointmentDate, setEditAppointmentDate] = useState('');
  const [editAppointmentTime, setEditAppointmentTime] = useState('');
  const [editAppointmentLocker, setEditAppointmentLocker] = useState(1);
  const [penalizedDates, setPenalizedDates] = useState<string[]>([]);
  const [penaltyWarning, setPenaltyWarning] = useState<string>('');
  const [visualizationKey, setVisualizationKey] = useState(0);

  // Función para limpiar completamente todos los estados
  const forceCleanupStates = () => {
    console.log('🧹 Limpiando todos los estados...');
    setSelectedProducts(new Map());
    setLockerAssignments(new Map());
    setPackingResult(null);
    setRecentlyUnlockedProducts(new Set());
    setShowAppointmentScheduler(false);
    setShowPackingOptimization(false);
  };

  // Verificar autenticación
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Cargar productos comprados
  useEffect(() => {
    const fetchPurchasedProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Limpiar estados antes de cargar nuevos datos
        forceCleanupStates();
        
        // Obtener todos los productos comprados por el usuario
        const products = await orderService.getMyPurchasedProducts();
        console.log('Productos comprados:', products);
        console.log('🔍 Verificando orderId en productos:');
        products.forEach((product, index) => {
          console.log(`Producto ${index}:`, {
            _id: product._id,
            orderId: product.orderId,
            productName: product.product?.nombre
          });
        });
        setPurchasedProducts(products);
        
        // Seleccionar automáticamente todos los productos disponibles después de cargar
        setTimeout(() => {
          selectAllAvailableProducts();
        }, 100);
        
      } catch (err: any) {
        setError('Error al cargar tus productos comprados');
        console.error('Error fetching purchased products:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) fetchPurchasedProducts();
  }, [isAuthenticated]);

  // Obtener casilleros disponibles considerando reservas existentes
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
  }, [isAuthenticated, myAppointments]); // Recargar cuando cambien las reservas

  // Función para cargar reservas activas
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

  // Cargar reservas activas
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyAppointments();
    }
  }, [isAuthenticated]);

  // Cargar penalizaciones del usuario (con validación de expiración)
  useEffect(() => {
    const fetchPenalties = async () => {
      try {
        const user = await userService.getMyProfile();
        if (user.reservationPenalties) {
          const now = new Date();
          const activePenalties: string[] = [];
          const expiredPenalties: string[] = [];
          
          user.reservationPenalties.forEach((penalty: any) => {
            // CORRECCIÓN: Usar la fecha de la reserva vencida, no la fecha de creación de la penalización
            const penaltyDate = penalty.expiredAppointmentDate || penalty.date || penalty.appointmentDate;
            const penaltyTime = new Date(penalty.createdAt);
            const hoursSincePenalty = (now.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursSincePenalty < 24) {
              activePenalties.push(penaltyDate);
              console.log(`🔍 Penalización activa para ${penaltyDate} (${hoursSincePenalty.toFixed(2)}h transcurridas)`);
              console.log(`📋 Contexto: Reserva vencida del ${penaltyDate}, penalización creada el ${penalty.createdAt}`);
            } else {
              expiredPenalties.push(penaltyDate);
              console.log(`✅ Penalización expirada para ${penaltyDate} (${hoursSincePenalty.toFixed(2)}h transcurridas)`);
            }
          });
          
          setPenalizedDates(activePenalties);
          
          // Mostrar advertencia si hay penalizaciones activas
          if (activePenalties.length > 0) {
            setPenaltyWarning(`Tienes ${activePenalties.length} penalización(es) activa(s). Las penalizaciones expiran en 24 horas.`);
          } else if (expiredPenalties.length > 0) {
            setPenaltyWarning(`Tienes ${expiredPenalties.length} penalización(es) expirada(s) que ya no te afectan.`);
          } else {
            setPenaltyWarning('');
          }
        }
      } catch (err) {
        console.error('Error obteniendo penalizaciones:', err);
      }
    };
    if (isAuthenticated) fetchPenalties();
  }, [isAuthenticated]);

  // Función para seleccionar todos los productos disponibles
  const selectAllAvailableProducts = () => {
    const newSelectedProducts = new Map<number, { quantity: number; lockerNumber: number }>();
    
    // Obtener IDs de productos que ya están en reservas existentes
    const productosEnReservas = new Set<string>();
    myAppointments.forEach(appointment => {
      if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
        appointment.itemsToPickup.forEach((item: any) => {
          productosEnReservas.add(item.product._id);
        });
      }
    });
    
    console.log('📋 Productos ya en reservas:', Array.from(productosEnReservas));
    
    // Obtener productos disponibles para selección
    const availableProducts: Product3D[] = [];
    const productIndexMap = new Map<number, number>(); // Mapeo de índice de producto a índice en availableProducts
    
    purchasedProducts.forEach((item, index) => {
      const yaEstaReservado = productosEnReservas.has(item._id || '');
      
      if (!item.isClaimed && !item.assigned_locker && !yaEstaReservado) {
        const dimensiones = getDimensiones(item);
        const product3D: Product3D = {
          id: item._id || item.product?._id || `item_${index}`,
          name: item.product?.nombre || `Producto ${index + 1}`,
          dimensions: {
            length: dimensiones?.largo || 15,
            width: dimensiones?.ancho || 15,
            height: dimensiones?.alto || 15,
          },
          quantity: 1,
          volume: getVolumen(item),
        };
        
        availableProducts.push(product3D);
        productIndexMap.set(index, availableProducts.length - 1);
      }
    });

    console.log('🔄 Productos disponibles para selección:', availableProducts.length);

    // Seleccionar automáticamente todos los productos disponibles
    availableProducts.forEach((product, idx) => {
      const originalIndex = Array.from(productIndexMap.entries()).find(([_, availableIdx]) => availableIdx === idx)?.[0];
      if (originalIndex !== undefined) {
        // Asignar un casillero temporal (será optimizado en updateLockerAssignments)
        const defaultLocker = availableLockers.length > 0 ? availableLockers[0] : 1;
        newSelectedProducts.set(originalIndex, {
          quantity: 1,
          lockerNumber: defaultLocker
        });
      }
    });
    
    console.log('🔄 Seleccionando automáticamente productos disponibles:', newSelectedProducts.size);
    setSelectedProducts(newSelectedProducts);
    
    // Llamar a updateLockerAssignments para optimizar con casilleros existentes
    updateLockerAssignments(newSelectedProducts);
  };

  // Función para actualizar asignaciones de lockers con optimización inteligente
  const updateLockerAssignments = (newSelectedProducts: Map<number, { quantity: number; lockerNumber: number }>) => {
    console.log('🔄 Actualizando asignaciones de lockers con optimización inteligente...');
    console.log('Productos seleccionados:', newSelectedProducts);
    console.log('Reservas existentes:', myAppointments);
    
    if (newSelectedProducts.size === 0) {
      console.log('❌ No hay productos seleccionados');
      setPackingResult(null);
      setLockerAssignments(new Map());
      return;
    }

    // Convertir productos seleccionados al formato del algoritmo
    const selectedItems: Product3D[] = Array.from(newSelectedProducts.entries()).map(([itemIndex, selection]) => {
      const item = purchasedProducts[itemIndex];
      
      // Usar directamente las dimensiones calculadas del backend si están disponibles
      let dimensiones = item.dimensiones;
      let volume = item.product?.volumen;
      
      // Si no hay dimensiones del backend, usar el fallback
      if (!dimensiones) {
        dimensiones = getDimensiones(item);
      }
      
      // Si no hay volumen del backend, calcularlo
      if (!volume) {
        volume = getVolumen(item);
      }
      
      return {
        id: item._id || item.product?._id || `item_${itemIndex}`,
        name: item.product?.nombre || `Producto ${itemIndex + 1}`,
        dimensions: {
          length: dimensiones?.largo || 15,
          width: dimensiones?.ancho || 15,
          height: dimensiones?.alto || 15,
        },
        quantity: selection.quantity,
        volume: volume || (dimensiones?.largo || 15) * (dimensiones?.ancho || 15) * (dimensiones?.alto || 15),
      };
    });

    console.log('📋 Items a optimizar:', selectedItems);

    // Analizar reservas existentes para optimizar el uso de casilleros
    const existingLockers = new Map<number, { usedVolume: number; items: Product3D[]; usedSlots: number }>();
    
    // Agrupar productos de reservas existentes por casillero
    myAppointments.forEach(appointment => {
      if (
        appointment.status !== 'cancelled' &&
        appointment.status !== 'completed' &&
        canAddProductsToAppointment(appointment) &&
        appointment.itemsToPickup
      ) {
        appointment.itemsToPickup.forEach((item: any) => {
          const lockerNumber = item.lockerNumber;
          const currentLocker = existingLockers.get(lockerNumber) || { usedVolume: 0, items: [], usedSlots: 0 };
          
          // Agregar productos existentes al casillero con dimensiones reales
          // Usar las dimensiones calculadas del backend si están disponibles
          let itemDimensiones = item.dimensiones;
          let itemVolume = item.volumen;
          
          // Si no hay dimensiones del backend, usar las del producto
          if (!itemDimensiones) {
            itemDimensiones = (item.product as any).dimensiones;
          }
          
          // Si no hay volumen del backend, calcularlo
          if (!itemVolume) {
            itemVolume = (itemDimensiones?.largo || 15) * (itemDimensiones?.ancho || 15) * (itemDimensiones?.alto || 15);
          }
          
          const existingItem: Product3D = {
            id: item.product._id || `existing_${lockerNumber}_${item.product.nombre}`,
            name: item.product.nombre || 'Producto existente',
            dimensions: {
              length: itemDimensiones?.largo || 15,
              width: itemDimensiones?.ancho || 15,
              height: itemDimensiones?.alto || 15,
            },
            quantity: item.quantity,
            volume: itemVolume,
          };
          currentLocker.items.push(existingItem);
          currentLocker.usedVolume += existingItem.volume * item.quantity;
          
          // Calcular slots usados por productos existentes
          const itemSlots = calculateSlotsNeeded({
            largo: existingItem.dimensions.length,
            ancho: existingItem.dimensions.width,
            alto: existingItem.dimensions.height
          });
          currentLocker.usedSlots += itemSlots;
          
          existingLockers.set(lockerNumber, currentLocker);
        });
      }
    });

    console.log('🏪 Casilleros existentes:', existingLockers);

    // Intentar agregar productos nuevos a casilleros existentes
    const optimizedItems = [...selectedItems];
    const newLockerAssignments = new Map();
    const updatedSelectedProducts = new Map(newSelectedProducts);
    const combinedLockers: Locker3D[] = [];

    // Primero intentar agregar a casilleros existentes
    existingLockers.forEach((existingLocker, lockerNumber) => {
      const LOCKER_MAX_VOLUME = 125000; // 50x50x50 cm
      const LOCKER_MAX_SLOTS = 27; // 3x3x3 slots
      const availableVolume = LOCKER_MAX_VOLUME - existingLocker.usedVolume;
      const availableSlots = LOCKER_MAX_SLOTS - existingLocker.usedSlots;
      
      console.log(`🔍 Analizando casillero ${lockerNumber}:`);
      console.log(`   Espacio disponible: ${availableVolume.toLocaleString()} cm³`);
      console.log(`   Slots disponibles: ${availableSlots}/27`);
      
      if (availableVolume > 0 && availableSlots > 0) {
        // Ordenar productos por volumen (más grandes primero) para optimizar mejor
        const sortedItems = [...optimizedItems].sort((a, b) => b.volume - a.volume);
        
        // Buscar productos que quepan en este casillero (por volumen Y slots)
        const itemsThatFit: Product3D[] = [];
        let remainingVolume = availableVolume;
        let remainingSlots = availableSlots;
        
        for (const item of sortedItems) {
          const itemSlots = calculateSlotsNeeded({
            largo: item.dimensions.length,
            ancho: item.dimensions.width,
            alto: item.dimensions.height
          });
          
          if (item.volume <= remainingVolume && itemSlots <= remainingSlots) {
            itemsThatFit.push(item);
            remainingVolume -= item.volume;
            remainingSlots -= itemSlots;
          }
        }

        console.log(`   Productos que caben en casillero ${lockerNumber}: ${itemsThatFit.length}`);

        if (itemsThatFit.length > 0) {
          // Agregar productos que quepan al casillero existente
          itemsThatFit.forEach(bestFit => {
            const itemSlots = calculateSlotsNeeded({
              largo: bestFit.dimensions.length,
              ancho: bestFit.dimensions.width,
              alto: bestFit.dimensions.height
            });
            
            console.log(`   ✅ Agregando "${bestFit.name}" (${bestFit.volume.toLocaleString()} cm³, ${itemSlots} slots) al casillero ${lockerNumber}`);

            // Agregar a casillero existente
            const currentAssignment = newLockerAssignments.get(lockerNumber) || {
              totalVolume: existingLocker.usedVolume,
              items: existingLocker.items.map(item => ({
                itemIndex: -1, // Productos existentes
                quantity: 1,
                volume: item.volume,
                productName: item.name,
              }))
            };

            currentAssignment.items.push({
              itemIndex: selectedItems.findIndex(item => item.id === bestFit.id),
              quantity: bestFit.quantity,
              volume: bestFit.volume,
              productName: bestFit.name,
            });
            currentAssignment.totalVolume += bestFit.volume;

            newLockerAssignments.set(lockerNumber, currentAssignment);

            // Actualizar selectedProducts
            const itemIndex = selectedItems.findIndex(item => item.id === bestFit.id);
            if (itemIndex >= 0) {
              updatedSelectedProducts.set(itemIndex, {
                quantity: bestFit.quantity,
                lockerNumber: lockerNumber,
              });
            }
          });

          // Remover productos agregados de la lista de productos a procesar
          itemsThatFit.forEach(bestFit => {
            const itemIndexToRemove = optimizedItems.findIndex(item => item.id === bestFit.id);
            if (itemIndexToRemove >= 0) {
              optimizedItems.splice(itemIndexToRemove, 1);
            }
          });
        }
      } else {
        console.log(`   ❌ Casillero ${lockerNumber} está lleno (volumen: ${availableVolume <= 0 ? 'SÍ' : 'NO'}, slots: ${availableSlots <= 0 ? 'SÍ' : 'NO'})`);
      }
    });

    // Crear visualización combinada para casilleros existentes con productos agregados
    existingLockers.forEach((existingLocker, lockerNumber) => {
      const assignment = newLockerAssignments.get(lockerNumber);
      if (assignment) {
        // Combinar productos existentes con nuevos para la visualización
        const allProductsForLocker: Product3D[] = [
          ...existingLocker.items, // Productos existentes
          ...assignment.items
            .filter((item: any) => item.itemIndex >= 0) // Solo productos nuevos
            .map((item: any) => selectedItems[item.itemIndex])
        ];

        console.log(`🎨 Generando visualización combinada para casillero ${lockerNumber}:`, allProductsForLocker);

        // Usar grid packing para generar la visualización real
        const lockerPackingResult = gridPackingService.packProducts3D(allProductsForLocker);
        
        if (lockerPackingResult.lockers.length > 0) {
          const combinedLocker = {
            ...lockerPackingResult.lockers[0],
            id: `locker_${lockerNumber}`,
          };
          combinedLockers.push(combinedLocker);
        }
      } else {
        // Solo productos existentes, sin productos nuevos
        const existingPackingResult = gridPackingService.packProducts3D(existingLocker.items);
        if (existingPackingResult.lockers.length > 0) {
          const existingLockerVisualization = {
            ...existingPackingResult.lockers[0],
            id: `locker_${lockerNumber}`,
          };
          combinedLockers.push(existingLockerVisualization);
        }
      }
    });

    // Para los productos restantes, usar Grid Packing para crear nuevos casilleros
    if (optimizedItems.length > 0) {
      console.log('📦 Productos restantes para nuevos casilleros:', optimizedItems);
      const result = gridPackingService.packProducts3D(optimizedItems);
      console.log('📊 Resultado Grid Packing para productos restantes:', result);

      // Obtener todos los lockerNumbers ocupados por cualquier reserva activa
      const allOccupiedLockerNumbers = new Set<number>();
      myAppointments.forEach(appointment => {
        if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
          appointment.itemsToPickup.forEach((item: any) => {
            allOccupiedLockerNumbers.add(item.lockerNumber);
          });
        }
      });

      let nextLockerNumber = 1;
      result.lockers.forEach((locker, lockerIndex) => {
        // Buscar el primer número de casillero disponible
        while (allOccupiedLockerNumbers.has(nextLockerNumber)) {
          nextLockerNumber++;
        }
        const newLockerNumber = nextLockerNumber;
        allOccupiedLockerNumbers.add(newLockerNumber);

        const items = locker.packedProducts.map((packedItem, itemIndex) => {
          const originalItemIndex = selectedItems.findIndex(item => item.id === packedItem.product.id);
          return {
            itemIndex: originalItemIndex >= 0 ? originalItemIndex : itemIndex,
            quantity: packedItem.product.quantity,
            volume: packedItem.volume,
            productName: packedItem.product.name,
          };
        });

        newLockerAssignments.set(newLockerNumber, {
          totalVolume: items.reduce((sum, i) => sum + i.volume, 0),
          items,
        });

        // Actualizar selectedProducts
        locker.packedProducts.forEach((packedItem) => {
          const originalItemIndex = selectedItems.findIndex(item => item.id === packedItem.product.id);
          if (originalItemIndex >= 0) {
            updatedSelectedProducts.set(originalItemIndex, {
              quantity: packedItem.product.quantity,
              lockerNumber: newLockerNumber,
            });
          }
        });

        // Agregar a la lista de casilleros combinados
        combinedLockers.push({
          ...locker,
          id: `locker_${newLockerNumber}`,
        });
      });
    }

    // Crear el resultado final combinado
    const combinedResult: PackingResult = {
      lockers: combinedLockers,
      failedProducts: [],
      rejectedProducts: [],
      totalEfficiency: combinedLockers.length > 0 ? combinedLockers.reduce((sum, locker) => sum + (locker.usedSlots / 27), 0) / combinedLockers.length * 100 : 0,
      totalUnusedSlots: combinedLockers.reduce((sum, locker) => sum + (27 - locker.usedSlots), 0),
      packingScore: combinedLockers.length > 0 ? 100 - (combinedLockers.reduce((sum, locker) => sum + (27 - locker.usedSlots), 0) / (combinedLockers.length * 27)) * 100 : 0,
      totalLockers: combinedLockers.length,
    };

    console.log('🎯 Resultado final combinado:', combinedResult);
    setPackingResult(combinedResult);
    setLockerAssignments(newLockerAssignments);
    setSelectedProducts(updatedSelectedProducts);
  };

  // Función auxiliar para verificar si se pueden agregar productos a una reserva
  const canAddProductsToAppointment = (appointment: Appointment) => {
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const now = new Date();
    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    return hoursDifference >= 1;
  };

  // Función para forzar la actualización de la visualización
  const forceVisualizationUpdate = () => {
    setVisualizationKey(prev => prev + 1);
  };

  return {
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
    forceVisualizationUpdate,
    fetchMyAppointments,
    selectAllAvailableProducts,
    updateLockerAssignments,
    canAddProductsToAppointment,
  };
}; 