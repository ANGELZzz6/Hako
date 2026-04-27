const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const IndividualProduct = require('../models/IndividualProduct');
const User = require('../models/User');
const LockerAssignment = require('../models/LockerAssignment');
const lockerAssignmentService = require('../services/lockerAssignmentService');

const isDev = process.env.NODE_ENV === 'development';

// Offset fijo Colombia UTC-5 (no cambia con horario de verano)
const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;

const createLocalDate = (dateString) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    // Crear medianoche en Colombia (UTC-5) como UTC
    // Ej: 2026-03-21 00:00 COT = 2026-03-21T05:00:00.000Z
    const date = new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      5, 0, 0, 0  // 00:00 COT = 05:00 UTC
    ));
    if (isDev) console.log(`🔍 createLocalDate: ${dateString} -> ${date.toISOString()} (Colombia: ${dateString})`);
    return date;
  }
  const date = new Date(dateString);
  if (isDev) console.log(`🔍 createLocalDate: ${dateString} -> ${date.toISOString()}`);
  return date;
};

// Helper para obtener medianoche del día siguiente en Colombia
const getNextDayColombia = (date) => {
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return next;
};

// Helper para obtener "hoy" a medianoche en Colombia
const getTodayColombia = () => {
  const now = new Date();
  // Hora actual en Colombia
  const nowColombia = new Date(now.getTime() - COLOMBIA_OFFSET_MS);
  // Medianoche Colombia en UTC
  return new Date(Date.UTC(
    nowColombia.getUTCFullYear(),
    nowColombia.getUTCMonth(),
    nowColombia.getUTCDate(),
    5, 0, 0, 0
  ));
};

