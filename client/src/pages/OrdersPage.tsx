import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import appointmentService from '../services/appointmentService';
import AppointmentScheduler from '../components/AppointmentScheduler';
import Locker3DVisualization from '../components/Locker3DVisualization';
import PackingOptimizationTips from '../components/PackingOptimizationTips';
import gridPackingService from '../services/gridPackingService';
import type { PackingResult, Locker3D, PackedItem, Product3D } from '../services/gridPackingService';
import type { Order, OrderItem } from '../types/order';
import type { CreateAppointmentData } from '../services/appointmentService';
import Locker3DCanvas from '../components/Locker3DCanvas';
import type { Appointment } from '../services/appointmentService';

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
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);
  const [showPackingOptimization, setShowPackingOptimization] = useState(false);
  const [recentlyUnlockedProducts, setRecentlyUnlockedProducts] = useState<Set<string>>(new Set());
  const [cancellingAppointment, setCancellingAppointment] = useState(false);
  const [reservingLocker, setReservingLocker] = useState(false);

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

  // Función para actualizar una reserva existente con nuevos productos
  const updateExistingAppointment = async (appointmentId: string, newProducts: Array<{ productId: string; quantity: number; lockerNumber: number }>) => {
    try {
      console.log('🔄 Actualizando reserva existente:', appointmentId);
      console.log('📦 Nuevos productos a agregar:', newProducts);
      
      // Usar el nuevo servicio para agregar productos a la reserva existente
      const result = await appointmentService.addProductsToAppointment(appointmentId, newProducts);
      
      console.log('✅ Productos agregados exitosamente:', result);
      
      // Recargar las reservas para mostrar los cambios
      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);
      
      return result;
    } catch (error) {
      console.error('❌ Error al actualizar reserva:', error);
      throw error;
    }
  };

  // Función para detectar si se pueden agregar productos a reservas existentes
  const findAppointmentForNewProducts = (newProducts: Product3D[]) => {
    if (myAppointments.length === 0) return null;

    // Buscar la reserva que tenga más espacio disponible
    let bestAppointment: {
      appointment: Appointment;
      productsThatFit: number;
      totalNewVolume: number;
      totalNewSlots: number;
      efficiencyScore: number;
    } | null = null;
    let bestScore = -1;

    myAppointments.forEach(appointment => {
      if (appointment.status === 'cancelled' || appointment.status === 'completed') return;

      const currentItems = appointment.itemsToPickup || [];
      const currentVolume = currentItems.reduce((total, item) => {
        const product = purchasedProducts.find(p => p._id === item.product._id);
        return total + (product ? getVolumen(product) : 0);
      }, 0);

      const availableVolume = 125000 - currentVolume; // 50x50x50 cm
      const currentSlots = currentItems.reduce((total, item) => {
        const product = purchasedProducts.find(p => p._id === item.product._id);
        if (product) {
          const dimensiones = getDimensiones(product);
          return total + (dimensiones ? calculateSlotsNeeded(dimensiones) : 1);
        }
        return total + 1;
      }, 0);

      const availableSlots = 27 - currentSlots;

      // Calcular cuántos productos nuevos caben
      let productsThatFit = 0;
      let totalNewVolume = 0;
      let totalNewSlots = 0;

      newProducts.forEach(product => {
        const productVolume = product.volume;
        const productSlots = calculateSlotsNeeded({
          largo: product.dimensions.length,
          ancho: product.dimensions.width,
          alto: product.dimensions.height
        });

        if (totalNewVolume + productVolume <= availableVolume && totalNewSlots + productSlots <= availableSlots) {
          productsThatFit++;
          totalNewVolume += productVolume;
          totalNewSlots += productSlots;
        }
      });

      // Calcular score basado en eficiencia de uso
      const efficiencyScore = (currentVolume + totalNewVolume) / 125000;
      const slotEfficiencyScore = (currentSlots + totalNewSlots) / 27;
      const overallScore = (efficiencyScore + slotEfficiencyScore) / 2;

      if (productsThatFit > 0 && overallScore > bestScore) {
        bestScore = overallScore;
        bestAppointment = {
          appointment,
          productsThatFit,
          totalNewVolume,
          totalNewSlots,
          efficiencyScore: overallScore
        };
      }
    });

    return bestAppointment;
  };

  // Modificar la función de selección para detectar reservas existentes
  const selectAllAvailableProducts = () => {
    const newSelectedProducts = new Map<number, { quantity: number; lockerNumber: number }>();
    
    // Obtener IDs de productos que ya están en reservas existentes
    const productosEnReservas = new Set<string>();
    myAppointments.forEach(appointment => {
      if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
        appointment.itemsToPickup.forEach(item => {
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

  // Función para calcular slots necesarios basado en dimensiones
  const calculateSlotsNeeded = (dimensions: { largo: number; ancho: number; alto: number }) => {
    const SLOT_SIZE = 15; // cm - debe coincidir con gridPackingService
    const slotsX = Math.max(1, Math.ceil(dimensions.largo / SLOT_SIZE));
    const slotsY = Math.max(1, Math.ceil(dimensions.ancho / SLOT_SIZE));
    const slotsZ = Math.max(1, Math.ceil(dimensions.alto / SLOT_SIZE));
    return slotsX * slotsY * slotsZ;
  };

  // Manejar selección de productos individuales (mantenido para compatibilidad)
  const handleQuantityChange = (itemIndex: number, quantity: number) => {
    
    const item = purchasedProducts[itemIndex];
    
    // Solo permitir seleccionar productos no reclamados y no reservados
    if (item.isClaimed || item.assigned_locker) {
      return;
    }
    
    // Para productos individuales, solo permitir 0 o 1
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
      quantity: 1, // Siempre 1 para productos individuales
      lockerNumber: currentSelection?.lockerNumber || defaultLocker
    });
    
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

  // Actualizar asignaciones de lockers con optimización inteligente
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
      const dimensiones = getDimensiones(item);
      return {
        id: item._id || item.product?._id || `item_${itemIndex}`,
        name: item.product?.nombre || `Producto ${itemIndex + 1}`,
        dimensions: {
          length: dimensiones?.largo || 15,
          width: dimensiones?.ancho || 15,
          height: dimensiones?.alto || 15,
        },
        quantity: selection.quantity,
        volume: getVolumen(item),
      };
    });

    console.log('📋 Items a optimizar:', selectedItems);

    // Analizar reservas existentes para optimizar el uso de casilleros
    const existingLockers = new Map<number, { usedVolume: number; items: Product3D[]; usedSlots: number }>();
    
    // Agrupar productos de reservas existentes por casillero
    myAppointments.forEach(appointment => {
      if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
        appointment.itemsToPickup.forEach(item => {
          const lockerNumber = item.lockerNumber;
          const currentLocker = existingLockers.get(lockerNumber) || { usedVolume: 0, items: [], usedSlots: 0 };
          
          // Agregar productos existentes al casillero con dimensiones reales
          const existingItem: Product3D = {
            id: item.product._id || `existing_${lockerNumber}_${item.product.nombre}`,
            name: item.product.nombre || 'Producto existente',
            dimensions: {
              length: (item.product as any).dimensiones?.largo || 15,
              width: (item.product as any).dimensiones?.ancho || 15,
              height: (item.product as any).dimensiones?.alto || 15,
            },
            quantity: item.quantity,
            volume: ((item.product as any).dimensiones?.largo || 15) * ((item.product as any).dimensiones?.ancho || 15) * ((item.product as any).dimensiones?.alto || 15),
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

      // Calcular el siguiente número de casillero disponible
      const existingLockerNumbers = Array.from(existingLockers.keys());
      const maxExistingLocker = existingLockerNumbers.length > 0 ? Math.max(...existingLockerNumbers) : 0;
      
      result.lockers.forEach((locker, lockerIndex) => {
        const newLockerNumber = maxExistingLocker + lockerIndex + 1;
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

  // Verificar si hay errores de validación
  const getValidationErrors = () => {
    const errors: string[] = [];

    // Si tenemos un resultado del Bin Packing, confiar en él
    if (packingResult && packingResult.lockers.length > 0) {
      console.log('✅ Usando validación del Bin Packing - todos los productos caben correctamente');
      
      // No hay errores si el Bin Packing fue exitoso
      return errors;
    }

    // Solo validar manualmente si no hay resultado del Bin Packing
    selectedProducts.forEach((selection, itemIndex) => {
      const item = purchasedProducts[itemIndex];
      if (item.isClaimed || item.assigned_locker) return;
      if (!tieneDimensiones(item)) {
        errors.push(`El producto ${item.product?.nombre} no tiene dimensiones configuradas`);
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

  // Mostrar información de optimización
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

  // Cancelar reserva
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      return;
    }

    try {
      setCancellingAppointment(true);
      console.log('🔄 Cancelando reserva:', appointmentId);
      
      // Obtener información de la reserva antes de cancelarla
      const appointmentToCancel = myAppointments.find(app => app._id === appointmentId);
      const productsInReservation = appointmentToCancel?.itemsToPickup || [];
      
      console.log('📦 Productos en la reserva a cancelar:', productsInReservation);
      
      // Cancelar la reserva
      await appointmentService.cancelAppointment(appointmentId);
      
      // LIMPIAR TODOS LOS ESTADOS PRIMERO
      setSelectedProducts(new Map());
      setLockerAssignments(new Map());
      setPackingResult(null);
      setRecentlyUnlockedProducts(new Set());
      setShowAppointmentScheduler(false);
      
      // Recargar las reservas
      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);
      
      // Recargar los productos comprados para desbloquear los que estaban en la reserva
      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);
      
      // Mostrar mensaje informativo
      const message = productsInReservation.length > 0 
        ? `✅ Reserva cancelada exitosamente\n\n📦 ${productsInReservation.length} producto${productsInReservation.length > 1 ? 's' : ''} han sido desbloqueado${productsInReservation.length > 1 ? 's' : ''} y están disponibles para nueva reserva.`
        : '✅ Reserva cancelada exitosamente';
      
      alert(message);
      
      // Verificar si hay productos disponibles para nueva selección (solo después de que todo esté limpio)
      if (productsInReservation.length > 0) {
        // Usar setTimeout para que el alert anterior se cierre primero y los estados se actualicen
        setTimeout(() => {
          checkAvailableProductsAfterCancellation(productsInReservation);
        }, 500);
      }
      
      console.log('✅ Reserva cancelada y productos desbloqueados');
      
      // Debug del estado después de cancelar
      setTimeout(() => {
        debugState();
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Error al cancelar reserva:', err);
      alert(err.message || 'Error al cancelar la reserva');
    } finally {
      setCancellingAppointment(false);
    }
  };

  // Función para verificar productos disponibles después de cancelar una reserva
  const checkAvailableProductsAfterCancellation = (cancelledProducts: any[]) => {
    console.log('🔍 Verificando productos disponibles después de cancelación...');
    
    // Obtener IDs de productos que estaban en la reserva cancelada
    const cancelledProductIds = new Set(cancelledProducts.map(item => item.product._id));
    
    // Verificar cuántos de estos productos están ahora disponibles
    const nowAvailableProducts = purchasedProducts.filter(item => 
      cancelledProductIds.has(item._id || '') && 
      !item.isClaimed && 
      !item.assigned_locker
    );
    
    console.log('🔍 Productos ahora disponibles después de cancelación:', nowAvailableProducts.length);
    console.log('📦 Productos disponibles:', nowAvailableProducts.map(p => p.product?.nombre));
    
    // Marcar productos como recién desbloqueados
    const unlockedProductIds = new Set(nowAvailableProducts.map(item => item._id || ''));
    setRecentlyUnlockedProducts(unlockedProductIds);
    
    // Limpiar el estado después de 10 segundos
    setTimeout(() => {
      setRecentlyUnlockedProducts(new Set());
    }, 10000);
    
    if (nowAvailableProducts.length > 0) {
      // Mostrar opción de seleccionar automáticamente
      const shouldSelect = confirm(
        `🎯 Productos desbloqueados detectados!\n\n` +
        `${nowAvailableProducts.length} producto${nowAvailableProducts.length > 1 ? 's' : ''} de la reserva cancelada ${nowAvailableProducts.length > 1 ? 'están' : 'está'} ahora disponible${nowAvailableProducts.length > 1 ? 's' : ''}.\n\n` +
        `¿Deseas seleccionarlos automáticamente para crear una nueva reserva?`
      );
      
      if (shouldSelect) {
        console.log('✅ Usuario aceptó selección automática');
        
        // Seleccionar automáticamente los productos desbloqueados
        const newSelectedProducts = new Map<number, { quantity: number; lockerNumber: number }>();
        
        nowAvailableProducts.forEach((item, index) => {
          const productIndex = purchasedProducts.findIndex(p => p._id === item._id);
          if (productIndex >= 0) {
            const defaultLocker = availableLockers.length > 0 ? availableLockers[0] : 1;
            newSelectedProducts.set(productIndex, {
              quantity: 1,
              lockerNumber: defaultLocker
            });
            console.log(`✅ Seleccionando producto: ${item.product?.nombre} en casillero ${defaultLocker}`);
          }
        });
        
        console.log('🔄 Aplicando selección automática...');
        setSelectedProducts(newSelectedProducts);
        
        // Usar setTimeout para asegurar que el estado se actualice antes de llamar a updateLockerAssignments
        setTimeout(() => {
          updateLockerAssignments(newSelectedProducts);
          
          // Hacer scroll hacia arriba para mostrar la selección
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          alert(`✅ ${nowAvailableProducts.length} producto${nowAvailableProducts.length > 1 ? 's' : ''} seleccionado${nowAvailableProducts.length > 1 ? 's' : ''} automáticamente. Puedes proceder a crear una nueva reserva.`);
        }, 100);
      } else {
        console.log('❌ Usuario rechazó selección automática');
      }
    } else {
      console.log('❌ No se encontraron productos disponibles para selección automática');
    }
  };

  // Función de debug para verificar el estado completo
  const debugState = () => {
    console.log('🔍 === DEBUG ESTADO COMPLETO ===');
    console.log('📦 Productos comprados:', purchasedProducts.length);
    console.log('📅 Reservas activas:', myAppointments.length);
    console.log('✅ Productos seleccionados:', selectedProducts.size);
    console.log('🎯 Packing result:', packingResult ? 'SÍ' : 'NO');
    console.log('🔓 Productos recién desbloqueados:', recentlyUnlockedProducts.size);
    
    // Verificar productos en reservas
    const productosEnReservas = new Set<string>();
    myAppointments.forEach(appointment => {
      if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
        appointment.itemsToPickup.forEach(reservedItem => {
          productosEnReservas.add(reservedItem.product._id);
        });
      }
    });
    
    console.log('📋 Productos en reservas activas:', Array.from(productosEnReservas));
    
    // Verificar productos disponibles
    const productosDisponibles = purchasedProducts.filter(item => 
      !item.isClaimed && 
      !item.assigned_locker && 
      !productosEnReservas.has(item._id || '')
    );
    
    console.log('✅ Productos disponibles:', productosDisponibles.map(p => p.product?.nombre));
    console.log('🔍 === FIN DEBUG ===');
  };

  // Manejar agendamiento de cita
  // Función para manejar reservas inteligentes (solo mostrar modal de agendamiento)
  const handleSmartReservation = async () => {
    try {
      setReservingLocker(true);
      console.log('🧠 Iniciando reserva inteligente...');
      
      if (!packingResult || !packingResult.lockers.length) {
        alert('No hay casilleros para reservar');
        return;
      }

      // Verificar optimización de espacio
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

      // Separar casilleros existentes vs nuevos
      const existingLockers: number[] = [];
      const newLockers: number[] = [];
      
      packingResult.lockers.forEach(locker => {
        const lockerNumber = parseInt(locker.id.replace('locker_', ''));
        const isExisting = myAppointments.some(appointment => 
          appointment.status !== 'cancelled' && 
          appointment.status !== 'completed' &&
          appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
        );
        
        if (isExisting) {
          existingLockers.push(lockerNumber);
        } else {
          newLockers.push(lockerNumber);
        }
      });

      console.log('📊 Casilleros existentes:', existingLockers);
      console.log('🆕 Casilleros nuevos:', newLockers);

      // Mostrar modal de agendamiento para todos los casilleros
      console.log('🆕 Mostrando modal de agendamiento');
      setShowAppointmentScheduler(true);

    } catch (error: any) {
      console.error('❌ Error en reserva inteligente:', error);
      alert(error.message || 'Error al procesar la reserva inteligente');
    } finally {
      setReservingLocker(false);
    }
  };

  const handleScheduleAppointment = async (appointmentsData: CreateAppointmentData[]) => {
    try {
      console.log('🚀 Iniciando proceso de agendamiento...');
      setSchedulingAppointment(true);
      
      // Separar casilleros existentes vs nuevos
      const existingLockers: number[] = [];
      const newLockers: number[] = [];
      
      if (packingResult) {
        packingResult.lockers.forEach(locker => {
          const lockerNumber = parseInt(locker.id.replace('locker_', ''));
          const isExisting = myAppointments.some(appointment => 
            appointment.status !== 'cancelled' && 
            appointment.status !== 'completed' &&
            appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
          );
          
          if (isExisting) {
            existingLockers.push(lockerNumber);
          } else {
            newLockers.push(lockerNumber);
          }
        });
      }

      console.log('📊 Casilleros existentes:', existingLockers);
      console.log('🆕 Casilleros nuevos:', newLockers);

      // Procesar productos para casilleros existentes
      if (existingLockers.length > 0) {
        console.log('🔄 Agregando productos a casilleros existentes...');
        
        for (const lockerNumber of existingLockers) {
          // Encontrar la reserva existente para este casillero
          const existingAppointment = myAppointments.find(appointment => 
            appointment.status !== 'cancelled' && 
            appointment.status !== 'completed' &&
            appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
          );

          if (existingAppointment) {
            // Obtener productos seleccionados para este casillero
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
              .filter(product => product.productId); // Solo productos con ID válido

            if (productsForThisLocker.length > 0) {
              console.log(`📦 Agregando ${productsForThisLocker.length} productos a reserva existente ${existingAppointment._id}`);
              
              // Agregar productos a la reserva existente
              await updateExistingAppointment(existingAppointment._id, productsForThisLocker);
            }
          }
        }
      }

      // Crear múltiples reservas para casilleros nuevos
      if (newLockers.length > 0) {
        console.log('🚀 Enviando datos de múltiples reservas al backend:', appointmentsData);
        
        // Crear múltiples reservas
        const result = await appointmentService.createMultipleAppointments(appointmentsData);
        
        // Mensaje personalizado
        let message = `¡Reservas creadas exitosamente!\n\n`;
        
        if (existingLockers.length > 0) {
          message += `✅ Productos agregados a ${existingLockers.length} reserva(s) existente(s)\n`;
        }
        
        if (result.appointments.length > 0) {
          message += `📅 Se crearon ${result.appointments.length} nueva(s) reserva(s):\n\n`;
          
          result.appointments.forEach(appointment => {
            message += `📅 Casillero ${appointment.lockerNumber}: ${new Date(appointment.scheduledDate).toLocaleDateString('es-CO')} a las ${appointment.timeSlot}\n`;
          });
        }
        
        alert(message);
      } else if (existingLockers.length > 0) {
        // Solo casilleros existentes
        alert('✅ Productos agregados exitosamente a tus reservas existentes');
      }
      
      // Recargar los datos
      const products = await orderService.getMyPurchasedProducts();
      setPurchasedProducts(products);
      setSelectedProducts(new Map());
      setLockerAssignments(new Map());
      setPackingResult(null);
      setShowAppointmentScheduler(false);
      
      // Recargar las reservas
      const appointments = await appointmentService.getMyAppointments();
      setMyAppointments(appointments);
      
    } catch (err: any) {
      alert(err.message || 'Error al agendar las reservas');
    } finally {
      setSchedulingAppointment(false);
    }
  };

  // Función para generar datos de packing combinados para todas las reservas activas
  const generateCombinedPackingForAllAppointments = () => {
    try {
      console.log('🔍 Generando packing combinado para todas las reservas activas');
      
      // Obtener todas las reservas activas
      const activeAppointments = myAppointments.filter(
        appointment => appointment.status !== 'cancelled' && appointment.status !== 'completed'
      );
      
      console.log(`📅 Reservas activas encontradas: ${activeAppointments.length}`);
      
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
        console.log(`📋 Procesando reserva ${appointment._id.slice(-6)}`);
        
        appointment.itemsToPickup?.forEach((item: any) => {
          const lockerNumber = item.lockerNumber;
          
          if (!lockerProducts.has(lockerNumber)) {
            lockerProducts.set(lockerNumber, []);
          }
          
          // Usar las dimensiones que vienen directamente del producto en la reserva
          let dimensions = { length: 15, width: 15, height: 15 };
          let volume = 15 * 15 * 15;
          
          // Verificar si el producto tiene dimensiones en la reserva
          if (item.product.dimensiones) {
            dimensions = {
              length: item.product.dimensiones.largo || 15,
              width: item.product.dimensiones.ancho || 15,
              height: item.product.dimensiones.alto || 15
            };
            volume = dimensions.length * dimensions.width * dimensions.height;
          } else {
            // Fallback: buscar en productos comprados
            const individualProduct = purchasedProducts.find(p => 
              p._id === item.product._id || p.product?._id === item.product._id
            );
            
            if (individualProduct) {
              const dimensiones = getDimensiones(individualProduct);
              if (dimensiones) {
                dimensions = {
                  length: dimensiones.largo,
                  width: dimensiones.ancho,
                  height: dimensiones.alto
                };
                volume = getVolumen(individualProduct);
              }
            }
          }
          
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
      
      console.log('🏪 Productos agrupados por casillero:', lockerProducts);
      
      // Generar visualización para cada casillero
      const combinedLockers: Locker3D[] = [];
      
      lockerProducts.forEach((products, lockerNumber) => {
        console.log(`🎨 Generando visualización para casillero ${lockerNumber} con ${products.length} productos`);
        
        // Convertir al formato Product3D
        const products3D: Product3D[] = products.map(product => ({
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
      
      console.log('📊 Resultado del packing combinado:', combinedLockers);
      return combinedLockers;
    } catch (error) {
      console.error('Error al generar packing combinado:', error);
      return [];
    }
  };

  // Función para generar datos de packing para una reserva (mantener para compatibilidad)
  const generatePackingForAppointment = (appointment: Appointment) => {
    try {
      console.log('🔍 Generando packing para reserva individual:', appointment._id);
      console.log('📦 Productos en la reserva:', appointment.itemsToPickup);
      
      // Convertir productos de la reserva al formato Product3D
      const products = appointment.itemsToPickup.map((item: any) => {
        // Usar las dimensiones que vienen directamente del producto en la reserva
        let dimensions = { length: 15, width: 15, height: 15 };
        let volume = 15 * 15 * 15;
        
        // Verificar si el producto tiene dimensiones en la reserva
        if (item.product.dimensiones) {
          dimensions = {
            length: item.product.dimensiones.largo || 15,
            width: item.product.dimensiones.ancho || 15,
            height: item.product.dimensiones.alto || 15
          };
          volume = dimensions.length * dimensions.width * dimensions.height;
        } else {
          // Fallback: buscar en productos comprados
          const individualProduct = purchasedProducts.find(p => 
            p._id === item.product._id || p.product?._id === item.product._id
          );
          
          if (individualProduct) {
            const dimensiones = getDimensiones(individualProduct);
            if (dimensiones) {
              dimensions = {
                length: dimensiones.largo,
                width: dimensiones.ancho,
                height: dimensiones.alto
              };
              volume = getVolumen(individualProduct);
            }
          }
        }
        
        console.log(`📏 Producto ${item.product.nombre}:`, {
          dimensions,
          volume,
          hasDimensionsInReservation: !!item.product.dimensiones
        });
        
        return {
        id: item.product._id,
        name: item.product.nombre,
          dimensions,
        quantity: item.quantity,
          volume
        };
      });

      console.log('📋 Productos convertidos para packing:', products);

      // Realizar bin packing
      const result = gridPackingService.packProducts3D(products);
      console.log('📊 Resultado del packing:', result);
      return result;
    } catch (error) {
      console.error('Error al generar packing para reserva:', error);
      return null;
    }
  };

  // Filtrar productos válidos (con orderId)
  const validPurchasedProducts = purchasedProducts.filter(p => p.orderId);

  const renderProductCard = (item: OrderItem, index: number) => {
    const isClaimed = item.isClaimed || false;
    const selectedProduct = selectedProducts.get(index);
    const isRecentlyUnlocked = recentlyUnlockedProducts.has(item._id || '');
    
    // Verificar si el producto ya está en una reserva existente
    const productosEnReservas = new Set<string>();
    myAppointments.forEach(appointment => {
      // Solo considerar reservas activas (no canceladas ni completadas)
      if (appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.itemsToPickup) {
        appointment.itemsToPickup.forEach(reservedItem => {
          productosEnReservas.add(reservedItem.product._id);
        });
      }
    });
    
    const yaEstaEnReserva = productosEnReservas.has(item._id || '');
    
    // Debug logging para productos problemáticos
    if (isRecentlyUnlocked || yaEstaEnReserva) {
      console.log(`🔍 Producto ${item.product?.nombre}:`, {
        _id: item._id,
        isClaimed,
        isRecentlyUnlocked,
        yaEstaEnReserva,
        assigned_locker: item.assigned_locker,
        status: 'disponible'
      });
    }
    
    return (
      <div key={index} className={`card shadow-sm mb-3 ${isRecentlyUnlocked ? 'border-success border-2' : ''}`}>
        {isRecentlyUnlocked && (
          <div className="card-header bg-success text-white text-center py-2">
            <i className="bi bi-unlock me-2"></i>
            <strong>Producto Recién Desbloqueado</strong>
          </div>
        )}
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-2">
              <img 
                src={item.product.imagen_url} 
                alt={item.product?.nombre} 
                className="img-fluid rounded"
                style={{ width: 80, height: 80, objectFit: 'cover' }} 
              />
            </div>
            <div className="col-md-3">
              <h6 className="mb-1">{item.product?.nombre}</h6>
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
                <span className={`badge ${isClaimed ? 'bg-success' : yaEstaEnReserva ? 'bg-warning' : item.assigned_locker ? 'bg-warning' : isRecentlyUnlocked ? 'bg-success' : 'bg-info'}`}>
                  {isClaimed ? 'Reclamado' : yaEstaEnReserva ? 'En Reserva' : item.assigned_locker ? 'Reservado' : isRecentlyUnlocked ? 'Disponible (Recién Desbloqueado)' : 'Disponible'}
                </span>
              </div>
              {isClaimed && item.assigned_locker && (
                <div>
                  <span className="badge bg-primary">Casillero {item.assigned_locker}</span>
                </div>
              )}
            </div>
            <div className="col-md-3">
              {!isClaimed && !item.assigned_locker && !yaEstaEnReserva ? (
                <div className="d-flex flex-column gap-2">
                  {/* Producto automáticamente seleccionado */}
                  <div className="d-flex align-items-center gap-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`select-${index}`}
                        checked={selectedProduct?.quantity === 1}
                        disabled={true}
                      />
                      <label className="form-check-label small" htmlFor={`select-${index}`}>
                        Seleccionado automáticamente
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
                          (Optimizado automáticamente)
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
              ) : yaEstaEnReserva ? (
                <div className="text-center">
                  <span className="badge bg-warning">Ya en reserva</span>
                  <br />
                  <small className="text-muted">No disponible para nueva reserva</small>
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
            <button 
              className="btn btn-outline-info btn-sm"
              onClick={debugState}
              title="Debug del estado actual"
            >
              <i className="bi bi-bug me-1"></i>
              Debug
            </button>
                        <div className="d-flex gap-2 align-items-center">
              {validPurchasedProducts.length > 0 && selectedProducts.size === 0 && (
                <button 
                  className="btn btn-outline-primary"
                  onClick={selectAllAvailableProducts}
                  disabled={loading}
                >
                  <i className="bi bi-check-all me-1"></i>
                  Seleccionar Todos los Productos
                </button>
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
                      {(() => {
                        if (packingResult && packingResult.lockers.length > 0) {
                          const existingLockers = packingResult.lockers.filter(locker => {
                            const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                            return myAppointments.some(appointment => 
                              appointment.status !== 'cancelled' && 
                              appointment.status !== 'completed' &&
                              appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
                            );
                          });
                          
                          if (existingLockers.length > 0) {
                            return (
                              <span className="badge bg-light text-dark ms-1">
                                +{existingLockers.length} existente(s)
                              </span>
                            );
                          }
                        }
                        return null;
                      })()}
                    </>
                  )}
                </button>
                
                {/* Indicador de estado de casilleros */}
                {packingResult && packingResult.lockers.length > 0 && (
                  <div className="ms-3 d-flex align-items-center gap-2">
                    {(() => {
                      const hasFullLocker = packingResult.lockers.some(locker => {
                        const usagePercentage = (locker.usedSlots / 27) * 100;
                        return usagePercentage >= 80;
                      });
                      
                      const totalSlots = packingResult.lockers.reduce((sum, locker) => sum + locker.usedSlots, 0);
                      const totalCapacity = packingResult.lockers.length * 27;
                      const overallUsage = (totalSlots / totalCapacity) * 100;
                      
                      if (hasFullLocker) {
                        return (
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i>
                            Optimización excelente ({overallUsage.toFixed(0)}%)
                          </span>
                        );
                      } else if (overallUsage >= 50) {
                        return (
                          <span className="badge bg-info">
                            <i className="bi bi-info-circle me-1"></i>
                            Uso moderado ({overallUsage.toFixed(0)}%)
                          </span>
                        );
                      } else {
                        return (
                          <span className="badge bg-warning">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Uso bajo ({overallUsage.toFixed(0)}%)
                          </span>
                        );
                      }
                    })()}
                    
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={showOptimizationInfo}
                      title="Ver información de optimización"
                    >
                      <i className="bi bi-info-circle"></i>
                </button>
              </div>
                )}
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
                {validPurchasedProducts.map((item, index) => renderProductCard(item, index))}
              </div>

              {/* Visualización de Casilleros con Bin Packing 3D */}
              {lockerAssignments.size > 0 && packingResult && (
                <div className="mb-5">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">
                      <i className="bi bi-grid-3x3-gap me-2"></i>
                      Casilleros Optimizados (Bin Packing 3D)
                    </h4>
                  </div>
                  
                  {/* Mensaje informativo sobre optimización con casilleros existentes */}
                  {(() => {
                    const existingLockers = packingResult.lockers.filter(locker => {
                      const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                      return myAppointments.some(appointment => 
                        appointment.status !== 'cancelled' && 
                        appointment.status !== 'completed' &&
                        appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
                      );
                    });
                    
                    if (existingLockers.length > 0) {
                      const newLockers = packingResult.lockers.length - existingLockers.length;
                      return (
                        <div className="alert alert-info mb-3">
                          <i className="bi bi-info-circle me-2"></i>
                          <strong>Optimización Inteligente:</strong> El sistema ha optimizado tu selección para aprovechar el espacio disponible en casilleros existentes.
                          {newLockers > 0 && (
                            <span> Se crearán {newLockers} casillero(s) adicional(es) para los productos restantes.</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="row">
                    {packingResult.lockers.map((locker, index) => {
                      const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                      const isExistingLocker = myAppointments.some(appointment => 
                        appointment.status !== 'cancelled' && 
                        appointment.status !== 'completed' &&
                        appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
                      );
                      
                      return (
                        <div key={locker.id} className="col-md-6 mb-4">
                          <div className={`card ${isExistingLocker ? 'border-success' : 'border-primary'}`}>
                            <div className={`card-header ${isExistingLocker ? 'bg-success' : 'bg-primary'} text-white`}>
                              <div className="d-flex justify-content-between align-items-center">
                                <strong>
                                  {isExistingLocker ? (
                                    <>
                                      <i className="bi bi-arrow-repeat me-1"></i>
                                      Casillero {lockerNumber} (Existente)
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-plus-circle me-1"></i>
                                      Casillero {lockerNumber} (Nuevo)
                                    </>
                                  )}
                                </strong>
                                <span>Slots: {locker.usedSlots}/27</span>
                              </div>
                            </div>
                            <div className="card-body">
                              <Locker3DCanvas 
                                bin={locker}
                                selectedProductId={(() => {
                                  // Resalta el primer producto seleccionado si existe
                                  const firstSelected = Array.from(selectedProducts.keys())[0];
                                  if (firstSelected !== undefined) {
                                    const item = purchasedProducts[firstSelected];
                                    return item?._id || item?.product?._id || null;
                                  }
                                  return null;
                                })()}
                              />
                              
                              {/* Barra de progreso de ocupación del casillero */}
                              <div className="mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <small className="text-muted">
                                    <i className="bi bi-box me-1"></i>
                                    Ocupación del casillero
                                  </small>
                                  <small className="text-muted">
                                    {locker.usedSlots}/27 slots ({Math.round((locker.usedSlots / 27) * 100)}%)
                                  </small>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                  <div 
                                    className={`progress-bar ${locker.usedSlots / 27 >= 0.8 ? 'bg-danger' : locker.usedSlots / 27 >= 0.6 ? 'bg-warning' : 'bg-success'}`}
                                    role="progressbar" 
                                    style={{ width: `${(locker.usedSlots / 27) * 100}%` }}
                                    aria-valuenow={locker.usedSlots} 
                                    aria-valuemin={0} 
                                    aria-valuemax={27}
                                  ></div>
                                </div>
                              </div>
                              
                              {/* Información adicional para casilleros existentes */}
                              {isExistingLocker && (
                                <div className="mt-2">
                                  <small className="text-success">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Productos nuevos agregados a este casillero existente
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
                  <>
                    {/* Lista de reservas individuales */}
                    <div className="row mb-4">
                      {myAppointments
                        .filter(appointment => appointment.status !== 'cancelled' && appointment.status !== 'completed')
                        .map((appointment) => (
                          <div key={appointment._id} className="col-12 mb-3">
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
                                  <div className="col-md-3">
                                    <p className="mb-1">
                                      <strong>Fecha:</strong><br />
                                      {new Date(appointment.scheduledDate).toLocaleDateString('es-CO')}
                                    </p>
                                    <p className="mb-1">
                                      <strong>Hora:</strong><br />
                                      {appointment.timeSlot}
                                    </p>
                                  </div>
                                  <div className="col-md-3">
                                    <p className="mb-1">
                                      <strong>Casilleros:</strong><br />
                                      {appointment.itemsToPickup.map((item: any) => item.lockerNumber).join(', ')}
                                    </p>
                                    <p className="mb-1">
                                      <strong>Productos:</strong><br />
                                      {appointment.itemsToPickup.length} producto{appointment.itemsToPickup.length > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <div className="col-md-6">
                                    <div className="d-flex justify-content-end">
                                      <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleCancelAppointment(appointment._id)}
                                        disabled={cancellingAppointment}
                                      >
                                        {cancellingAppointment ? (
                                          <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                            Cancelando...
                                          </>
                                        ) : (
                                          <>
                                            <i className="bi bi-x-circle me-1"></i>
                                            Cancelar Reserva
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Visualización combinada de todos los casilleros */}
                    {(() => {
                      const combinedPacking = generateCombinedPackingForAllAppointments();
                      if (combinedPacking.length > 0) {
                        return (
                          <div className="mt-4">
                            <h6 className="mb-3">
                              <i className="bi bi-grid-3x3-gap me-2"></i>
                              Visualización Combinada de Casilleros
                            </h6>
                            <div className="alert alert-info">
                              <i className="bi bi-info-circle me-2"></i>
                              <strong>Estado Real:</strong> Esta visualización muestra el estado actual de todos los casilleros considerando todas tus reservas activas.
                            </div>
                            <div className="row">
                              {combinedPacking.map((locker) => (
                                <div key={locker.id} className="col-md-6 mb-3">
                                  <div className="card border-primary">
                                    <div className="card-header bg-primary text-white">
                                      <strong>Casillero {(locker as any).lockerNumber}</strong> &nbsp;|&nbsp; Slots usados: {locker.usedSlots}/27
                                    </div>
                                    <div className="card-body">
                                      <Locker3DCanvas 
                                        bin={locker}
                                        selectedProductId={null}
                                      />
                                      
                                      {/* Barra de progreso de ocupación del casillero */}
                                      <div className="mt-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <small className="text-muted">
                                            <i className="bi bi-box me-1"></i>
                                            Ocupación del casillero
                                          </small>
                                          <small className="text-muted">
                                            {locker.usedSlots}/27 slots ({Math.round((locker.usedSlots / 27) * 100)}%)
                                          </small>
                                        </div>
                                        <div className="progress" style={{ height: '8px' }}>
                                          <div 
                                            className={`progress-bar ${locker.usedSlots / 27 >= 0.8 ? 'bg-danger' : locker.usedSlots / 27 >= 0.6 ? 'bg-warning' : 'bg-success'}`}
                                            role="progressbar" 
                                            style={{ width: `${(locker.usedSlots / 27) * 100}%` }}
                                            aria-valuenow={locker.usedSlots} 
                                            aria-valuemin={0} 
                                            aria-valuemax={27}
                                          ></div>
                                        </div>
                                      </div>

                                      {/* Mostrar productos en este casillero */}
                                      {(locker as any).products && (
                                        <div className="mt-3">
                                          <small className="text-muted">
                                            <i className="bi bi-box-seam me-1"></i>
                                            Productos en este casillero:
                                          </small>
                                          <div className="mt-1">
                                            {(locker as any).products.map((product: any, idx: number) => (
                                              <span key={idx} className="badge bg-light text-dark me-1 mb-1">
                                                {product.name} (Reserva #{product.appointmentId.slice(-6)})
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
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
      {showAppointmentScheduler && packingResult && (() => {
        // Determinar si solo hay casilleros existentes
        const existingLockers: number[] = [];
        const newLockers: number[] = [];
        
        packingResult.lockers.forEach(locker => {
          const lockerNumber = parseInt(locker.id.replace('locker_', ''));
          const isExisting = myAppointments.some(appointment => 
            appointment.status !== 'cancelled' && 
            appointment.status !== 'completed' &&
            appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
          );
          
          if (isExisting) {
            existingLockers.push(lockerNumber);
          } else {
            newLockers.push(lockerNumber);
          }
        });

        const onlyExistingLockers = newLockers.length === 0 && existingLockers.length > 0;
        
        // Para casilleros existentes, contar solo los que realmente tienen productos asignados
        const existingLockersWithProducts = onlyExistingLockers 
          ? existingLockers.filter(lockerNumber => {
              const hasSelectedProducts = Array.from(selectedProducts.entries()).some(
                ([itemIndex, selection]) => selection.lockerNumber === lockerNumber
              );
              return hasSelectedProducts;
            })
          : existingLockers;
        
        return (
          <AppointmentScheduler
            isOpen={showAppointmentScheduler}
            onClose={() => setShowAppointmentScheduler(false)}
            onSchedule={handleScheduleAppointment}
            orderId={(() => {
              // Buscar el primer producto seleccionado que tenga orderId
              const firstValid = Array.from(selectedProducts.keys())
                .map(idx => validPurchasedProducts[idx])
                .find(p => p && p.orderId);
              if (firstValid) {
                console.log('🔍 OrderId obtenido para cita:', firstValid.orderId);
                console.log('📋 Producto seleccionado:', firstValid);
                return firstValid.orderId || '';
              }
              console.log('❌ No se pudo obtener orderId válido - no hay productos seleccionados con orderId');
              return '';
            })()}
            itemsToPickup={(() => {
              console.log('🔍 Generando itemsToPickup para AppointmentScheduler');
              console.log('📊 PackingResult:', packingResult);
              console.log('📋 SelectedProducts:', selectedProducts);
              
              // Si solo hay casilleros existentes, incluir solo los que tienen productos asignados
              // Si hay casilleros nuevos, solo incluir los nuevos
              const lockersToInclude = onlyExistingLockers 
                ? packingResult.lockers.filter(locker => {
                    const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                    // Solo incluir casilleros que tienen productos seleccionados
                    const hasSelectedProducts = Array.from(selectedProducts.entries()).some(
                      ([itemIndex, selection]) => selection.lockerNumber === lockerNumber
                    );
                    return hasSelectedProducts;
                  })
                : packingResult.lockers.filter(locker => {
                    const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                    const isExisting = myAppointments.some(appointment => 
                      appointment.status !== 'cancelled' && 
                      appointment.status !== 'completed' &&
                      appointment.itemsToPickup?.some(item => item.lockerNumber === lockerNumber)
                    );
                    return !isExisting; // Solo casilleros nuevos
                  });
              
              const items = lockersToInclude.map((locker, idx) => {
                const lockerNumber = parseInt(locker.id.replace('locker_', ''));
                
                // Obtener productos seleccionados que están asignados a este casillero
                const productsInThisLocker = Array.from(selectedProducts.entries())
                  .filter(([itemIndex, selection]) => selection.lockerNumber === lockerNumber)
                  .map(([itemIndex, selection]) => {
                    const item = purchasedProducts[itemIndex];
                    return {
                      name: item.product?.nombre || `Producto ${itemIndex + 1}`,
                      count: 1,
                      productId: item._id // Usar el ID real del IndividualProduct
                    };
                  });

                console.log(`📦 Casillero ${lockerNumber} - Productos asignados:`, productsInThisLocker);

                return {
                  lockerIndex: idx + 1, // Mantener para compatibilidad
                  lockerNumber: lockerNumber, // Usar el número real del casillero
                  quantity: productsInThisLocker.length,
                  products: productsInThisLocker
                };
              });
              
              console.log('🎯 ItemsToPickup final:', items);
              return items;
            })()}
            loading={schedulingAppointment}
            onlyNewLockers={!onlyExistingLockers} // Solo mostrar casilleros nuevos si no es solo existentes
            onlyExistingLockers={onlyExistingLockers} // Nueva prop para indicar si solo hay existentes
            existingLockersCount={existingLockersWithProducts.length} // Cantidad de casilleros existentes con productos
          />
        );
      })()}

      {/* Overlay de Loading para Cancelación de Reservas */}
      {cancellingAppointment && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="text-center text-white">
            <div className="spinner-border text-light mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Cancelando reserva...</span>
            </div>
            <h5 className="mb-2">Cancelando Reserva</h5>
            <p className="mb-0">Liberando productos y actualizando el sistema...</p>
            <div className="mt-3">
              <div className="spinner-grow spinner-grow-sm text-light me-2" role="status">
                <span className="visually-hidden">Procesando...</span>
              </div>
              <div className="spinner-grow spinner-grow-sm text-light me-2" role="status" style={{ animationDelay: '0.1s' }}>
                <span className="visually-hidden">Procesando...</span>
              </div>
              <div className="spinner-grow spinner-grow-sm text-light" role="status" style={{ animationDelay: '0.2s' }}>
                <span className="visually-hidden">Procesando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Loading para Reservar Casillero */}
      {reservingLocker && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="text-center text-white">
            <div className="spinner-border text-light mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Procesando reserva...</span>
            </div>
            <h5 className="mb-2">Procesando Reserva</h5>
            <p className="mb-0">Preparando casilleros y optimizando espacio...</p>
            <div className="mt-3">
              <div className="spinner-grow spinner-grow-sm text-light me-2" role="status">
                <span className="visually-hidden">Procesando...</span>
              </div>
              <div className="spinner-grow spinner-grow-sm text-light me-2" role="status" style={{ animationDelay: '0.1s' }}>
                <span className="visually-hidden">Procesando...</span>
              </div>
              <div className="spinner-grow spinner-grow-sm text-light" role="status" style={{ animationDelay: '0.2s' }}>
                <span className="visually-hidden">Procesando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Loading para Agendar Cita */}
      {schedulingAppointment && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="text-center text-white">
            <div className="spinner-border text-light mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Agendando cita...</span>
            </div>
            <h5 className="mb-2">Agendando Cita</h5>
            <p className="mb-0">Creando reservas y agregando productos a casilleros...</p>
            <div className="mt-3">
              <div className="spinner-grow spinner-grow-sm text-light me-2" role="status">
                <span className="visually-hidden">Procesando...</span>
              </div>
              <div className="spinner-grow spinner-grow-sm text-light me-2" role="status" style={{ animationDelay: '0.1s' }}>
                <span className="visually-hidden">Procesando...</span>
              </div>
              <div className="spinner-grow spinner-grow-sm text-light" role="status" style={{ animationDelay: '0.2s' }}>
                <span className="visually-hidden">Procesando...</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersPage; 