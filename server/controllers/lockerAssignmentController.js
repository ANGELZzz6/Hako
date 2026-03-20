const LockerAssignment = require('../models/LockerAssignment');
const Appointment = require('../models/Appointment');
const IndividualProduct = require('../models/IndividualProduct');
const Product = require('../models/Product');

// Función auxiliar para calcular dimensiones de productos
const calculateProductDimensions = (item) => {
  // PRIORIDAD 1: Usar dimensiones del backend si están disponibles
  if (item.dimensiones && isValidDimensions(item.dimensiones)) {
    return item.dimensiones;
  }

  // PRIORIDAD 2: Usar dimensiones calculadas por el backend
  if (item.calculatedDimensiones && isValidDimensions(item.calculatedDimensiones)) {
    return item.calculatedDimensiones;
  }

  // PRIORIDAD 3: Usar dimensiones del producto individual
  if (item.individualProductDimensions && isValidDimensions(item.individualProductDimensions)) {
    return item.individualProductDimensions;
  }

  // PRIORIDAD 4: Usar dimensiones del producto original
  if (item.originalProductDimensions && isValidDimensions(item.originalProductDimensions)) {
    return item.originalProductDimensions;
  }

  // PRIORIDAD 5: Procesar variantes para obtener dimensiones específicas
  const variantDimensions = getVariantDimensions(item);
  if (variantDimensions) {
    return variantDimensions;
  }

  // PRIORIDAD 6: Usar dimensiones del producto base
  if (item.product?.dimensiones && isValidDimensions(item.product.dimensiones)) {
    return item.product.dimensiones;
  }

  // PRIORIDAD 7: Usar dimensiones del producto individual
  if (item.individualProduct?.dimensiones && isValidDimensions(item.individualProduct.dimensiones)) {
    return item.individualProduct.dimensiones;
  }

  // PRIORIDAD 8: Usar dimensiones del producto original
  if (item.originalProduct?.dimensiones && isValidDimensions(item.originalProduct.dimensiones)) {
    return item.originalProduct.dimensiones;
  }

  // Fallback: dimensiones por defecto
  console.warn('No se pudieron obtener dimensiones válidas, usando valores por defecto');
  return { largo: 15, ancho: 15, alto: 15, peso: 0 };
};

// Función auxiliar para obtener dimensiones de variantes
const getVariantDimensions = (item) => {
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
      
      if (option && option.dimensiones && isValidDimensions(option.dimensiones)) {
        console.log(`✅ Usando dimensiones de la variante ${attr.name}: ${selectedValue}`, option.dimensiones);
        return option.dimensiones;
      }
    }
  }

  return null;
};

// Función auxiliar para validar dimensiones
const isValidDimensions = (dimensions) => {
  return dimensions && 
         typeof dimensions.largo === 'number' && dimensions.largo > 0 &&
         typeof dimensions.ancho === 'number' && dimensions.ancho > 0 &&
         typeof dimensions.alto === 'number' && dimensions.alto > 0;
};

// Función auxiliar para calcular slots
const calculateSlots = (dimensions) => {
  const SLOT_SIZE = 15; // Cada slot mide 15cm x 15cm x 15cm
  const slotsX = Math.ceil(dimensions.largo / SLOT_SIZE);
  const slotsY = Math.ceil(dimensions.ancho / SLOT_SIZE);
  const slotsZ = Math.ceil(dimensions.alto / SLOT_SIZE);
  
  return slotsX * slotsY * slotsZ;
};

// Función auxiliar para calcular volumen
const calculateVolume = (dimensions) => {
  return dimensions.largo * dimensions.ancho * dimensions.alto;
};