// Obtener horarios disponibles para una fecha
exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    // Validar formato de fecha
    const selectedDate = createLocalDate(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }

    const today = getTodayColombia();
    if (selectedDate < today) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }

    const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (selectedDate > maxDate) {
      return res.status(400).json({ error: 'No se pueden consultar horarios con más de 7 días de anticipación' });
    }

    const availableSlots = await Appointment.getAvailableTimeSlots(selectedDate);

    // Si es el día actual, filtrar horas que ya han pasado
    const isToday = selectedDate.getTime() === getTodayColombia().getTime();

    if (isDev) {
      console.log('🔍 Debug getAvailableTimeSlots:');
      console.log('  Fecha recibida:', date);
      console.log('  Fecha seleccionada (parsed):', selectedDate.toISOString());
      console.log('  Fecha seleccionada (local):', selectedDate.toLocaleDateString());
      console.log('  Fecha actual:', today.toISOString());
      console.log('  Fecha actual (local):', today.toLocaleDateString());
      console.log('  ¿Es hoy?:', isToday);
      console.log('  Hora actual (servidor):', new Date().toLocaleTimeString());
      console.log('  Zona horaria del servidor:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    }

    if (isToday) {
      const now = new Date();
      // Obtener hora actual en Colombia (UTC-5)
      const nowColombia = new Date(now.getTime() - COLOMBIA_OFFSET_MS);
      const currentHour = nowColombia.getUTCHours();
      const currentMinute = nowColombia.getUTCMinutes();

      if (isDev) {
        console.log('  Filtrando horas para hoy (Buffer 1h):');
        console.log('  Hora actual Colombia:', currentHour);
        console.log('  Minuto actual Colombia:', currentMinute);
      }

      // Tarea 6: Filtrar slots que tengan al menos 1 hora de diferencia con la hora actual
      const filteredSlots = availableSlots.filter(slot => {
        const [hours, minutes] = slot.time.split(':');
        const slotHour = parseInt(hours);
        const slotMinute = parseInt(minutes);

        // Comparar en minutos totales
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        
        // La diferencia debe ser de al menos 60 minutos
        const hasOneHourBuffer = (slotTotalMinutes - currentTotalMinutes) >= 60;

        if (isDev) console.log(`    ${slot.time}: slotMin=${slotTotalMinutes}, currentMin=${currentTotalMinutes}, diff=${slotTotalMinutes - currentTotalMinutes}, ¿tiene buffer?=${hasOneHourBuffer}`);

        return hasOneHourBuffer;
      });

      if (isDev) console.log('  Horarios filtrados para hoy:', filteredSlots.map(s => s.time));

      return res.json({
        date: date,
        timeSlots: filteredSlots
      });
    }

    if (isDev) console.log('  No es hoy, retornando todos los horarios:', availableSlots.map(s => s.time));

    res.json({
      date: date,
      timeSlots: availableSlots
    });
  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear una nueva cita
exports.createAppointment = async (req, res) => {
  try {
    const { orderId, scheduledDate, timeSlot, itemsToPickup, notes, contactInfo } = req.body;

    // Bloquear si el usuario tiene reservas vencidas (scheduled/confirmed en el pasado)
    {
      const activeAppointments = await Appointment.find({
        user: req.user.id,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (activeAppointments.length > 0) {
        const now = new Date();
        if (isDev) {
          console.log('🔍 Verificando reservas vencidas...');
          console.log('⏰ Hora actual:', now.toISOString());
        }

        const hasExpired = activeAppointments.some(app => {
          const appDate = new Date(app.scheduledDate);
          const [h, m] = (app.timeSlot || '00:00').split(':');
          appDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);

          if (isDev) {
            console.log(`📅 Reserva ${app._id}: ${appDate.toISOString()} (${app.scheduledDate} ${app.timeSlot})`);
            console.log(`   ¿Está vencida? ${appDate < now}`);
          }

          return appDate < now;
        });

        if (hasExpired) {
          if (isDev) console.log('❌ Usuario tiene reservas vencidas - BLOQUEANDO');
          return res.status(403).json({
            error: 'Tienes reservas vencidas. Primero edítalas o cancélalas antes de crear una nueva reserva.'
          });
        }

        if (isDev) console.log('✅ Usuario no tiene reservas vencidas - PERMITIENDO');
      }
    }

    // Debug: Ver qué datos está recibiendo el backend
    if (isDev) {
      console.log('🔍 Backend recibió:', {
        orderId,
        scheduledDate,
        timeSlot,
        itemsToPickup,
        notes,
        contactInfo
      });
    }

    // Validar datos requeridos
    if (!orderId || !scheduledDate || !timeSlot || !itemsToPickup || !Array.isArray(itemsToPickup)) {
      if (isDev) {
        console.log('❌ Datos incompletos:', {
          orderId: !!orderId,
          scheduledDate: !!scheduledDate,
          timeSlot: !!timeSlot,
          itemsToPickup: !!itemsToPickup,
          isArray: Array.isArray(itemsToPickup)
        });
      }
      return res.status(400).json({ error: 'Datos incompletos para crear la cita' });
    }

    // HIGH-06: Validar timeSlot contra lista de slots permitidos (08:00-22:00)
    const ALLOWED_TIME_SLOTS = [
      '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
    ];
    if (!ALLOWED_TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ error: `Horario no válido. Los horarios permitidos son: ${ALLOWED_TIME_SLOTS.join(', ')}` });
    }

    // Verificar que la orden existe y pertenece al usuario
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
      status: { $in: ['paid', 'ready_for_pickup'] }
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada o no disponible' });
    }

    // Validar fecha y hora
    const selectedDate = createLocalDate(scheduledDate);
    const today = getTodayColombia();


    // HIGH-01: Verificar penalización por reserva vencida (ventana global de 24 horas)
    const user = await User.findById(req.user.id);
    if (user && user.reservationPenalties && user.reservationPenalties.length > 0) {
      const currentTime = new Date();
      const activePenalty = user.reservationPenalties.find(p => {
        const penaltyTime = new Date(p.createdAt);
        const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);

        if (isDev) {
          console.log(`🔍 Penalización del ${new Date(p.date).toLocaleDateString('es-CO')}`);
          console.log(`⏰ Horas transcurridas: ${hoursSincePenalty.toFixed(2)}`);
        }

        return hoursSincePenalty < 24;
      });

      if (activePenalty) {
        const penaltyTime = new Date(activePenalty.createdAt);
        const hoursRemaining = 24 - ((currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60));
        if (isDev) console.log(`❌ Penalización activa — ${hoursRemaining.toFixed(1)}h restantes`);
        return res.status(403).json({
          error: `Tienes una penalización activa por reserva vencida. Podrás volver a reservar en ${Math.ceil(hoursRemaining)} hora(s).`
        });
      }
    }

    if (selectedDate < today) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }

    // Validar que la fecha no sea más de 7 días adelante
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);

    if (selectedDate > maxDate) {
      return res.status(400).json({ error: 'No se pueden agendar citas con más de 7 días de anticipación' });
    }

    // Validar que la reserva tenga al menos 1 hora de anticipación
    const now = new Date();
    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference < 1) {
      return res.status(400).json({
        error: 'Solo se pueden crear reservas con al menos 1 hora de anticipación'
      });
    }

    // Validar que los productos individuales existen y están disponibles
    const validItems = [];
    for (const pickupItem of itemsToPickup) {
      // Buscar el producto individual por su ID
      const individualProduct = await IndividualProduct.findOne({
        _id: pickupItem.product,
        user: req.user.id,
        status: 'available'
      }).populate('product');

      if (!individualProduct) {
        return res.status(400).json({
          error: `Producto individual no encontrado o no disponible`
        });
      }

      // Tarea 4: Asignación automática de casillero si no se proporciona uno
      let lockerNumber = pickupItem.lockerNumber;
      if (!lockerNumber) {
        if (isDev) console.log('🔍 No se proporcionó número de casillero, buscando el mejor disponible...');
        lockerNumber = await lockerAssignmentService.findBestLocker(scheduledDate, timeSlot);
        
        if (!lockerNumber) {
          return res.status(409).json({
            error: 'No hay casilleros disponibles para este horario. Por favor intenta con otra fecha u hora.'
          });
        }
        if (isDev) console.log(`✅ Casillero asignado automáticamente: ${lockerNumber}`);
      }

      // Verificar que el producto no esté ya reservado
      if (individualProduct.status !== 'available') {
        return res.status(400).json({
          error: `El producto ya está ${individualProduct.status}`
        });
      }

      // Calcular dimensiones y volumen basados en variantes del producto individual
      const dims = typeof individualProduct.getVariantOrProductDimensions === 'function'
        ? individualProduct.getVariantOrProductDimensions()
        : (individualProduct.dimensiones || individualProduct.product?.dimensiones || null);
      const vol = typeof individualProduct.getVariantOrProductVolume === 'function'
        ? individualProduct.getVariantOrProductVolume()
        : (dims ? dims.largo * dims.ancho * dims.alto : null);

      validItems.push({
        individualProduct: individualProduct._id,
        originalProduct: individualProduct.product._id,
        quantity: 1, // Siempre 1 para productos individuales
        lockerNumber: lockerNumber,
        individualProductId: individualProduct._id,
        // Enviar variantes y dimensiones para visualización combinada correcta
        variants: individualProduct.variants ? Object.fromEntries(individualProduct.variants) : undefined,
        dimensiones: dims || undefined,
        volumen: vol || undefined
      });
    }

    // Buscar reservas existentes del usuario en la misma fecha y hora
    const existingAppointments = await Appointment.find({
      user: req.user.id,
      scheduledDate: selectedDate,
      timeSlot: timeSlot,
      status: { $nin: ['cancelled', 'completed'] }
    }).populate('itemsToPickup.product');

    if (isDev) console.log('🔍 Reservas existentes encontradas:', existingAppointments.length);

    // Si hay reservas existentes, intentar agregar productos a ellas
    if (existingAppointments.length > 0) {
      if (isDev) console.log('📅 Intentando agregar productos a reservas existentes...');

      // Agrupar productos por casillero solicitado
      const productsByLocker = new Map();
      validItems.forEach(item => {
        if (!productsByLocker.has(item.lockerNumber)) {
          productsByLocker.set(item.lockerNumber, []);
        }
        productsByLocker.get(item.lockerNumber).push(item);
      });

      // Para cada casillero solicitado, buscar una reserva existente que lo use
      for (const [lockerNumber, products] of productsByLocker) {
        let existingAppointment = existingAppointments.find(app =>
          app.itemsToPickup.some(item => item.lockerNumber === lockerNumber)
        );

        if (existingAppointment) {
          // Si la reserva está vencida, actualizar su fecha/hora a la próxima disponible antes de agregar
          const appDateTime = new Date(existingAppointment.scheduledDate);
          const [h, m] = (existingAppointment.timeSlot || '00:00').split(':');
          appDateTime.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);
          const now = new Date();
          if (appDateTime < now) {
            if (isDev) console.log(`♻️ Reserva ${existingAppointment._id} está vencida. Reprogramando antes de agregar productos...`);
            // Buscar siguiente día/hora disponible (simple: mañana misma hora)
            const newDate = new Date(now);
            newDate.setDate(newDate.getDate() + 1);
            newDate.setHours(0, 0, 0, 0);
            existingAppointment.scheduledDate = newDate;
            // Mantener mismo timeSlot si es válido; en producción podrías consultar getAvailableTimeSlots
            await existingAppointment.save();
          }

          if (isDev) console.log(`✅ Agregando productos al casillero ${lockerNumber} en reserva existente ${existingAppointment._id}`);

          // Agregar productos a la reserva existente
          for (const product of products) {
            existingAppointment.itemsToPickup.push({
              individualProduct: product.individualProduct,
              originalProduct: product.originalProduct,
              quantity: product.quantity,
              lockerNumber: product.lockerNumber,
              // También persistir variantes y dimensiones
              variants: product.variants,
              dimensiones: product.dimensiones,
              volumen: product.volumen
            });
          }

          await existingAppointment.save();

          // Marcar productos como reservados
          for (const product of products) {
            const individualProduct = await IndividualProduct.findById(product.individualProductId);
            if (individualProduct) {
              individualProduct.status = 'reserved';
              individualProduct.assignedLocker = product.lockerNumber;
              individualProduct.reservedAt = new Date();
              await individualProduct.save();
            }
          }

          // Remover estos productos de validItems para no crear una nueva reserva
          validItems.splice(validItems.findIndex(item =>
            products.some(p => p.individualProductId === item.individualProductId)
          ), products.length);
        }
      }
    }

    // Si quedan productos sin asignar, crear una nueva reserva
    if (validItems.length > 0) {
      if (isDev) console.log(`📅 Creando nueva reserva para ${validItems.length} productos restantes`);

      // Obtener los casilleros que se van a usar en esta cita
      const requestedLockers = validItems.map(item => item.lockerNumber);

      // Verificar disponibilidad de los casilleros específicos
      const availability = await Appointment.checkLockerAvailability(selectedDate, timeSlot, requestedLockers);
      if (!availability.available) {
        return res.status(400).json({
          error: `Casilleros ${availability.conflictingLockers.join(', ')} no disponibles en este horario`,
          occupiedLockers: availability.occupiedLockers,
          conflictingLockers: availability.conflictingLockers
        });
      }

      // Marcar productos individuales como reservados
      for (const item of validItems) {
        const individualProduct = await IndividualProduct.findById(item.individualProductId);
        if (individualProduct) {
          individualProduct.status = 'reserved';
          individualProduct.assignedLocker = item.lockerNumber;
          individualProduct.reservedAt = new Date();
          await individualProduct.save();
        }
      }

      // Crear la nueva cita
      const appointment = new Appointment({
        user: req.user.id,
        order: orderId,
        scheduledDate: selectedDate,
        timeSlot,
        itemsToPickup: validItems,
        notes: notes || undefined,
        contactInfo: contactInfo ? {
          phone: contactInfo.phone || undefined,
          email: contactInfo.email || undefined
        } : undefined
      });

      await appointment.save();

      // Actualizar estado de la orden si es necesario
      if (order.status === 'paid') {
        order.status = 'ready_for_pickup';
        await order.save();
      }

      // Sincronizar automáticamente con locker assignments
      try {
        if (isDev) console.log('🔄 Sincronizando automáticamente con locker assignments...');
        await lockerAssignmentService.syncFromAppointments(appointment.scheduledDate);
        if (isDev) console.log('✅ Sincronización automática completada');
      } catch (syncError) {
        console.error('⚠️ Error en sincronización automática:', syncError);
        // No fallar la creación de la cita por errores de sincronización
      }

      res.status(201).json({
        message: 'Productos agregados a reservas existentes y nueva reserva creada exitosamente',
        appointment: {
          id: appointment._id,
          scheduledDate: appointment.scheduledDate,
          timeSlot: appointment.timeSlot,
          status: appointment.status
        }
      });
    } else {
      // Todos los productos se agregaron a reservas existentes
      // Sincronizar automáticamente con locker assignments
      try {
        if (isDev) console.log('🔄 Sincronizando automáticamente con locker assignments...');
        await lockerAssignmentService.syncFromAppointments(selectedDate);
        if (isDev) console.log('✅ Sincronización automática completada');
      } catch (syncError) {
        console.error('⚠️ Error en sincronización automática:', syncError);
        // No fallar la operación por errores de sincronización
      }

      res.status(200).json({
        message: 'Productos agregados a reservas existentes exitosamente'
      });
    }

  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener citas del usuario
exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user.id })
      .populate('order', 'total_amount status')
      .populate({
        path: 'itemsToPickup.individualProduct',
        populate: {
          path: 'product',
          select: 'nombre imagen_url dimensiones variants'
        }
      })
      .populate('itemsToPickup.originalProduct', 'nombre imagen_url descripcion dimensiones variants')
      .sort({ scheduledDate: 1, timeSlot: 1 });

    // Procesar cada cita para agregar información de variantes y dimensiones calculadas
    const processedAppointments = await Promise.all(appointments.map(async (appointment) => {

      // Procesar cada item en la cita - Filtrar nulos para evitar crashes
      const itemsToProcess = appointment.itemsToPickup.filter(item => {
        const isValid = item.individualProduct && item.originalProduct;
        if (!isValid && isDev) {
          console.warn(`⚠️ [getMyAppointments] Filtrando item nulo en cita ${appointment._id}:`, {
            hasIndividual: !!item.individualProduct,
            hasOriginal: !!item.originalProduct
          });
        }
        return isValid;
      });

      const processedItems = await Promise.all(itemsToProcess.map(async (item) => {
        // Usar directamente el IndividualProduct ya poblado
        const individualProduct = item.individualProduct;

        if (individualProduct) {
          if (isDev) {
            console.log(`🔍 Procesando item de reserva: ${item.originalProduct.nombre}`);
            console.log(`🔍 Usando IndividualProduct ID: ${individualProduct._id}`);
            console.log(`🔍 Variantes:`, individualProduct.variants ? Object.fromEntries(individualProduct.variants) : 'Sin variantes');
          }

          // Calcular dimensiones considerando variantes
          const variantDimensiones = individualProduct.getVariantOrProductDimensions();
          const variantVolume = individualProduct.getVariantOrProductVolume();

          if (isDev) {
            console.log(`🔍 Dimensiones calculadas:`, variantDimensiones);
            console.log(`🔍 Volumen calculado:`, variantVolume);
          }

          // Agregar información de variantes y dimensiones calculadas al item
          return {
            ...item.toObject(),
            product: item.originalProduct, // Mantener compatibilidad con el frontend
            variants: individualProduct.variants ? Object.fromEntries(individualProduct.variants) : null,
            dimensiones: variantDimensiones,
            volumen: variantVolume,
            individualProductId: individualProduct._id
          };
        }

        if (isDev) console.log(`⚠️ No se encontró IndividualProduct para ${item.originalProduct.nombre}`);
        return {
          ...item.toObject(),
          product: item.originalProduct // Mantener compatibilidad con el frontend
        };
      }));

      return {
        ...appointment.toObject(),
        itemsToPickup: processedItems
      };
    }));

    res.json(processedAppointments);
  } catch (error) {
    console.error('Error al obtener citas del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener una cita específica del usuario
exports.getMyAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user.id
    })
      .populate('order', 'total_amount status')
      .populate({
        path: 'itemsToPickup.individualProduct',
        populate: {
          path: 'product',
          select: 'nombre imagen_url dimensiones variants'
        }
      })
      .populate('itemsToPickup.originalProduct', 'nombre imagen_url descripcion dimensiones variants');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Procesar cada item en la cita - Filtrar nulos para evitar crashes
    const itemsToProcess = appointment.itemsToPickup.filter(item => {
      const isValid = item.individualProduct && item.originalProduct;
      if (!isValid && isDev) {
        console.warn(`⚠️ [getMyAppointment] Filtrando item nulo en cita ${appointment._id}:`, {
          hasIndividual: !!item.individualProduct,
          hasOriginal: !!item.originalProduct
        });
      }
      return isValid;
    });

    const processedItems = await Promise.all(itemsToProcess.map(async (item) => {
      // Usar directamente el IndividualProduct ya poblado
      const individualProduct = item.individualProduct;

      if (individualProduct) {
        if (isDev) {
          console.log(`🔍 Procesando item de reserva: ${item.originalProduct.nombre}`);
          console.log(`🔍 Usando IndividualProduct ID: ${individualProduct._id}`);
          console.log(`🔍 Variantes:`, individualProduct.variants ? Object.fromEntries(individualProduct.variants) : 'Sin variantes');
        }

        // Calcular dimensiones considerando variantes
        const variantDimensiones = individualProduct.getVariantOrProductDimensions();
        const variantVolume = individualProduct.getVariantOrProductVolume();

        if (isDev) {
          console.log(`🔍 Dimensiones calculadas:`, variantDimensiones);
          console.log(`🔍 Volumen calculado:`, variantVolume);
        }

        // Agregar información de variantes y dimensiones calculadas al item
        return {
          ...item.toObject(),
          product: item.originalProduct, // Mantener compatibilidad con el frontend
          variants: individualProduct.variants ? Object.fromEntries(individualProduct.variants) : null,
          dimensiones: variantDimensiones,
          volumen: variantVolume,
          individualProductId: individualProduct._id
        };
      }

      if (isDev) console.log(`⚠️ No se encontró IndividualProduct para ${item.originalProduct.nombre}`);
      return {
        ...item.toObject(),
        product: item.originalProduct // Mantener compatibilidad con el frontend
      };
    }));

    const processedAppointment = {
      ...appointment.toObject(),
      itemsToPickup: processedItems
    };

    res.json(processedAppointment);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar una cita del usuario
