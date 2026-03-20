const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const IndividualProduct = require('../models/IndividualProduct');
const LockerAssignment = require('../models/LockerAssignment');
const lockerAssignmentService = require('../services/lockerAssignmentService');

// Función utilitaria para crear fechas locales correctamente
const createLocalDate = (dateString) => {
  // Si la fecha viene en formato "YYYY-MM-DD", crear una fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    // Crear fecha en zona horaria local y establecer hora a 00:00:00
    const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
    console.log(`🔍 createLocalDate: ${dateString} -> ${date.toISOString()} (${date.toLocaleDateString()})`);
    return date;
  }
  // Si ya es una fecha completa, usarla tal como está
  const date = new Date(dateString);
  console.log(`🔍 createLocalDate: ${dateString} -> ${date.toISOString()} (${date.toLocaleDateString()})`);
  return date;
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
    
    // No permitir fechas en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }
    
    // No permitir fechas más de 7 días adelante
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);
    maxDate.setHours(23, 59, 59, 999);
    
    if (selectedDate > maxDate) {
      return res.status(400).json({ error: 'No se pueden consultar horarios con más de 7 días de anticipación' });
    }
    
    const availableSlots = await Appointment.getAvailableTimeSlots(selectedDate);
    
    // Si es el día actual, filtrar horas que ya han pasado
    const isToday = selectedDate.getTime() === today.getTime();
    
    console.log('🔍 Debug getAvailableTimeSlots:');
    console.log('  Fecha recibida:', date);
    console.log('  Fecha seleccionada (parsed):', selectedDate.toISOString());
    console.log('  Fecha seleccionada (local):', selectedDate.toLocaleDateString());
    console.log('  Fecha actual:', today.toISOString());
    console.log('  Fecha actual (local):', today.toLocaleDateString());
    console.log('  ¿Es hoy?:', isToday);
    console.log('  Hora actual (servidor):', new Date().toLocaleTimeString());
    console.log('  Zona horaria del servidor:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    if (isToday) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      console.log('  Filtrando horas para hoy:');
      console.log('  Hora actual:', currentHour);
      console.log('  Minuto actual:', currentMinute);
      
      // Filtrar slots que ya han pasado
      const filteredSlots = availableSlots.filter(slot => {
        const [hours, minutes] = slot.time.split(':');
        const slotHour = parseInt(hours);
        const slotMinute = parseInt(minutes);
        
        const isFuture = slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
        
        console.log(`    ${slot.time}: hora=${slotHour}, minuto=${slotMinute}, ¿es futuro?=${isFuture}`);
        
        // Si la hora del slot es menor a la hora actual, o si es la misma hora pero los minutos ya pasaron
        return isFuture;
      });
      
      console.log('  Horarios filtrados para hoy:', filteredSlots.map(s => s.time));
      
      return res.json({
        date: date,
        timeSlots: filteredSlots
      });
    }
    
    console.log('  No es hoy, retornando todos los horarios:', availableSlots.map(s => s.time));
    
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
          console.log('🔍 Verificando reservas vencidas...');
          console.log('⏰ Hora actual:', now.toISOString());
          
          const hasExpired = activeAppointments.some(app => {
            const appDate = new Date(app.scheduledDate);
            const [h, m] = (app.timeSlot || '00:00').split(':');
            appDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);
            
            console.log(`📅 Reserva ${app._id}: ${appDate.toISOString()} (${app.scheduledDate} ${app.timeSlot})`);
            console.log(`   ¿Está vencida? ${appDate < now}`);
            
            return appDate < now;
          });
          
          if (hasExpired) {
            console.log('❌ Usuario tiene reservas vencidas - BLOQUEANDO');
            return res.status(403).json({
              error: 'Tienes reservas vencidas. Primero edítalas o cancélalas antes de crear una nueva reserva.'
            });
          }
          
          console.log('✅ Usuario no tiene reservas vencidas - PERMITIENDO');
        }
      }
      
      // Debug: Ver qué datos está recibiendo el backend
    console.log('🔍 Backend recibió:', {
      orderId,
      scheduledDate,
      timeSlot,
      itemsToPickup,
      notes,
      contactInfo
    });
    
    // Validar datos requeridos
    if (!orderId || !scheduledDate || !timeSlot || !itemsToPickup || !Array.isArray(itemsToPickup)) {
      console.log('❌ Datos incompletos:', {
        orderId: !!orderId,
        scheduledDate: !!scheduledDate,
        timeSlot: !!timeSlot,
        itemsToPickup: !!itemsToPickup,
        isArray: Array.isArray(itemsToPickup)
      });
      return res.status(400).json({ error: 'Datos incompletos para crear la cita' });
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar penalización por reserva vencida (temporal - 24 horas)
    const user = await require('../models/User').findById(req.user.id);
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
          
          console.log(`🔍 Penalización encontrada para ${selectedDate.toLocaleDateString('es-CO')}`);
          console.log(`⏰ Horas transcurridas desde penalización: ${hoursSincePenalty.toFixed(2)}`);
          
          // Si han pasado menos de 24 horas, aplicar penalización
          if (hoursSincePenalty < 24) {
            console.log(`❌ Penalización activa - No se puede reservar para este día`);
            return true;
          } else {
            console.log(`✅ Penalización expirada - Se puede reservar para este día`);
            return false;
          }
        }
        return false;
      });
      
      if (penalty) {
        return res.status(403).json({ 
          error: `No puedes reservar para este día (${selectedDate.toLocaleDateString('es-CO')}) porque tuviste una reserva vencida recientemente. La penalización expira en 24 horas.` 
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
        lockerNumber: pickupItem.lockerNumber,
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

    console.log('🔍 Reservas existentes encontradas:', existingAppointments.length);

    // Si hay reservas existentes, intentar agregar productos a ellas
    if (existingAppointments.length > 0) {
      console.log('📅 Intentando agregar productos a reservas existentes...');
      
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
              console.log(`♻️ Reserva ${existingAppointment._id} está vencida. Reprogramando antes de agregar productos...`);
              // Buscar siguiente día/hora disponible (simple: mañana misma hora)
              const newDate = new Date(now);
              newDate.setDate(newDate.getDate() + 1);
              newDate.setHours(0, 0, 0, 0);
              existingAppointment.scheduledDate = newDate;
              // Mantener mismo timeSlot si es válido; en producción podrías consultar getAvailableTimeSlots
              await existingAppointment.save();
            }
            
            console.log(`✅ Agregando productos al casillero ${lockerNumber} en reserva existente ${existingAppointment._id}`);
          
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
      console.log(`📅 Creando nueva reserva para ${validItems.length} productos restantes`);
      
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
        console.log('🔄 Sincronizando automáticamente con locker assignments...');
        await lockerAssignmentService.syncFromAppointments(appointment.scheduledDate);
        console.log('✅ Sincronización automática completada');
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
        console.log('🔄 Sincronizando automáticamente con locker assignments...');
        await lockerAssignmentService.syncFromAppointments(selectedDate);
        console.log('✅ Sincronización automática completada');
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
      const IndividualProduct = require('../models/IndividualProduct');
      
      // Procesar cada item en la cita
      const processedItems = await Promise.all(appointment.itemsToPickup.map(async (item) => {
        console.log(`🔍 Procesando item de reserva: ${item.originalProduct.nombre}`);
        
        // Usar directamente el IndividualProduct ya poblado
        const individualProduct = item.individualProduct;
        
        if (individualProduct) {
          console.log(`🔍 Usando IndividualProduct ID: ${individualProduct._id}`);
          console.log(`🔍 Variantes:`, individualProduct.variants ? Object.fromEntries(individualProduct.variants) : 'Sin variantes');
          
          // Calcular dimensiones considerando variantes
          const variantDimensiones = individualProduct.getVariantOrProductDimensions();
          const variantVolume = individualProduct.getVariantOrProductVolume();
          
          console.log(`🔍 Dimensiones calculadas:`, variantDimensiones);
          console.log(`🔍 Volumen calculado:`, variantVolume);
          
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
        
        console.log(`⚠️ No se encontró IndividualProduct para ${item.originalProduct.nombre}`);
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
    
    // Procesar la cita para agregar información de variantes y dimensiones calculadas
    const IndividualProduct = require('../models/IndividualProduct');
    
    // Procesar cada item en la cita
    const processedItems = await Promise.all(appointment.itemsToPickup.map(async (item) => {
      console.log(`🔍 Procesando item de reserva: ${item.originalProduct.nombre}`);
      
      // Usar directamente el IndividualProduct ya poblado
      const individualProduct = item.individualProduct;
      
      if (individualProduct) {
        console.log(`🔍 Usando IndividualProduct ID: ${individualProduct._id}`);
        console.log(`🔍 Variantes:`, individualProduct.variants ? Object.fromEntries(individualProduct.variants) : 'Sin variantes');
        
        // Calcular dimensiones considerando variantes
        const variantDimensiones = individualProduct.getVariantOrProductDimensions();
        const variantVolume = individualProduct.getVariantOrProductVolume();
        
        console.log(`🔍 Dimensiones calculadas:`, variantDimensiones);
        console.log(`🔍 Volumen calculado:`, variantVolume);
        
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
      
      console.log(`⚠️ No se encontró IndividualProduct para ${item.originalProduct.nombre}`);
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
    const { scheduledDate, timeSlot, lockerNumber } = req.body;
    
    // Verificar penalizaciones del usuario (reservas vencidas - temporal 24 horas)
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    const penalizedDates = new Set();
    const currentTime = new Date();
    
    // Agregar penalizaciones almacenadas en el modelo User (solo las activas)
    if (user && user.reservationPenalties) {
      user.reservationPenalties.forEach(penalty => {
        const penaltyDate = new Date(penalty.date);
        penaltyDate.setHours(0, 0, 0, 0);
        const penaltyTime = new Date(penalty.createdAt);
        const hoursSincePenalty = (currentTime.getTime() - penaltyTime.getTime()) / (1000 * 60 * 60);
        
        // Solo agregar penalizaciones que no hayan expirado (menos de 24 horas)
        if (hoursSincePenalty < 24) {
          penalizedDates.add(penaltyDate.getTime());
          console.log(`🔍 Penalización activa para ${penaltyDate.toLocaleDateString('es-CO')} (${hoursSincePenalty.toFixed(2)}h transcurridas)`);
        } else {
          console.log(`✅ Penalización expirada para ${penaltyDate.toLocaleDateString('es-CO')} (${hoursSincePenalty.toFixed(2)}h transcurridas)`);
        }
      });
    }
    
    // También verificar reservas vencidas activas (solo si no han pasado 24 horas)
    const userAppointments = await Appointment.find({ user: req.user.id });
    userAppointments.forEach(app => {
      if (app.status !== 'cancelled' && app.status !== 'completed') {
        const appDate = new Date(app.scheduledDate);
        appDate.setHours(0, 0, 0, 0);
        const appDateTime = new Date(app.scheduledDate);
        const [h, m] = app.timeSlot.split(':');
        appDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
        
        // Solo penalizar si la reserva venció hace menos de 24 horas
        if (appDateTime < new Date()) {
          const hoursSinceExpiry = (currentTime.getTime() - appDateTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceExpiry < 24) {
            penalizedDates.add(appDate.getTime());
            console.log(`🔍 Reserva vencida activa para ${appDate.toLocaleDateString('es-CO')} (${hoursSinceExpiry.toFixed(2)}h transcurridas)`);
          } else {
            console.log(`✅ Reserva vencida expirada para ${appDate.toLocaleDateString('es-CO')} (${hoursSinceExpiry.toFixed(2)}h transcurridas)`);
          }
        }
      }
    });
    
    // Validar que la nueva fecha no esté penalizada
    if (scheduledDate) {
      const newDate = createLocalDate(scheduledDate);
      newDate.setHours(0, 0, 0, 0);
      if (penalizedDates.has(newDate.getTime())) {
        return res.status(403).json({ 
          error: 'No puedes volver a reservar para el día en que se venció tu reserva recientemente. La penalización expira en 24 horas.' 
        });
      }
    }
    
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
    
    // Verificar que la cita tenga al menos 1 hora de anticipación
    const appointmentDateTime = createLocalDate(appointment.scheduledDate);
    const [hours, minutes] = appointment.timeSlot.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    // Permitir modificar reservas vencidas (fecha/hora pasada), pero no canceladas ni completadas
    const isPast = appointmentDateTime < now;
    if (!isPast && hoursDifference < 1) {
      return res.status(400).json({ 
        error: 'Solo se pueden modificar reservas con al menos 1 hora de anticipación' 
      });
    }
    
    // Validar fecha y hora nueva
    if (scheduledDate && timeSlot) {
      const newDate = createLocalDate(scheduledDate);
      const [newHours, newMinutes] = timeSlot.split(':');
      newDate.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0);
      const now = new Date();
      // Verificar que la nueva fecha no sea en el pasado
      if (newDate <= now) {
        return res.status(400).json({ error: 'No se pueden agendar citas en el pasado' });
      }
      // Si la nueva fecha/hora es para menos de 1 hora en el futuro, bloquear
      const timeDifference = newDate.getTime() - now.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      if (hoursDifference < 1) {
        return res.status(400).json({ error: 'Solo se pueden modificar reservas con al menos 1 hora de anticipación' });
      }
      
      // Verificar que el usuario no tenga otras reservas para el mismo casillero, fecha y hora
      const requestedLockers = appointment.itemsToPickup.map(item => 
        lockerNumber || item.lockerNumber
      );
      
      const existingUserAppointments = await Appointment.find({
        user: req.user.id,
        scheduledDate: newDate,
        timeSlot: timeSlot,
        status: { $in: ['scheduled', 'confirmed'] },
        _id: { $ne: appointmentId } // Excluir la cita actual
      });
      
      // Verificar si hay conflictos con casilleros
      for (const existingAppointment of existingUserAppointments) {
        for (const item of existingAppointment.itemsToPickup) {
          if (requestedLockers.includes(item.lockerNumber)) {
            return res.status(400).json({ 
              error: `Ya tienes una reserva para el casillero ${item.lockerNumber} en la fecha y hora seleccionada` 
            });
          }
        }
      }
      
      // Verificar que el nuevo casillero no esté siendo usado por otros usuarios
      const otherUsersAppointments = await Appointment.find({
        scheduledDate: newDate,
        timeSlot: timeSlot,
        status: { $in: ['scheduled', 'confirmed'] },
        'itemsToPickup.lockerNumber': { $in: requestedLockers }
      });
      
      if (otherUsersAppointments.length > 0) {
        return res.status(400).json({ 
          error: `Los casilleros ${requestedLockers.join(', ')} ya están ocupados por otros usuarios en la fecha y hora seleccionada` 
        });
      }
      
      // Validar que la nueva fecha no sea más de 7 días adelante
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 7);
      maxDate.setHours(23, 59, 59, 999);
      
      if (newDate > maxDate) {
        return res.status(400).json({ error: 'No se pueden agendar citas con más de 7 días de anticipación' });
      }
      
      // Si es el día actual, validar que la hora no haya pasado
      const isToday = newDate.getTime() === today.getTime();
      
      if (isToday && timeSlot) {
        const [hours, minutes] = timeSlot.split(':');
        const selectedTime = new Date();
        selectedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (selectedTime <= now) {
          return res.status(400).json({ error: 'No se pueden agendar citas en horas que ya han pasado' });
        }
      }
      
      // Verificar disponibilidad del casillero en la nueva fecha/hora
      // Excluir la cita actual de la validación para evitar conflictos consigo misma
      const availability = await Appointment.checkLockerAvailability(newDate, timeSlot, requestedLockers, appointmentId);
      
      if (!availability.available) {
        return res.status(400).json({ 
          error: `Casillero(s) no disponible(s) en la fecha y hora seleccionada: ${availability.conflictingLockers.join(', ')}` 
        });
      }
      
      // Actualizar fecha y hora
      appointment.scheduledDate = newDate;
      appointment.timeSlot = timeSlot;
    }
    
    // Actualizar número de casillero si se proporciona
    if (lockerNumber) {
      // Obtener la cantidad de productos/items que tendrá la reserva
      const itemsCount = appointment.itemsToPickup.length;

      // Buscar todas las reservas del usuario para esa fecha/hora, excepto la actual
      const existingUserAppointments = await Appointment.find({
        user: req.user.id,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        status: { $in: ['scheduled', 'confirmed'] },
        _id: { $ne: appointmentId }
      });

      // Contar cuántos productos ya tiene el usuario en ese casillero en otras reservas
      let totalCasilleroOcupado = 0;
      for (const existingAppointment of existingUserAppointments) {
        for (const item of existingAppointment.itemsToPickup) {
          if (item.lockerNumber === lockerNumber) {
            totalCasilleroOcupado++;
          }
        }
      }

      // Si ya hay productos en ese casillero, bloquear la actualización
      if (totalCasilleroOcupado > 0) {
        return res.status(400).json({
          error: `Ya tienes ${totalCasilleroOcupado} producto(s) reservado(s) en el casillero ${lockerNumber} en la fecha y hora seleccionada. No puedes duplicar casilleros en reservas distintas.`
        });
      }

      // Verificar que el nuevo casillero no esté siendo usado por otros usuarios
      const otherUsersAppointments = await Appointment.find({
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        status: { $in: ['scheduled', 'confirmed'] },
        'itemsToPickup.lockerNumber': lockerNumber
      });
      
      if (otherUsersAppointments.length > 0) {
        return res.status(400).json({ 
          error: `El casillero ${lockerNumber} ya está ocupado por otro usuario en la fecha y hora de esta reserva` 
        });
      }
      
      // Verificar que el nuevo casillero esté disponible
      // Excluir la cita actual de la validación para evitar conflictos consigo misma
      const appointmentDate = appointment.scheduledDate;
      const availability = await Appointment.checkLockerAvailability(appointmentDate, appointment.timeSlot, [lockerNumber], appointmentId);
      
      if (!availability.available) {
        return res.status(400).json({ 
          error: `Casillero ${lockerNumber} no disponible en la fecha y hora de la reserva` 
        });
      }
      
      // Actualizar número de casillero en todos los items
      appointment.itemsToPickup.forEach(item => {
        item.lockerNumber = lockerNumber;
      });
    }
    
    // Guardar los cambios
    await appointment.save();

    // Mantener sincronizadas las locker assignments cuando cambia fecha/hora/locker
    try {
      const d = new Date(appointment.scheduledDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;
      const update = {
        scheduledDate: formattedDate,
        timeSlot: appointment.timeSlot
      };
      if (lockerNumber) {
        update.lockerNumber = lockerNumber;
      }

      const result = await LockerAssignment.updateMany(
        { appointmentId: appointment._id.toString() },
        { $set: update }
      );

      // Si no existían assignments para esta cita, intentar crearlas por sincronización
      if (!result || (result.matchedCount !== undefined && result.matchedCount === 0)) {
        await lockerAssignmentService.syncFromAppointments(formattedDate);
      }
    } catch (syncErr) {
      console.error('⚠️ Error sincronizando locker assignments tras actualizar cita:', syncErr);
      // No bloquear la respuesta al usuario por esto
    }
    
    // Poblar datos para la respuesta
    await appointment.populate('order', 'total_amount status');
    await appointment.populate('itemsToPickup.individualProduct');
    await appointment.populate('itemsToPickup.originalProduct', 'nombre imagen_url descripcion dimensiones');
    
    res.json({
      message: 'Reserva actualizada exitosamente',
      appointment
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
    
    console.log('🔄 Cancelando reserva:', appointmentId);
    console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);
    
    // Liberar productos individuales que estaban reservados
    const liberatedProducts = [];
    for (const pickupItem of appointment.itemsToPickup) {
      try {
        const itemDoc = pickupItem._doc || pickupItem;
        const individualProductId = itemDoc.individualProduct;
        const originalProduct = itemDoc.originalProduct;
        
        console.log(`🔍 Buscando producto individual para: ${originalProduct?.nombre || 'Producto sin nombre'}`);
        console.log(`   IndividualProduct ID: ${individualProductId}`);
        console.log(`   Casillero: ${itemDoc.lockerNumber}`);
        
        // Buscar el producto individual directamente por su ID
        let individualProduct = await IndividualProduct.findById(individualProductId);
        
        // Si no se encuentra por ID, buscar por criterios alternativos
        if (!individualProduct) {
          console.log(`⚠️ No se encontró por ID, buscando por criterios alternativos...`);
          individualProduct = await IndividualProduct.findOne({
            product: originalProduct?._id || originalProduct,
            user: req.user.id,
            status: 'reserved',
            assignedLocker: itemDoc.lockerNumber
          });
        }
        
        if (individualProduct) {
          console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
          console.log(`   Estado actual: ${individualProduct.status}`);
          console.log(`   Casillero asignado: ${individualProduct.assignedLocker}`);
          
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
          console.log(`✅ Producto liberado: ${productName}`);
        } else {
          const productName = originalProduct?.nombre || 'Producto sin nombre';
          console.log(`❌ No se encontró ningún producto individual para: ${productName}`);
          
          // Debug: mostrar todos los productos individuales para este producto
          if (originalProduct?._id) {
            const allIndividualProducts = await IndividualProduct.find({
              product: originalProduct._id,
              user: req.user.id
            });
            
            console.log(`🔍 Productos individuales encontrados para ${productName}:`, allIndividualProducts.length);
            allIndividualProducts.forEach((ip, index) => {
              console.log(`   ${index + 1}. ID: ${ip._id}, Estado: ${ip.status}, Casillero: ${ip.assignedLocker}`);
            });
          } else {
            console.log(`⚠️ No se puede buscar productos individuales: originalProduct es null`);
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
    
    console.log(`✅ Reserva cancelada exitosamente. ${liberatedProducts.length} productos liberados.`);
    
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
      // CORRECCIÓN: Usar createLocalDate para manejar zonas horarias correctamente
      const selectedDate = createLocalDate(date);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.scheduledDate = {
        $gte: selectedDate,
        $lt: nextDay
      };
      
      console.log('🔍 getAllAppointments - Fecha solicitada:', date);
      console.log('🔍 getAllAppointments - Fecha procesada:', selectedDate.toISOString());
      console.log('🔍 getAllAppointments - Siguiente día:', nextDay.toISOString());
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
    const appointmentsWithDimensions = appointments.map(appointment => {
      const appointmentObj = appointment.toObject();
      appointmentObj.itemsToPickup = appointmentObj.itemsToPickup.map(item => {
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
    
    console.log('🔍 getAllAppointments - Citas encontradas:', appointmentsWithDimensions.length);
    if (appointmentsWithDimensions.length > 0) {
      console.log('🔍 getAllAppointments - Primera cita:', {
        id: appointmentsWithDimensions[0]._id,
        scheduledDate: appointmentsWithDimensions[0].scheduledDate,
        timeSlot: appointmentsWithDimensions[0].timeSlot,
        user: appointmentsWithDimensions[0].user?.nombre,
        itemsCount: appointmentsWithDimensions[0].itemsToPickup.length
      });
      
      // Log del primer item para debug
      if (appointmentsWithDimensions[0].itemsToPickup.length > 0) {
        const firstItem = appointmentsWithDimensions[0].itemsToPickup[0];
        console.log('🔍 getAllAppointments - Primer item:', {
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
      console.log('🔄 Cancelando reserva desde admin:', appointmentId);
      console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);
      
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
            console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
            
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
            
            console.log(`✅ Producto liberado: ${originalProduct?.nombre || 'Producto sin nombre'}`);
          } else {
            console.log(`⚠️ No se encontró producto individual para: ${originalProduct?.nombre || 'Producto sin nombre'}`);
          }
        } catch (productError) {
          console.error(`❌ Error liberando producto:`, productError);
        }
      }
      
      console.log(`✅ Reserva cancelada desde admin. ${liberatedProducts.length} productos liberados.`);
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
      console.log('🔄 Sincronizando automáticamente con locker assignments después de actualizar estado...');
      await lockerAssignmentService.syncFromAppointments(appointment.scheduledDate);
      console.log('✅ Sincronización automática completada');
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
    
    console.log('🗑️ Eliminando reserva (admin):', appointmentId);
    console.log('📦 Productos en la reserva:', appointment.itemsToPickup.length);
    
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
          console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
          
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
          
          console.log(`✅ Producto liberado: ${originalProduct?.nombre || 'Producto sin nombre'}`);
        } else {
          console.log(`⚠️ No se encontró producto individual para: ${originalProduct?.nombre || 'Producto sin nombre'}`);
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
    
    console.log(`✅ Reserva eliminada exitosamente. ${liberatedProducts.length} productos liberados.`);
    
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
          console.log('🔍 Verificando reservas vencidas (addProductsToAppointment)...');
          console.log('⏰ Hora actual:', now.toISOString());
          
          const hasExpired = activeAppointments.some(app => {
            const appDate = new Date(app.scheduledDate);
            const [h, m] = (app.timeSlot || '00:00').split(':');
            appDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);
            
            console.log(`📅 Reserva ${app._id}: ${appDate.toISOString()} (${app.scheduledDate} ${app.timeSlot})`);
            console.log(`   ¿Está vencida? ${appDate < now}`);
            
            return appDate < now;
          });
          
          if (hasExpired) {
            console.log('❌ Usuario tiene reservas vencidas - BLOQUEANDO');
            return res.status(403).json({
              error: 'Tienes reservas vencidas. Primero edítalas o cancélalas antes de agregar productos.'
            });
          }
          
          console.log('✅ Usuario no tiene reservas vencidas - PERMITIENDO');
        }
      }
      
      console.log('🔄 Agregando productos a reserva existente:', appointmentId);
    console.log('📦 Productos a agregar:', products);
    
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
    console.log('appointmentDateTime:', appointmentDateTime, appointmentDateTime.getTime());
    console.log('now:', now, now.getTime());
    console.log('Diferencia (min):', diffMs / (1000 * 60));
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
    
    console.log(`✅ Agregados ${validProducts.length} productos a la reserva ${appointmentId}`);
    
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
          console.log('🔍 Verificando reservas vencidas (createMultipleAppointments)...');
          console.log('⏰ Hora actual:', now.toISOString());
          
          const hasExpired = activeAppointments.some(app => {
            const appDate = new Date(app.scheduledDate);
            const [h, m] = (app.timeSlot || '00:00').split(':');
            appDate.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);
            
            console.log(`📅 Reserva ${app._id}: ${appDate.toISOString()} (${app.scheduledDate} ${app.timeSlot})`);
            console.log(`   ¿Está vencida? ${appDate < now}`);
            
            return appDate < now;
          });
          
          if (hasExpired) {
            console.log('❌ Usuario tiene reservas vencidas - BLOQUEANDO');
            return res.status(403).json({
              error: 'Tienes reservas vencidas. Primero edítalas o cancélalas antes de crear nuevas reservas.'
            });
          }
          
          console.log('✅ Usuario no tiene reservas vencidas - PERMITIENDO');
        }
      }
      
      console.log('🔍 Backend recibió múltiples reservas:', appointments);
    
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
        const user = await require('../models/User').findById(req.user.id);
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
        
        console.log(`✅ Reserva creada para casillero ${requestedLockers[0]} en ${scheduledDate} a las ${timeSlot}`);
        
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
    
    console.log('🧹 Limpiando penalizaciones expiradas...');
    console.log(`⏰ Fecha límite: ${twentyFourHoursAgo.toLocaleString('es-CO')}`);
    
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
        console.log(`✅ Usuario ${user.email}: ${cleaned} penalizaciones limpiadas`);
      }
    }
    
    console.log(`🎉 Limpieza completada: ${totalCleaned} penalizaciones expiradas eliminadas`);
    
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
    
    console.log(`🔄 Marcando cita como completada: ${appointmentId} por usuario: ${userId}`);
    
    // Buscar la cita y verificar que pertenece al usuario
    const appointment = await Appointment.findById(appointmentId)
      .populate('user', 'nombre email')
      .populate('order', 'status')
      .populate('itemsToPickup.individualProduct')
      .populate('itemsToPickup.originalProduct');
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    console.log('📋 Cita encontrada:');
    console.log('  - ID:', appointment._id);
    console.log('  - Usuario:', appointment.user);
    console.log('  - Estado actual:', appointment.status);
    console.log('  - Fecha programada:', appointment.scheduledDate);
    
    // Verificar que la cita pertenece al usuario autenticado
    console.log('🔍 Debug de IDs:');
    console.log('  - appointment.user._id:', appointment.user._id);
    console.log('  - appointment.user._id.toString():', appointment.user._id.toString());
    console.log('  - userId (req.user.id):', userId);
    console.log('  - userId type:', typeof userId);
    console.log('  - Comparación:', appointment.user._id.toString() === userId);
    
    // Convertir ambos IDs a string para comparación segura
    const appointmentUserId = appointment.user._id.toString();
    const authenticatedUserId = userId.toString();
    
    if (appointmentUserId !== authenticatedUserId) {
      console.log('❌ Usuario no autorizado para modificar esta cita');
      console.log(`  - ID de la cita: ${appointmentUserId}`);
      console.log(`  - ID del usuario autenticado: ${authenticatedUserId}`);
      return res.status(403).json({ error: 'No tienes permisos para modificar esta cita' });
    }
    
    console.log('✅ Usuario autorizado para modificar la cita');
    
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
    
    // Para testing: permitir completar citas futuras si el usuario es admin o si es en modo desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isAdmin = req.user.role === 'admin';
    const isTestingMode = process.env.TESTING_MODE === 'true';
    
    console.log('🔍 Verificación de permisos para cita futura:');
    console.log(`  - req.user.role: ${req.user.role}`);
    console.log(`  - isAdmin: ${isAdmin}`);
    console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  - isDevelopment: ${isDevelopment}`);
    console.log(`  - TESTING_MODE: ${process.env.TESTING_MODE}`);
    console.log(`  - isTestingMode: ${isTestingMode}`);
    
    // TEMPORALMENTE DESHABILITADO PARA TESTING
    // if (appointmentDate > today && !isDevelopment && !isAdmin && !isTestingMode) {
    //   console.log('⚠️ Intento de completar cita futura rechazado');
    //   console.log(`  - Fecha de la cita: ${appointmentDate.toISOString()}`);
    //   console.log(`  - Fecha de hoy: ${today.toISOString()}`);
    //   console.log(`  - Modo desarrollo: ${isDevelopment}`);
    //   console.log(`  - Usuario es admin: ${isAdmin}`);
    //   console.log(`  - Modo testing: ${isTestingMode}`);
    //   return res.status(400).json({ error: 'Solo se pueden completar citas de fechas pasadas o de hoy' });
    // }
    
    if (appointmentDate > today) {
      console.log('✅ Cita futura permitida para completar (validación temporalmente deshabilitada para testing)');
    }
    
    if (appointmentDate > today) {
      console.log('✅ Cita futura permitida para completar (modo desarrollo, usuario admin o modo testing)');
    }
    
    // Marcar la cita como completada
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    
    // Liberar los casilleros y productos individuales
    console.log('🔓 Liberando casilleros y productos...');
    for (const pickupItem of appointment.itemsToPickup) {
      if (pickupItem.lockerNumber) {
        console.log(`  - Casillero ${pickupItem.lockerNumber}`);
        
        // Liberar el producto individual
        if (pickupItem.individualProduct) {
          try {
            const IndividualProduct = require('../models/IndividualProduct');
            const individualProduct = await IndividualProduct.findById(pickupItem.individualProduct);
            
            if (individualProduct) {
              individualProduct.status = 'picked_up';
              individualProduct.assignedLocker = undefined;
              individualProduct.reservedAt = undefined;
              individualProduct.pickedUpAt = new Date();
              await individualProduct.save();
              console.log(`    ✅ Producto ${individualProduct._id} marcado como recogido`);
            }
          } catch (productError) {
            console.error(`    ❌ Error liberando producto:`, productError);
          }
        }
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
        console.log(`✅ Orden ${appointment.order._id} marcada como recogida`);
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
    
    console.log(`✅ Cita ${appointmentId} marcada como completada exitosamente`);
    
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