// Función auxiliar para procesar productos de una cita
const processAppointmentProducts = async (appointment) => {
  const processedProducts = [];

  for (const item of appointment.itemsToPickup) {
    try {
      // Calcular dimensiones
      const dimensions = calculateProductDimensions(item);
      const calculatedSlots = calculateSlots(dimensions);
      const volume = calculateVolume(dimensions);

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
};

// Crear nueva asignación de casillero
const createAssignment = async (req, res) => {
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
    } = req.body;

    // Validar que el casillero esté disponible
    const existingAssignment = await LockerAssignment.findOne({
      lockerNumber,
      scheduledDate,
      timeSlot,
      status: { $in: ['reserved', 'active'] }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: `El casillero ${lockerNumber} ya está ocupado para ${scheduledDate} a las ${timeSlot}`
      });
    }

    // Calcular total de slots
    const totalSlotsUsed = products.reduce((total, product) => {
      return total + (product.calculatedSlots * product.quantity);
    }, 0);

    // Verificar que quepa en el casillero
    if (totalSlotsUsed > 27) {
      return res.status(400).json({
        success: false,
        message: `Los productos requieren ${totalSlotsUsed} slots, pero el casillero solo tiene 27 slots disponibles`
      });
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

    res.status(201).json({
      success: true,
      message: 'Asignación de casillero creada exitosamente',
      data: assignment
    });

  } catch (error) {
    console.error('Error creating locker assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener asignaciones por fecha y hora
const getAssignmentsByDateTime = async (req, res) => {
  try {
    const { date, timeSlot } = req.query;

    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los parámetros date y timeSlot'
      });
    }

    const assignments = await LockerAssignment.getByDateTime(date, timeSlot);

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching assignments by date/time:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener asignación por número de casillero
const getAssignmentByLocker = async (req, res) => {
  try {
    const { lockerNumber } = req.params;
    const { date, timeSlot } = req.query;

    if (!date || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren los parámetros date y timeSlot'
      });
    }

    const assignment = await LockerAssignment.getByLocker(lockerNumber, date, timeSlot);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró asignación para este casillero'
      });
    }

    res.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('Error fetching assignment by locker:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar asignación
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const assignment = await LockerAssignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Asignación actualizada exitosamente',
      data: assignment
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar estado de asignación
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['reserved', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Estados válidos: ' + validStatuses.join(', ')
      });
    }

    const assignment = await LockerAssignment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: assignment
    });

  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar asignación
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await LockerAssignment.findByIdAndDelete(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Asignación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener todas las asignaciones (para admin)
const getAllAssignments = async (req, res) => {
  try {
    const {
      date,
      timeSlot,
      status,
      lockerNumber
    } = req.query;

    // Construir filtros
    const filters = {};
    if (date) filters.scheduledDate = date;
    if (timeSlot) filters.timeSlot = timeSlot;
    if (status) filters.status = status;
    if (lockerNumber) filters.lockerNumber = parseInt(lockerNumber);

    const assignments = await LockerAssignment.find(filters)
      .sort({ scheduledDate: 1, timeSlot: 1, lockerNumber: 1 });

    res.json({
      success: true,
      data: assignments
    });

  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Sincronizar asignaciones desde citas existentes
// Helper: crear Date local desde 'YYYY-MM-DD'
const createLocalDate = (dateInput) => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }
  return new Date(dateInput);
};

const syncFromAppointments = async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere la fecha para sincronizar'
      });
    }

    console.log(`🔄 Iniciando sincronización de asignaciones para ${date}`);

    // Calcular rango de día [00:00, 23:59:59.999] en horario local
    const dayStart = createLocalDate(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = createLocalDate(date);
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
          console.log(`⚠️ Ya existe asignación para la cita ${appointment._id}`);
          continue;
        }

        // Procesar productos de la cita
        const processedProducts = await processAppointmentProducts(appointment);

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

        // Normalizar fecha de la cita a formato YYYY-MM-DD para locker assignments
        const formattedDate = new Date(appointment.scheduledDate).toISOString().split('T')[0];

        // Buscar un casillero disponible
        let lockerNumber = 1;
        let lockerFound = false;

        while (lockerNumber <= 100 && !lockerFound) {
          const isAvailable = await LockerAssignment.isLockerAvailable(
            lockerNumber,
            formattedDate,
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
          scheduledDate: formattedDate,
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

    res.json({
      success: true,
      message: `Sincronización completada. ${createdAssignments.length} asignaciones creadas`,
      data: {
        created: createdAssignments,
        errors: errors,
        summary: {
          totalAppointments: appointments.length,
          assignmentsCreated: createdAssignments.length,
          errors: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Error syncing from appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  createAssignment,
  getAssignmentsByDateTime,
  getAssignmentByLocker,
  updateAssignment,
  updateStatus,
  deleteAssignment,
  getAllAssignments,
  syncFromAppointments
};