exports.updateMyAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { scheduledDate, timeSlot } = req.body;

    // Buscar la cita y verificar que pertenece al usuario
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Verificar que la cita no esté cancelada o completada
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return res.status(400).json({ error: 'No se puede modificar una cita cancelada o completada' });
    }

    // Determinar si la fecha u hora han cambiado
    const dateChanged = scheduledDate && createLocalDate(scheduledDate).getTime() !== new Date(appointment.scheduledDate).getTime();
    const slotChanged = timeSlot && timeSlot !== appointment.timeSlot;

    let newLockerNumber = appointment.itemsToPickup[0]?.lockerNumber;

    if (dateChanged || slotChanged) {
      if (isDev) console.log(`🔄 Fecha/Hora cambiada. Buscando mejor casillero para ${scheduledDate} ${timeSlot}...`);
      
      const newDate = createLocalDate(scheduledDate || appointment.scheduledDate);
      newLockerNumber = await lockerAssignmentService.findBestLocker(newDate, timeSlot || appointment.timeSlot);

      if (!newLockerNumber) {
        return res.status(409).json({
          error: 'No hay casilleros disponibles para el nuevo horario seleccionado. Por favor intenta con otra fecha u hora.'
        });
      }
      if (isDev) console.log(`✅ Nuevo casillero asignado automáticamente: ${newLockerNumber}`);
    }

    // Actualizar la cita
    if (scheduledDate) appointment.scheduledDate = createLocalDate(scheduledDate);
    if (timeSlot) appointment.timeSlot = timeSlot;

    // Actualizar todos los ítems con el nuevo casillero (o mantener el anterior)
    appointment.itemsToPickup = appointment.itemsToPickup.map(item => ({
      ...item.toObject(),
      lockerNumber: newLockerNumber
    }));

    await appointment.save();

    // Actualizar todos los productos individuales asociados
    for (const item of appointment.itemsToPickup) {
      if (item.individualProduct) {
        await IndividualProduct.findByIdAndUpdate(item.individualProduct, {
          assignedLocker: newLockerNumber
        });
      }
    }

    // Sincronizar con el servicio de asignación de casilleros
    try {
      await lockerAssignmentService.syncFromAppointments(appointment.scheduledDate);
    } catch (syncError) {
      if (isDev) console.error('⚠️ Error sincronizando casilleros:', syncError);
    }

    res.json({
      message: 'Reserva actualizada exitosamente',
      appointment: {
        _id: appointment._id,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        lockerNumber: newLockerNumber
      }
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cancelar una cita del usuario
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user.id
    }).populate('itemsToPickup.individualProduct')
      .populate('itemsToPickup.originalProduct');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // No permitir cancelar citas completadas
    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'No se puede cancelar una cita completada' });
    }

    // No permitir cancelar citas en el pasado
    if (appointment.isPast()) {
      return res.status(400).json({ error: 'No se puede cancelar una cita en el pasado' });
    }

    if (isDev) console.log('🔄 Cancelando reserva:', appointmentId);
    if (isDev) console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);

    // Liberar productos individuales que estaban reservados
    const liberatedProducts = [];
    for (const pickupItem of appointment.itemsToPickup) {
      try {
        const itemDoc = pickupItem._doc || pickupItem;
        const individualProductId = itemDoc.individualProduct;
        const originalProduct = itemDoc.originalProduct;

        if (isDev) console.log(`🔍 Buscando producto individual para: ${originalProduct?.nombre || 'Producto sin nombre'}`);
        if (isDev) console.log(`   IndividualProduct ID: ${individualProductId}`);
        if (isDev) console.log(`   Casillero: ${itemDoc.lockerNumber}`);

        // Buscar el producto individual directamente por su ID
        let individualProduct = await IndividualProduct.findById(individualProductId);

        // Si no se encuentra por ID, buscar por criterios alternativos
        if (!individualProduct) {
          if (isDev) console.log(`⚠️ No se encontró por ID, buscando por criterios alternativos...`);
          individualProduct = await IndividualProduct.findOne({
            product: originalProduct?._id || originalProduct,
            user: req.user.id,
            status: 'reserved',
            assignedLocker: itemDoc.lockerNumber
          });
        }

        if (individualProduct) {
          if (isDev) console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
          if (isDev) console.log(`   Estado actual: ${individualProduct.status}`);
          if (isDev) console.log(`   Casillero asignado: ${individualProduct.assignedLocker}`);

          // Liberar el producto individual
          individualProduct.status = 'available';
          individualProduct.assignedLocker = undefined;
          individualProduct.reservedAt = undefined;
          await individualProduct.save();

          liberatedProducts.push({
            productId: individualProduct._id,
            productName: originalProduct?.nombre || 'Producto sin nombre',
            lockerNumber: itemDoc.lockerNumber,
            originalStatus: individualProduct.status
          });

          const productName = originalProduct?.nombre || 'Producto sin nombre';
          if (isDev) console.log(`✅ Producto liberado: ${productName}`);
        } else {
          const productName = originalProduct?.nombre || 'Producto sin nombre';
          if (isDev) console.log(`❌ No se encontró ningún producto individual para: ${productName}`);

          // Debug: mostrar todos los productos individuales para este producto
          if (originalProduct?._id) {
            const allIndividualProducts = await IndividualProduct.find({
              product: originalProduct._id,
              user: req.user.id
            });

            if (isDev) console.log(`🔍 Productos individuales encontrados para ${productName}:`, allIndividualProducts.length);
            allIndividualProducts.forEach((ip, index) => {
              if (isDev) console.log(`   ${index + 1}. ID: ${ip._id}, Estado: ${ip.status}, Casillero: ${ip.assignedLocker}`);
            });
          } else {
            if (isDev) console.log(`⚠️ No se puede buscar productos individuales: originalProduct es null`);
          }
        }
      } catch (productError) {
        const productName = originalProduct?.nombre || 'Producto sin nombre';
        console.error(`❌ Error liberando producto ${productName}:`, productError);
      }
    }

    // Marcar la cita como cancelada
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = 'user';
    appointment.cancellationReason = reason;

    await appointment.save();

    // Sincronizar estado de locker assignments -> cancelled
    try {
      await LockerAssignment.updateMany(
        { appointmentId: appointment._id.toString() },
        { $set: { status: 'cancelled' } }
      );
    } catch (syncErr) {
      console.error('⚠️ Error sincronizando estado de assignments (cancelled):', syncErr);
    }

    if (isDev) console.log(`✅ Reserva cancelada exitosamente. ${liberatedProducts.length} productos liberados.`);

    res.json({
      message: `Cita cancelada exitosamente. ${liberatedProducts.length} productos han sido liberados.`,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        cancelledAt: appointment.cancelledAt
      },
      liberatedProducts: liberatedProducts
    });

  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ===== ADMIN ENDPOINTS =====

