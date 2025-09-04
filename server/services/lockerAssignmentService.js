const LockerAssignment = require('../models/LockerAssignment');
const Appointment = require('../models/Appointment');
const IndividualProduct = require('../models/IndividualProduct');
const Product = require('../models/Product');

class LockerAssignmentService {
  constructor() {
    this.SLOT_SIZE = 15; // Cada slot mide 15cm x 15cm x 15cm
  }

  createLocalDate(dateInput) {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
    }
    return new Date(dateInput);
  }

  // Función auxiliar para calcular dimensiones de productos
  calculateProductDimensions(item) {
    // PRIORIDAD 1: Usar dimensiones del backend si están disponibles
    if (item.dimensiones && this.isValidDimensions(item.dimensiones)) {
      return item.dimensiones;
    }

    // PRIORIDAD 2: Usar dimensiones calculadas por el backend
    if (item.calculatedDimensiones && this.isValidDimensions(item.calculatedDimensiones)) {
      return item.calculatedDimensiones;
    }

    // PRIORIDAD 3: Usar dimensiones del producto individual
    if (item.individualProductDimensions && this.isValidDimensions(item.individualProductDimensions)) {
      return item.individualProductDimensions;
    }

    // PRIORIDAD 4: Usar dimensiones del producto original
    if (item.originalProductDimensions && this.isValidDimensions(item.originalProductDimensions)) {
      return item.originalProductDimensions;
    }

    // PRIORIDAD 5: Procesar variantes para obtener dimensiones específicas
    // Normalizar variantes de Map a objeto plano si es necesario
    if (item.variants && typeof item.variants.forEach === 'function') {
      const obj = {};
      item.variants.forEach((v, k) => { obj[k] = v; });
      item.variants = obj;
    }
    const variantDimensions = this.getVariantDimensions(item);
    if (variantDimensions) {
      return variantDimensions;
    }

    // PRIORIDAD 6: Usar dimensiones del producto base
    if (item.product?.dimensiones && this.isValidDimensions(item.product.dimensiones)) {
      return item.product.dimensiones;
    }

    // PRIORIDAD 7: Usar dimensiones del producto individual
    if (item.individualProduct?.dimensiones && this.isValidDimensions(item.individualProduct.dimensiones)) {
      return item.individualProduct.dimensiones;
    }

    // PRIORIDAD 8: Usar dimensiones del producto original
    if (item.originalProduct?.dimensiones && this.isValidDimensions(item.originalProduct.dimensiones)) {
      return item.originalProduct.dimensiones;
    }

    // Fallback: dimensiones por defecto
    console.warn('No se pudieron obtener dimensiones válidas, usando valores por defecto');
    return { largo: 15, ancho: 15, alto: 15, peso: 0 };
  }

  // Función auxiliar para obtener dimensiones de variantes (robusta y case-insensitive)
  getVariantDimensions(item) {
    // Unificar variantes desde distintas fuentes
    let variants = item.variants || item.selectedVariants || item.productVariants ||
                   item.individualProduct?.variants || item.originalProduct?.variants || null;
    // Map -> objeto plano
    if (variants && typeof variants.forEach === 'function') {
      const obj = {};
      variants.forEach((v, k) => { obj[String(k)] = v; });
      variants = obj;
    }
    if (!variants || Object.keys(variants).length === 0) return null;

    const productWithVariants = item.product || item.individualProduct?.product || item.originalProduct;
    const pv = productWithVariants?.variants;
    if (!pv || !pv.enabled || !Array.isArray(pv.attributes)) return null;

    const lowerKeyMap = {};
    for (const [k, v] of Object.entries(variants)) {
      lowerKeyMap[String(k).trim().toLowerCase()] = v;
    }

    const toLower = (s) => String(s || '').trim().toLowerCase();

    const dimensionAttributes = pv.attributes.filter((a) => a.definesDimensions);
    for (const attr of dimensionAttributes) {
      const attrKey = toLower(attr.name || attr.label);
      const selectedValue = lowerKeyMap[attrKey];
      if (!selectedValue) continue;

      const sel = toLower(selectedValue);
      const option = (attr.options || []).find((opt) => {
        return [opt.value, opt.label, opt.id].filter((x) => x != null).map(toLower).includes(sel);
      });
      if (!option) continue;

      const dims = option.dimensiones || option.dimensions || option.dimension || null;
      if (dims && this.isValidDimensions(dims)) {
        return dims;
      }
    }
    return null;
  }

  // Función auxiliar para validar dimensiones
  isValidDimensions(dimensions) {
    return dimensions && 
           typeof dimensions.largo === 'number' && dimensions.largo > 0 &&
           typeof dimensions.ancho === 'number' && dimensions.ancho > 0 &&
           typeof dimensions.alto === 'number' && dimensions.alto > 0;
  }

  // Función auxiliar para calcular slots
  calculateSlots(dimensions) {
    const slotsX = Math.ceil(dimensions.largo / this.SLOT_SIZE);
    const slotsY = Math.ceil(dimensions.ancho / this.SLOT_SIZE);
    const slotsZ = Math.ceil(dimensions.alto / this.SLOT_SIZE);
    
    return slotsX * slotsY * slotsZ;
  }

  // Función auxiliar para calcular volumen
  calculateVolume(dimensions) {
    return dimensions.largo * dimensions.ancho * dimensions.alto;
  }

  // Procesar productos de una cita
  async processAppointmentProducts(appointment) {
    const processedProducts = [];

    for (const item of appointment.itemsToPickup) {
      try {
        // Calcular dimensiones y capturar también las dimensiones por variante si existen
        const variantDims = this.getVariantDimensions(item);
        const dimensions = variantDims || this.calculateProductDimensions(item);
        const calculatedSlots = this.calculateSlots(dimensions);
        const volume = this.calculateVolume(dimensions);

        // Obtener variantes si existen
        // Normalizar Map a objeto si existe
        let variants = item.variants || 
                        item.selectedVariants || 
                        item.productVariants ||
                        item.individualProduct?.variants ||
                        item.originalProduct?.variants || {};

        if (variants && typeof variants.forEach === 'function') {
          const obj = {};
          variants.forEach((v, k) => { obj[k] = v; });
          variants = obj;
        }

        // Obtener nombre del producto
        const productName = item.product?.nombre || 
                           item.individualProduct?.product?.nombre || 
                           item.originalProduct?.nombre || 
                           'Producto sin nombre';

        // Obtener IDs
        const productId = item.product?._id || 
                         item.individualProduct?._id || 
                         item.originalProduct?._id || 
                         'unknown';

        const individualProductId = item.individualProduct?._id;
        const originalProductId = item.originalProduct?._id;

        const processedProduct = {
          productId,
          productName,
          individualProductId,
          originalProductId,
          variants: variants || {},
          // Guardar dimensiones originales y también las de la variante si existen
          dimensions,
          variantDimensions: variantDims || undefined,
          calculatedSlots,
          quantity: item.quantity || 1,
          volume
        };

        processedProducts.push(processedProduct);

        console.log(`✅ Producto procesado: ${productName}`, {
          dimensions: processedProduct.dimensions,
          calculatedSlots: processedProduct.calculatedSlots,
          volume: processedProduct.volume,
          variants: processedProduct.variants
        });

      } catch (error) {
        console.error('Error procesando producto:', error);
        // Continuar con el siguiente producto
      }
    }

    return processedProducts;
  }

  // Divide productos en grupos que quepan en casilleros (<= 27 slots por grupo)
  splitProductsIntoLockers(products) {
    const MAX_SLOTS = 27;
    const lockers = [];
    let currentLocker = { products: [], usedSlots: 0 };

    for (const product of products) {
      const slotsPerUnit = product.calculatedSlots;
      let remainingQuantity = product.quantity || 1;

      // Si un solo unit supera la capacidad, igualmente asignar una unidad por casillero
      if (slotsPerUnit > MAX_SLOTS) {
        // Crear un clon con cantidad 1 por casillero hasta agotar
        while (remainingQuantity > 0) {
          lockers.push({ products: [{ ...product, quantity: 1 }], usedSlots: Math.min(slotsPerUnit, MAX_SLOTS) });
          remainingQuantity -= 1;
        }
        continue;
      }

      // Empaquetar cantidades considerando la capacidad
      while (remainingQuantity > 0) {
        const availableSlots = MAX_SLOTS - currentLocker.usedSlots;
        const maxUnitsFit = Math.floor(availableSlots / slotsPerUnit);

        if (maxUnitsFit <= 0) {
          // Abrir nuevo casillero
          if (currentLocker.products.length > 0) {
            lockers.push(currentLocker);
          }
          currentLocker = { products: [], usedSlots: 0 };
          continue;
        }

        const unitsToPlace = Math.min(maxUnitsFit, remainingQuantity);
        currentLocker.products.push({ ...product, quantity: unitsToPlace });
        currentLocker.usedSlots += unitsToPlace * slotsPerUnit;
        remainingQuantity -= unitsToPlace;
      }
    }

    if (currentLocker.products.length > 0) {
      lockers.push(currentLocker);
    }

    return lockers;
  }

  // Crear asignación de casillero
  async createAssignment(assignmentData) {
    try {
      const {
        lockerNumber,
        userId,
        userName,
        userEmail,
        appointmentId,
        scheduledDate,
        timeSlot,
        products
      } = assignmentData;

      // Validar que el casillero esté disponible
      const existingAssignment = await LockerAssignment.findOne({
        lockerNumber,
        scheduledDate,
        timeSlot,
        status: { $in: ['reserved', 'active'] }
      });

      if (existingAssignment) {
        throw new Error(`El casillero ${lockerNumber} ya está ocupado para ${scheduledDate} a las ${timeSlot}`);
      }

      // Calcular total de slots
      const totalSlotsUsed = products.reduce((total, product) => {
        return total + (product.calculatedSlots * product.quantity);
      }, 0);

      // Verificar que quepa en el casillero
      if (totalSlotsUsed > 27) {
        throw new Error(`Los productos requieren ${totalSlotsUsed} slots, pero el casillero solo tiene 27 slots disponibles`);
      }

      // Crear la asignación
      const assignment = new LockerAssignment({
        lockerNumber,
        userId,
        userName,
        userEmail,
        appointmentId,
        scheduledDate,
        timeSlot,
        products,
        totalSlotsUsed
      });

      await assignment.save();
      return assignment;

    } catch (error) {
      console.error('Error creating locker assignment:', error);
      throw error;
    }
  }

  // Obtener asignaciones por fecha y hora
  async getAssignmentsByDateTime(date, timeSlot) {
    try {
      return await LockerAssignment.getByDateTime(date, timeSlot);
    } catch (error) {
      console.error('Error fetching assignments by date/time:', error);
      throw error;
    }
  }

  // Obtener asignación por número de casillero
  async getAssignmentByLocker(lockerNumber, date, timeSlot) {
    try {
      return await LockerAssignment.getByLocker(lockerNumber, date, timeSlot);
    } catch (error) {
      console.error('Error fetching assignment by locker:', error);
      throw error;
    }
  }

  // Actualizar asignación
  async updateAssignment(id, updateData) {
    try {
      const assignment = await LockerAssignment.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!assignment) {
        throw new Error('Asignación no encontrada');
      }

      return assignment;
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }

  // Actualizar estado de asignación
  async updateStatus(id, status) {
    try {
      const validStatuses = ['reserved', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Estado inválido. Estados válidos: ' + validStatuses.join(', '));
      }

      const assignment = await LockerAssignment.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!assignment) {
        throw new Error('Asignación no encontrada');
      }

      return assignment;
    } catch (error) {
      console.error('Error updating assignment status:', error);
      throw error;
    }
  }

  // Eliminar asignación
  async deleteAssignment(id) {
    try {
      const assignment = await LockerAssignment.findByIdAndDelete(id);

      if (!assignment) {
        throw new Error('Asignación no encontrada');
      }

      return assignment;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }

  // Obtener todas las asignaciones con filtros
  async getAllAssignments(filters = {}) {
    try {
      const {
        date,
        timeSlot,
        status,
        lockerNumber
      } = filters;

      // Construir filtros
      const queryFilters = {};
      if (date) queryFilters.scheduledDate = date;
      if (timeSlot) queryFilters.timeSlot = timeSlot;
      if (status) queryFilters.status = status;
      if (lockerNumber) queryFilters.lockerNumber = parseInt(lockerNumber);

      return await LockerAssignment.find(queryFilters)
        .sort({ scheduledDate: 1, timeSlot: 1, lockerNumber: 1 });
    } catch (error) {
      console.error('Error fetching all assignments:', error);
      throw error;
    }
  }

  // Sincronizar asignaciones desde citas existentes
  async syncFromAppointments(date) {
    try {
      console.log(`🔄 Iniciando sincronización de asignaciones para ${date}`);

      // Calcular rango de día [00:00, 23:59:59.999] para la fecha recibida (horario local)
      const dayStart = this.createLocalDate(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = this.createLocalDate(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Obtener todas las citas dentro del rango del día
      const appointments = await Appointment.find({
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['scheduled', 'confirmed'] }
      })
        .populate('user', 'nombre email')
        .populate({
          path: 'itemsToPickup.individualProduct',
          populate: { path: 'product', select: 'nombre imagen_url dimensiones variants' }
        })
        .populate('itemsToPickup.originalProduct', 'nombre imagen_url dimensiones variants');

      console.log(`📅 Encontradas ${appointments.length} citas para sincronizar`);

      const createdAssignments = [];
      const errors = [];

      for (const appointment of appointments) {
        try {
          // Verificar si ya existe una asignación para esta cita
          const existingAssignment = await LockerAssignment.findOne({
            appointmentId: appointment._id.toString()
          });

          if (existingAssignment) {
            // Asegurar que fecha/hora estén actualizadas tras cambios de la cita
            const d = new Date(appointment.scheduledDate);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd}`;

            await LockerAssignment.updateMany(
              { appointmentId: appointment._id.toString() },
              { $set: { scheduledDate: formattedDate, timeSlot: appointment.timeSlot } }
            );
            console.log(`♻️ Assignment existente sincronizada para cita ${appointment._id}`);
            continue;
          }

          // Procesar productos de la cita
          const processedProducts = await this.processAppointmentProducts(appointment);

          if (processedProducts.length === 0) {
            console.log(`⚠️ No se pudieron procesar productos para la cita ${appointment._id}`);
            continue;
          }

          // Empaquetar productos en uno o más casilleros (<=27 slots por casillero)
          const lockerPacks = this.splitProductsIntoLockers(processedProducts);

          // Normalizar fecha de la cita a formato YYYY-MM-DD para locker assignments
          const formattedDate = new Date(appointment.scheduledDate).toISOString().split('T')[0];

          // Para cada pack, buscar casillero y crear assignment
          for (const pack of lockerPacks) {
            let lockerNumber = 1;
            let lockerFound = false;
            while (lockerNumber <= 100 && !lockerFound) {
              const isAvailable = await LockerAssignment.isLockerAvailable(
                lockerNumber,
                formattedDate,
                appointment.timeSlot
              );
              if (isAvailable) lockerFound = true; else lockerNumber++;
            }

            if (!lockerFound) {
              console.log(`⚠️ No hay casilleros disponibles para la cita ${appointment._id}`);
              errors.push({
                appointmentId: appointment._id,
                error: 'No hay casilleros disponibles'
              });
              break;
            }

            const totalSlotsUsed = pack.usedSlots;
            const assignment = new LockerAssignment({
              lockerNumber,
              userId: appointment.user._id.toString(),
              userName: appointment.user.nombre,
              userEmail: appointment.user.email,
              appointmentId: appointment._id.toString(),
              scheduledDate: formattedDate,
              timeSlot: appointment.timeSlot,
              products: pack.products,
              totalSlotsUsed,
              status: 'reserved'
            });
            await assignment.save();
            createdAssignments.push(assignment);
            console.log(`✅ Asignación creada para cita ${appointment._id} en casillero ${lockerNumber} (slots: ${totalSlotsUsed})`);
          }

        } catch (error) {
          console.error(`Error procesando cita ${appointment._id}:`, error);
          errors.push({
            appointmentId: appointment._id,
            error: error.message
          });
        }
      }

      return {
        created: createdAssignments,
        errors: errors,
        summary: {
          totalAppointments: appointments.length,
          assignmentsCreated: createdAssignments.length,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('Error syncing from appointments:', error);
      throw error;
    }
  }

  // Verificar disponibilidad de casillero
  async isLockerAvailable(lockerNumber, date, timeSlot) {
    try {
      return await LockerAssignment.isLockerAvailable(lockerNumber, date, timeSlot);
    } catch (error) {
      console.error('Error checking locker availability:', error);
      throw error;
    }
  }

  // Obtener estadísticas de uso de casilleros
  async getLockerUsageStats(date, timeSlot) {
    try {
      const assignments = await LockerAssignment.getByDateTime(date, timeSlot);
      
      const stats = {
        totalLockers: 100,
        usedLockers: assignments.length,
        availableLockers: 100 - assignments.length,
        totalSlotsUsed: assignments.reduce((total, assignment) => total + assignment.totalSlotsUsed, 0),
        totalSlotsAvailable: (100 - assignments.length) * 27,
        efficiency: assignments.length > 0 ? 
          (assignments.reduce((total, assignment) => total + assignment.totalSlotsUsed, 0) / (assignments.length * 27)) * 100 : 0
      };

      return stats;
    } catch (error) {
      console.error('Error getting locker usage stats:', error);
      throw error;
    }
  }
}

module.exports = new LockerAssignmentService();
