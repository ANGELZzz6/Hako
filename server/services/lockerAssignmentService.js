const LockerAssignment = require('../models/LockerAssignment');
const Appointment = require('../models/Appointment');
const IndividualProduct = require('../models/IndividualProduct');
const Product = require('../models/Product');

class LockerAssignmentService {
  constructor() {
    this.SLOT_SIZE = 15; // Cada slot mide 15cm x 15cm x 15cm
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

  // Función auxiliar para obtener dimensiones de variantes
  getVariantDimensions(item) {
    // Buscar variantes en diferentes estructuras
    const variants = item.variants || 
                    item.selectedVariants || 
                    item.productVariants ||
                    item.individualProduct?.variants ||
                    item.originalProduct?.variants;

    if (!variants || Object.keys(variants).length === 0) {
      return null;
    }

    // Buscar el producto que tenga variantes habilitadas
    const productWithVariants = item.product || 
                               item.individualProduct?.product || 
                               item.originalProduct;

    if (!productWithVariants?.variants?.enabled || !productWithVariants.variants.attributes) {
      return null;
    }

    // Buscar atributos que definen dimensiones
    const dimensionAttributes = productWithVariants.variants.attributes.filter(
      (a) => a.definesDimensions
    );

    if (dimensionAttributes.length === 0) {
      return null;
    }

    // Procesar cada atributo que define dimensiones
    for (const attr of dimensionAttributes) {
      const selectedValue = variants[attr.name];
      
      if (selectedValue) {
        const option = attr.options.find((opt) => opt.value === selectedValue);
        
        if (option && option.dimensiones && this.isValidDimensions(option.dimensiones)) {
          console.log(`✅ Usando dimensiones de la variante ${attr.name}: ${selectedValue}`, option.dimensiones);
          return option.dimensiones;
        }
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
        // Calcular dimensiones
        const dimensions = this.calculateProductDimensions(item);
        const calculatedSlots = this.calculateSlots(dimensions);
        const volume = this.calculateVolume(dimensions);

        // Obtener variantes si existen
        const variants = item.variants || 
                        item.selectedVariants || 
                        item.productVariants ||
                        item.individualProduct?.variants ||
                        item.originalProduct?.variants || {};

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
          variants,
          dimensions,
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

      // Obtener todas las citas para la fecha especificada
      const appointments = await Appointment.find({
        scheduledDate: date,
        status: { $in: ['scheduled', 'confirmed'] }
      }).populate('user', 'nombre email');

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
            console.log(`⚠️ Ya existe asignación para la cita ${appointment._id}`);
            continue;
          }

          // Procesar productos de la cita
          const processedProducts = await this.processAppointmentProducts(appointment);

          if (processedProducts.length === 0) {
            console.log(`⚠️ No se pudieron procesar productos para la cita ${appointment._id}`);
            continue;
          }

          // Calcular total de slots
          const totalSlotsUsed = processedProducts.reduce((total, product) => {
            return total + (product.calculatedSlots * product.quantity);
          }, 0);

          // Verificar que quepa en un casillero
          if (totalSlotsUsed > 27) {
            console.log(`⚠️ Los productos de la cita ${appointment._id} requieren ${totalSlotsUsed} slots, excediendo la capacidad del casillero`);
            errors.push({
              appointmentId: appointment._id,
              error: `Productos requieren ${totalSlotsUsed} slots, excediendo capacidad del casillero`
            });
            continue;
          }

          // Buscar un casillero disponible
          let lockerNumber = 1;
          let lockerFound = false;

          while (lockerNumber <= 100 && !lockerFound) {
            const isAvailable = await LockerAssignment.isLockerAvailable(
              lockerNumber,
              appointment.scheduledDate,
              appointment.timeSlot
            );

            if (isAvailable) {
              lockerFound = true;
            } else {
              lockerNumber++;
            }
          }

          if (!lockerFound) {
            console.log(`⚠️ No hay casilleros disponibles para la cita ${appointment._id}`);
            errors.push({
              appointmentId: appointment._id,
              error: 'No hay casilleros disponibles'
            });
            continue;
          }

          // Crear la asignación
          const assignment = new LockerAssignment({
            lockerNumber,
            userId: appointment.user._id.toString(),
            userName: appointment.user.nombre,
            userEmail: appointment.user.email,
            appointmentId: appointment._id.toString(),
            scheduledDate: appointment.scheduledDate,
            timeSlot: appointment.timeSlot,
            products: processedProducts,
            totalSlotsUsed,
            status: 'reserved'
          });

          await assignment.save();
          createdAssignments.push(assignment);

          console.log(`✅ Asignación creada para cita ${appointment._id} en casillero ${lockerNumber}`);

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