// Obtener todas las citas (admin)
exports.getAllAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (date) {
      const selectedDate = createLocalDate(date);
      const nextDay = getNextDayColombia(selectedDate);

      query.scheduledDate = {
        $gte: selectedDate,
        $lt: nextDay
      };

      if (isDev) console.log('🔍 getAllAppointments - Fecha solicitada:', date);
      if (isDev) console.log('🔍 getAllAppointments - Rango UTC:', selectedDate.toISOString(), '->', nextDay.toISOString());
    }

    const appointments = await Appointment.find(query)
      .populate('user', 'nombre email telefono')
      .populate('order', 'total_amount status')
      .populate({
        path: 'itemsToPickup.individualProduct',
        populate: {
          path: 'product',
          select: 'nombre imagen_url dimensiones variants'
        }
      })
      .populate('itemsToPickup.originalProduct', 'nombre imagen_url dimensiones variants')
      .sort({ scheduledDate: 1, timeSlot: 1 });

    // Agregar dimensiones calculadas a cada item
    const appointmentsWithDimensions = (appointments || []).map(appointment => {
      const appointmentObj = appointment.toObject ? appointment.toObject() : appointment;
      const itemsToProcess = (appointmentObj.itemsToPickup || []).filter(item => {
        const isValid = item && item.individualProduct && item.originalProduct;
        if (!isValid && isDev) {
          console.warn(`⚠️ [getAllAppointments] Filtrando item nulo o incompleto en cita ${appointmentObj._id}`);
        }
        return isValid;
      });

      appointmentObj.itemsToPickup = itemsToProcess.map(item => {
        // Calcular dimensiones basadas en el producto individual
        let dimensiones = null;
        let volumen = null;

        if (item.individualProduct && item.individualProduct.dimensiones) {
          dimensiones = item.individualProduct.dimensiones;
          volumen = dimensiones.largo * dimensiones.ancho * dimensiones.alto;
        } else if (item.originalProduct && item.originalProduct.dimensiones) {
          dimensiones = item.originalProduct.dimensiones;
          volumen = dimensiones.largo * dimensiones.ancho * dimensiones.alto;
        }

        return {
          ...item,
          dimensiones: dimensiones,
          volumen: volumen
        };
      });
      return appointmentObj;
    });

    if (isDev) console.log('🔍 getAllAppointments - Citas encontradas:', appointmentsWithDimensions.length);
    if (appointmentsWithDimensions.length > 0) {
      if (isDev) console.log('🔍 getAllAppointments - Primera cita:', {
        id: appointmentsWithDimensions[0]._id,
        scheduledDate: appointmentsWithDimensions[0].scheduledDate,
        timeSlot: appointmentsWithDimensions[0].timeSlot,
        user: appointmentsWithDimensions[0].user?.nombre,
        itemsCount: appointmentsWithDimensions[0].itemsToPickup.length
      });

      // Log del primer item para debug
      if (appointmentsWithDimensions[0].itemsToPickup.length > 0) {
        const firstItem = appointmentsWithDimensions[0].itemsToPickup[0];
        if (isDev) console.log('🔍 getAllAppointments - Primer item:', {
          individualProduct: firstItem.individualProduct?._id,
          originalProduct: firstItem.originalProduct?._id,
          individualProductDimensions: firstItem.individualProduct?.dimensiones,
          originalProductDimensions: firstItem.originalProduct?.dimensiones,
          individualProductName: firstItem.individualProduct?.product?.nombre,
          originalProductName: firstItem.originalProduct?.nombre,
          calculatedDimensiones: firstItem.dimensiones,
          calculatedVolumen: firstItem.volumen
        });
      }
    }

    res.json(appointmentsWithDimensions);
  } catch (error) {
    console.error('Error al obtener todas las citas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar estado de una cita (admin)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    const appointment = await Appointment.findById(appointmentId)
      .populate('user', 'nombre email')
      .populate('order', 'status')
      .populate('itemsToPickup.individualProduct')
      .populate('itemsToPickup.originalProduct');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Si se está cancelando la cita, liberar productos individuales
    if (status === 'cancelled' && appointment.status !== 'cancelled') {
      if (isDev) console.log('🔄 Cancelando reserva desde admin:', appointmentId);
      if (isDev) console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);

      // Liberar productos individuales que estaban reservados
      const liberatedProducts = [];
      for (const pickupItem of appointment.itemsToPickup) {
        try {
          const itemDoc = pickupItem._doc || pickupItem;
          const individualProductId = itemDoc.individualProduct;
          const originalProduct = itemDoc.originalProduct;

          // Buscar el producto individual directamente por su ID
          let individualProduct = await IndividualProduct.findById(individualProductId);

          // Si no se encuentra por ID, buscar por criterios alternativos
          if (!individualProduct) {
            individualProduct = await IndividualProduct.findOne({
              product: originalProduct?._id || originalProduct,
              user: appointment.user._id,
              status: 'reserved',
              assignedLocker: itemDoc.lockerNumber
            });
          }

          if (individualProduct) {
            if (isDev) console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);

            // Liberar el producto individual
            individualProduct.status = 'available';
            individualProduct.assignedLocker = undefined;
            individualProduct.reservedAt = undefined;
            await individualProduct.save();

            liberatedProducts.push({
              productId: individualProduct._id,
              productName: originalProduct?.nombre || 'Producto sin nombre',
              lockerNumber: itemDoc.lockerNumber
            });

            if (isDev) console.log(`✅ Producto liberado: ${originalProduct?.nombre || 'Producto sin nombre'}`);
          } else {
            if (isDev) console.log(`⚠️ No se encontró producto individual para: ${originalProduct?.nombre || 'Producto sin nombre'}`);
          }
        } catch (productError) {
          console.error(`❌ Error liberando producto:`, productError);
        }
      }

      if (isDev) console.log(`✅ Reserva cancelada desde admin. ${liberatedProducts.length} productos liberados.`);
    }

    // Actualizar estado
    appointment.status = status;

    // Actualizar fechas según el estado
    if (status === 'confirmed') {
      appointment.confirmedAt = new Date();
    } else if (status === 'completed') {
      appointment.completedAt = new Date();

      // Marcar la orden como recogida si todas las citas están completadas
      const pendingAppointments = await Appointment.find({
        order: appointment.order._id,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (pendingAppointments.length === 0) {
        appointment.order.status = 'picked_up';
        await appointment.order.save();
      }
    } else if (status === 'cancelled') {
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = 'admin';
    }

    if (notes) {
      appointment.notes = notes;
    }

    await appointment.save();

    // Mapear estado de cita -> estado de assignment
    const mapStatus = (s) => {
      switch (s) {
        case 'scheduled': return 'reserved';
        case 'confirmed': return 'active';
        case 'completed': return 'completed';
        case 'cancelled': return 'cancelled';
        default: return 'reserved';
      }
    };
    try {
      await LockerAssignment.updateMany(
        { appointmentId: appointment._id.toString() },
        { $set: { status: mapStatus(status) } }
      );
    } catch (syncErr) {
      console.error('⚠️ Error sincronizando estado de assignments (updateAppointmentStatus):', syncErr);
    }

    // Sincronizar automáticamente con locker assignments
    try {
      if (isDev) console.log('🔄 Sincronizando automáticamente con locker assignments después de actualizar estado...');
      await lockerAssignmentService.syncFromAppointments(appointment.scheduledDate);
      if (isDev) console.log('✅ Sincronización automática completada');
    } catch (syncError) {
      console.error('⚠️ Error en sincronización automática:', syncError);
      // No fallar la actualización por errores de sincronización
    }

    res.json({
      message: 'Estado de cita actualizado exitosamente',
      appointment: {
        id: appointment._id,
        status: appointment.status,
        user: appointment.user.nombre,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot
      }
    });

  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de citas (admin)
exports.getAppointmentStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = {
      total: await Appointment.countDocuments(),
      today: await Appointment.countDocuments({
        scheduledDate: {
          $gte: today,
          $lt: tomorrow
        }
      }),
      byStatus: {
        scheduled: await Appointment.countDocuments({ status: 'scheduled' }),
        confirmed: await Appointment.countDocuments({ status: 'confirmed' }),
        completed: await Appointment.countDocuments({ status: 'completed' }),
        cancelled: await Appointment.countDocuments({ status: 'cancelled' }),
        no_show: await Appointment.countDocuments({ status: 'no_show' })
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas de citas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar una cita (admin)
exports.deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('order', 'status')
      .populate('itemsToPickup.individualProduct')
      .populate('itemsToPickup.originalProduct');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // No permitir eliminar citas completadas
    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'No se puede eliminar una cita completada' });
    }

    if (isDev) console.log('🗑️ Eliminando reserva (admin):', appointmentId);
    if (isDev) console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);

    // Liberar productos individuales que estaban reservados
    const liberatedProducts = [];
    for (const pickupItem of appointment.itemsToPickup) {
      try {
        const itemDoc = pickupItem._doc || pickupItem;
        const individualProductId = itemDoc.individualProduct;
        const originalProduct = itemDoc.originalProduct;

        // Buscar el producto individual directamente por su ID
        let individualProduct = await IndividualProduct.findById(individualProductId);

        // Si no se encuentra por ID, buscar por criterios alternativos
        if (!individualProduct) {
          individualProduct = await IndividualProduct.findOne({
            product: originalProduct?._id || originalProduct,
            user: appointment.user,
            status: 'reserved',
            assignedLocker: itemDoc.lockerNumber
          });
        }

        if (individualProduct) {
          if (isDev) console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);

          // Liberar el producto individual
          individualProduct.status = 'available';
          individualProduct.assignedLocker = undefined;
          individualProduct.reservedAt = undefined;
          await individualProduct.save();

          liberatedProducts.push({
            productId: individualProduct._id,
            productName: originalProduct?.nombre || 'Producto sin nombre',
            lockerNumber: itemDoc.lockerNumber
          });

          if (isDev) console.log(`✅ Producto liberado: ${originalProduct?.nombre || 'Producto sin nombre'}`);
        } else {
          if (isDev) console.log(`⚠️ No se encontró producto individual para: ${originalProduct?.nombre || 'Producto sin nombre'}`);
        }
      } catch (productError) {
        console.error(`❌ Error liberando producto:`, productError);
      }
    }

    // Si la cita tiene productos asignados, liberar los casilleros en la orden
    if (appointment.order && appointment.itemsToPickup.length > 0) {
      const order = appointment.order;

      // Reducir la cantidad reclamada de los productos
      for (const pickupItem of appointment.itemsToPickup) {
        const itemDoc = pickupItem._doc || pickupItem;
        const originalProductId = itemDoc.originalProduct?._id || itemDoc.originalProduct;

        const orderItem = order.items.find(item =>
          item.product.toString() === originalProductId
        );

        if (orderItem) {
          orderItem.claimed_quantity = Math.max(0, (orderItem.claimed_quantity || 0) - pickupItem.quantity);

          // Si no quedan productos reclamados, liberar el casillero
          if (orderItem.claimed_quantity === 0) {
            orderItem.assigned_locker = undefined;
          }
        }
      }

      await order.save();
    }

    // Eliminar la cita
    await Appointment.findByIdAndDelete(appointmentId);

    if (isDev) console.log(`✅ Reserva eliminada exitosamente. ${liberatedProducts.length} productos liberados.`);

    res.json({
      message: `Cita eliminada exitosamente. ${liberatedProducts.length} productos han sido liberados.`,
      deletedAppointment: {
        id: appointment._id,
        user: appointment.user,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status
      },
      liberatedProducts: liberatedProducts
    });

  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Agregar productos a una reserva existente
exports.addProductsToAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { products } = req.body;

    // Bloquear si el usuario tiene reservas vencidas
    {
      const activeAppointments = await Appointment.find({
        user: req.user.id,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (activeAppointments.length > 0) {
        const now = new Date();
        if (isDev) {
          console.log('🔍 Verificando reservas vencidas (addProductsToAppointment)...');
          console.log('⏰ Hora actual:', now.toISOString());
        }

        const hasExpired = activeAppointments.some(app => {
          const appDate = new Date(app.scheduledDate);
          const [h, m] = (app.timeSlot || '00:00').split(':');
          appDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);

          if (isDev) {
            console.log(`📅 Reserva ${app._id}: ${appDate.toISOString()} (${app.scheduledDate} ${app.timeSlot})`);
            console.log(`   ¿Está vencida? ${appDate < now}`);
          }

          return appDate < now;
        });

        if (hasExpired) {
          if (isDev) console.log('❌ Usuario tiene reservas vencidas - BLOQUEANDO');
          return res.status(403).json({
            error: 'Tienes reservas vencidas. Primero edítalas o cancélalas antes de agregar productos.'
          });
        }

        if (isDev) console.log('✅ Usuario no tiene reservas vencidas - PERMITIENDO');
      }
    }

    if (isDev) {
      console.log('🔄 Agregando productos a reserva existente:', appointmentId);
      console.log('📦 Productos a agregar:', products);
    }

    // Validar datos requeridos
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos para agregar productos' });
    }

    // Verificar que la reserva existe y pertenece al usuario
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user.id,
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Reserva no encontrada o no disponible para modificación' });
    }

    // Validar que la reserva tenga al menos 1 hora de anticipación
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const now = new Date();
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    if (isDev) {
      console.log('appointmentDateTime:', appointmentDateTime, appointmentDateTime.getTime());
      console.log('now:', now, now.getTime());
      console.log('Diferencia (min):', diffMs / (1000 * 60));
    }
    if (diffMs < 58 * 60 * 1000) {
      return res.status(400).json({ error: 'No se pueden agregar productos a reservas con menos de 1 hora de anticipación. Por favor, crea una nueva reserva.' });
    }

    // Validar que los productos individuales existen y están disponibles
    const validProducts = [];
    for (const productData of products) {
      const individualProduct = await IndividualProduct.findOne({
        _id: productData.productId,
        user: req.user.id,
        status: 'available'
      }).populate('product');

      if (!individualProduct) {
        return res.status(400).json({ error: `Producto individual ${productData.productId} no encontrado o no disponible` });
      }

      if (individualProduct.status !== 'available') {
        return res.status(400).json({ error: `El producto ya está ${individualProduct.status}` });
      }

      // Calcular dimensiones y volumen considerando variantes
      const dims = typeof individualProduct.getVariantOrProductDimensions === 'function'
        ? individualProduct.getVariantOrProductDimensions()
        : (individualProduct.dimensiones || individualProduct.product?.dimensiones || null);
      const vol = typeof individualProduct.getVariantOrProductVolume === 'function'
        ? individualProduct.getVariantOrProductVolume()
        : (dims ? dims.largo * dims.ancho * dims.alto : null);

      validProducts.push({
        individualProduct: individualProduct._id, // Referencia al producto individual
        originalProduct: individualProduct.product._id, // Referencia al producto original
        quantity: productData.quantity || 1,
        lockerNumber: productData.lockerNumber,
        individualProductId: individualProduct._id,
        variants: individualProduct.variants ? Object.fromEntries(individualProduct.variants) : undefined,
        dimensiones: dims || undefined,
        volumen: vol || undefined
      });
    }

    // Marcar productos individuales como reservados
    for (const product of validProducts) {
      const individualProduct = await IndividualProduct.findById(product.individualProductId);
      if (individualProduct) {
        individualProduct.status = 'reserved';
        individualProduct.assignedLocker = product.lockerNumber;
        individualProduct.reservedAt = new Date();
        await individualProduct.save();
      }
    }

    // Agregar productos a la reserva existente
    const currentItems = appointment.itemsToPickup || [];
    appointment.itemsToPickup = [...currentItems, ...validProducts];

    await appointment.save();

    if (isDev) console.log(`✅ Agregados ${validProducts.length} productos a la reserva ${appointmentId}`);

    res.json({
      message: 'Productos agregados exitosamente a la reserva',
      appointment: {
        id: appointment._id,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        totalProducts: appointment.itemsToPickup.length
      },
      addedProducts: validProducts.length
    });

  } catch (error) {
    console.error('Error al agregar productos a la reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear múltiples reservas (una por casillero)
exports.createMultipleAppointments = async (req, res) => {
  try {
    const { appointments } = req.body;

    // Bloquear si el usuario tiene reservas vencidas antes de procesar múltiples
    {
      const userId = req.user.id;
      const activeAppointments = await Appointment.find({
        user: userId,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (activeAppointments.length > 0) {
        const now = new Date();
        if (isDev) {
          console.log('🔍 Verificando reservas vencidas (createMultipleAppointments)...');
          console.log('⏰ Hora actual:', now.toISOString());
        }

        const hasExpired = activeAppointments.some(app => {
          const appDate = new Date(app.scheduledDate);
          const [h, m] = (app.timeSlot || '00:00').split(':');
          appDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);

          if (isDev) {
            console.log(`📅 Reserva ${app._id}: ${appDate.toISOString()} (${app.scheduledDate} ${app.timeSlot})`);
            console.log(`   ¿Está vencida? ${appDate < now}`);
          }

          return appDate < now;
        });

        if (hasExpired) {
          if (isDev) console.log('❌ Usuario tiene reservas vencidas - BLOQUEANDO');
          return res.status(403).json({
            error: 'Tienes reservas vencidas. Primero edítalas o cancélalas antes de crear nuevas reservas.'
          });
        }

        if (isDev) console.log('✅ Usuario no tiene reservas vencidas - PERMITIENDO');
      }
    }

    if (isDev) console.log('🔍 Backend recibió múltiples reservas:', appointments);

    // Validar datos requeridos
    if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos para crear las reservas' });
    }

    const createdAppointments = [];
    const errors = [];

    // Procesar cada reserva
    for (const appointmentData of appointments) {
      try {
        const { orderId, scheduledDate, timeSlot, itemsToPickup } = appointmentData;

        // Validar datos requeridos para esta reserva
        if (!orderId || !scheduledDate || !timeSlot || !itemsToPickup || !Array.isArray(itemsToPickup)) {
          errors.push(`Reserva inválida: datos incompletos`);
          continue;
        }

        // Verificar que la orden existe y pertenece al usuario
        const order = await Order.findOne({
          _id: orderId,
          user: req.user.id,
          status: { $in: ['paid', 'ready_for_pickup'] }
        });

        if (!order) {
          errors.push(`Orden no encontrada o no disponible para reserva`);
          continue;
        }

        // Validar fecha y hora
        const selectedDate = createLocalDate(scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Verificar penalización por reserva vencida (temporal - 24 horas)
        const user = await User.findById(req.user.id);
        if (user && user.reservationPenalties) {
          const currentTime = new Date();
          const penalty = user.reservationPenalties.find(p => {
            const penaltyDate = new Date(p.date);
            penaltyDate.setHours(0, 0, 0, 0);
            const selectedDateNormalized = new Date(selectedDate);
            selectedDateNormalized.setHours(0, 0, 0, 0);

            // Solo aplicar penalización si es el mismo día y no han pasado 24 horas
            if (penaltyDate.getTime() === selectedDateNormalized.getTime()) {
              const penaltyTime = new Date(p.createdAt);
              const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);

              // Si han pasado menos de 24 horas, aplicar penalización
              if (hoursSincePenalty < 24) {
                return true;
              } else {
                return false;
              }
            }
            return false;
          });

          if (penalty) {
            errors.push(`No puedes reservar para este día (${selectedDate.toLocaleDateString('es-CO')}) porque tuviste una reserva vencida recientemente. La penalización expira en 24 horas.`);
            continue;
          }
        }

        if (selectedDate < today) {
          errors.push(`No se pueden agendar citas en fechas pasadas`);
          continue;
        }

        // Validar que la fecha no sea más de 7 días adelante
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 7);
        maxDate.setHours(23, 59, 59, 999);

        if (selectedDate > maxDate) {
          errors.push(`No se pueden agendar citas con más de 7 días de anticipación`);
          continue;
        }

        // Validar que la reserva tenga al menos 1 hora de anticipación
        const now = new Date();
        const appointmentDateTime = new Date(selectedDate);
        const [hours, minutes] = timeSlot.split(':');
        appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const timeDifference = appointmentDateTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        if (hoursDifference < 1) {
          errors.push(`Solo se pueden crear reservas con al menos 1 hora de anticipación`);
          continue;
        }

        // Obtener casilleros para esta reserva
        const requestedLockers = itemsToPickup.map(item => item.lockerNumber);

        // Verificar disponibilidad de los casilleros específicos
        const availability = await Appointment.checkLockerAvailability(selectedDate, timeSlot, requestedLockers);
        if (!availability.available) {
          errors.push(`Casilleros ${availability.conflictingLockers.join(', ')} no disponibles en ${scheduledDate} a las ${timeSlot}`);
          continue;
        }

        // Validar que los productos individuales existen y están disponibles
        const validItems = [];
        for (const pickupItem of itemsToPickup) {
          // El frontend envía 'product' pero realmente es el ID del IndividualProduct
          const individualProduct = await IndividualProduct.findOne({
            _id: pickupItem.product,
            user: req.user.id,
            status: 'available'
          }).populate('product');

          if (!individualProduct) {
            errors.push(`Producto individual no encontrado o no disponible`);
            continue;
          }

          if (individualProduct.status !== 'available') {
            errors.push(`El producto ya está ${individualProduct.status}`);
            continue;
          }

          validItems.push({
            individualProduct: individualProduct._id,
            originalProduct: individualProduct.product._id,
            quantity: 1,
            lockerNumber: pickupItem.lockerNumber,
            individualProductId: individualProduct._id
          });
        }

        if (validItems.length === 0) {
          errors.push(`No hay productos válidos para esta reserva`);
          continue;
        }

        // Marcar productos individuales como reservados
        for (const item of validItems) {
          const individualProduct = await IndividualProduct.findById(item.individualProductId);
          if (individualProduct) {
            individualProduct.status = 'reserved';
            individualProduct.assignedLocker = item.lockerNumber;
            individualProduct.reservedAt = new Date();
            await individualProduct.save();
          }
        }

        // Crear la cita
        const appointment = new Appointment({
          user: req.user.id,
          order: orderId,
          scheduledDate: selectedDate,
          timeSlot,
          itemsToPickup: validItems
        });

        await appointment.save();

        // Actualizar estado de la orden si es necesario
        if (order.status === 'paid') {
          order.status = 'ready_for_pickup';
          await order.save();
        }

        createdAppointments.push({
          id: appointment._id,
          scheduledDate: appointment.scheduledDate,
          timeSlot: appointment.timeSlot,
          status: appointment.status,
          lockerNumber: requestedLockers[0] // Asumimos que todos los productos están en el mismo casillero
        });

        if (isDev) console.log(`✅ Reserva creada para casillero ${requestedLockers[0]} en ${scheduledDate} a las ${timeSlot}`);

      } catch (error) {
        console.error('Error al crear reserva individual:', error);
        errors.push(`Error interno al crear reserva: ${error.message}`);
      }
    }

    // Si hay errores pero también reservas creadas, devolver ambos
    if (errors.length > 0 && createdAppointments.length > 0) {
      return res.status(207).json({
        message: 'Algunas reservas se crearon exitosamente, pero hubo errores',
        appointments: createdAppointments,
        errors: errors
      });
    }

    // Si solo hay errores, devolver error
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Error al crear las reservas',
        details: errors
      });
    }

    // Todo exitoso
    res.status(201).json({
      message: 'Todas las reservas creadas exitosamente',
      appointments: createdAppointments
    });

  } catch (error) {
    console.error('Error al crear múltiples reservas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener casilleros disponibles para una fecha y hora específica
exports.getAvailableLockersForDateTime = async (req, res) => {
  try {
    const { date, timeSlot } = req.params;
    if (!date || !timeSlot) {
      return res.status(400).json({ error: 'Fecha y hora requeridas' });
    }
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }
    // Validar formato de hora
    if (!/^\d{2}:\d{2}$/.test(timeSlot)) {
      return res.status(400).json({ error: 'Formato de hora inválido' });
    }
    // Total de casilleros (ajustar si cambia el total)
    const totalLockers = 12;
    const allLockers = Array.from({ length: totalLockers }, (_, i) => i + 1);
    // Consultar ocupados
    const availability = await Appointment.checkLockerAvailability(selectedDate, timeSlot, allLockers);
    const occupied = availability.occupiedLockers;
    const available = allLockers.filter(num => !occupied.includes(num));
    res.json({
      date,
      timeSlot,
      total: totalLockers,
      occupied,
      available
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad de casilleros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para limpiar penalizaciones expiradas (se puede ejecutar manualmente o automáticamente)
exports.cleanExpiredPenalties = async (req, res) => {
  try {
    const User = require('../models/User');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (isDev) {
      console.log('🧹 Limpiando penalizaciones expiradas...');
      console.log(`⏰ Fecha límite: ${twentyFourHoursAgo.toLocaleString('es-CO')}`);
    }

    // Buscar usuarios con penalizaciones
    const usersWithPenalties = await User.find({
      'reservationPenalties.createdAt': { $lt: twentyFourHoursAgo }
    });

    let totalCleaned = 0;

    for (const user of usersWithPenalties) {
      const originalCount = user.reservationPenalties.length;

      // Filtrar penalizaciones que no han expirado
      user.reservationPenalties = user.reservationPenalties.filter(penalty => {
        const penaltyTime = new Date(penalty.createdAt);
        return penaltyTime >= twentyFourHoursAgo;
      });

      const newCount = user.reservationPenalties.length;
      const cleaned = originalCount - newCount;

      if (cleaned > 0) {
        await user.save();
        totalCleaned += cleaned;
        if (isDev) console.log(`✅ Usuario ${user.email}: ${cleaned} penalizaciones limpiadas`);
      }
    }

    if (isDev) console.log(`🎉 Limpieza completada: ${totalCleaned} penalizaciones expiradas eliminadas`);

    res.json({
      message: 'Limpieza de penalizaciones completada',
      totalCleaned,
      usersProcessed: usersWithPenalties.length
    });

  } catch (error) {
    console.error('Error al limpiar penalizaciones expiradas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Marcar una cita como completada (recogida)
exports.markAppointmentAsCompleted = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    if (isDev) console.log(`🔄 Marcando cita como completada: ${appointmentId} por usuario: ${userId}`);

    // Buscar la cita y verificar que pertenece al usuario
    const appointment = await Appointment.findById(appointmentId)
      .populate('user', 'nombre email')
      .populate('order', 'status')
      .populate('itemsToPickup.individualProduct')
      .populate('itemsToPickup.originalProduct');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (isDev) {
      console.log('📋 Cita encontrada:');
      console.log('  - ID:', appointment._id);
      console.log('  - Usuario:', appointment.user);
      console.log('  - Estado actual:', appointment.status);
      console.log('  - Fecha programada:', appointment.scheduledDate);
    }

    // Verificar que la cita pertenece al usuario autenticado
    if (isDev) {
      console.log('🔍 Debug de IDs:');
      console.log('  - appointment.user._id:', appointment.user._id);
      console.log('  - appointment.user._id.toString():', appointment.user._id.toString());
      console.log('  - userId (req.user.id):', userId);
      console.log('  - userId type:', typeof userId);
      console.log('  - Comparación:', appointment.user._id.toString() === userId);
    }

    // Convertir ambos IDs a string para comparación segura
    const appointmentUserId = appointment.user._id.toString();
    const authenticatedUserId = userId.toString();

    if (appointmentUserId !== authenticatedUserId) {
      if (isDev) console.log('❌ Usuario no autorizado para modificar esta cita');
      if (isDev) console.log(`  - ID de la cita: ${appointmentUserId}`);
      if (isDev) console.log(`  - ID del usuario autenticado: ${authenticatedUserId}`);
      return res.status(403).json({ error: 'No tienes permisos para modificar esta cita' });
    }

    if (isDev) console.log('✅ Usuario autorizado para modificar la cita');

    // Verificar que la cita esté en un estado válido para completar
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'No se puede completar una cita cancelada' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'La cita ya está marcada como completada' });
    }

    // Verificar que la fecha de la cita sea hoy o anterior
    const appointmentDate = new Date(appointment.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate > today) {
      return res.status(400).json({ 
        error: 'Solo se pueden completar citas de fechas pasadas o de hoy' 
      });
    }

    // Marcar la cita como completada
    appointment.status = 'completed';
    appointment.completedAt = new Date();

    // Liberar los casilleros y productos individuales
    if (isDev) {
      console.log('🔓 Liberando casilleros y productos...');
    }

    // Actualizar todos los productos individuales asociados a la cita en una sola operación
    const individualProductIds = appointment.itemsToPickup
      .filter(item => item.individualProduct)
      .map(item => item.individualProduct._id || item.individualProduct);

    if (individualProductIds.length > 0) {
      try {
        await IndividualProduct.updateMany(
          { _id: { $in: individualProductIds } },
          { 
            $set: { 
              status: 'picked_up',
              assignedLocker: undefined,
              reservedAt: undefined,
              pickedUpAt: new Date()
            } 
          }
        );
        if (isDev) console.log(`✅ ${individualProductIds.length} productos marcados como recogidos`);
      } catch (productError) {
        console.error(`❌ Error actualizando estados de productos individuales:`, productError);
      }
    }

    // Marcar la orden como recogida si todas las citas están completadas
    if (appointment.order) {
      const pendingAppointments = await Appointment.find({
        order: appointment.order._id,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (pendingAppointments.length === 0) {
        appointment.order.status = 'picked_up';
        await appointment.order.save();
        if (isDev) console.log(`✅ Orden ${appointment.order._id} marcada como recogida`);
      }
    }

    await appointment.save();

    // Sincronizar estado de locker assignments -> completed
    try {
      await LockerAssignment.updateMany(
        { appointmentId: appointment._id.toString() },
        { $set: { status: 'completed' } }
      );
    } catch (syncErr) {
      console.error('⚠️ Error sincronizando estado de assignments (completed):', syncErr);
    }

    if (isDev) console.log(`✅ Cita ${appointmentId} marcada como completada exitosamente`);

    res.json({
      success: true,
      message: 'Cita marcada como completada exitosamente',
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        completedAt: appointment.completedAt,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        itemsToPickup: appointment.itemsToPickup
      }
    });

  } catch (error) {
    console.error('Error al marcar cita como completada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 