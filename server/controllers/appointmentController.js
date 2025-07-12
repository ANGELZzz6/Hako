const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const IndividualProduct = require('../models/IndividualProduct');

// Obtener horarios disponibles para una fecha
exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }
    
    // Validar formato de fecha
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }
    
    // No permitir fechas en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }
    
    const availableSlots = await Appointment.getAvailableTimeSlots(selectedDate);
    
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
    const selectedDate = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
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
      
      validItems.push({
        product: individualProduct.product._id,
        quantity: 1, // Siempre 1 para productos individuales
        lockerNumber: pickupItem.lockerNumber,
        individualProductId: individualProduct._id
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
        const existingAppointment = existingAppointments.find(app => 
          app.itemsToPickup.some(item => item.lockerNumber === lockerNumber)
        );

        if (existingAppointment) {
          console.log(`✅ Agregando productos al casillero ${lockerNumber} en reserva existente ${existingAppointment._id}`);
          
          // Agregar productos a la reserva existente
          for (const product of products) {
            existingAppointment.itemsToPickup.push({
              product: product.product,
              quantity: product.quantity,
              lockerNumber: product.lockerNumber
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
      .populate('itemsToPickup.product', 'nombre imagen_url descripcion dimensiones')
      .sort({ scheduledDate: 1, timeSlot: 1 });
    
    res.json(appointments);
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
    .populate('itemsToPickup.product', 'nombre imagen_url descripcion dimensiones');
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Error al obtener cita:', error);
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
    }).populate('itemsToPickup.product');
    
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
        // Buscar el producto individual por el ID del producto
        const individualProduct = await IndividualProduct.findOne({
          product: pickupItem.product._id,
          user: req.user.id,
          status: 'reserved',
          assignedLocker: pickupItem.lockerNumber
        });
        
        if (individualProduct) {
          console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
          
          // Liberar el producto individual
          individualProduct.status = 'available';
          individualProduct.assignedLocker = undefined;
          individualProduct.reservedAt = undefined;
          await individualProduct.save();
          
          liberatedProducts.push({
            productId: individualProduct._id,
            productName: pickupItem.product.nombre,
            lockerNumber: pickupItem.lockerNumber
          });
          
          console.log(`✅ Producto liberado: ${pickupItem.product.nombre}`);
        } else {
          console.log(`⚠️ No se encontró producto individual para: ${pickupItem.product.nombre}`);
        }
      } catch (productError) {
        console.error(`❌ Error liberando producto ${pickupItem.product.nombre}:`, productError);
      }
    }
    
    // Marcar la cita como cancelada
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = 'user';
    appointment.cancellationReason = reason;
    
    await appointment.save();
    
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
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.scheduledDate = {
        $gte: selectedDate,
        $lt: nextDay
      };
    }
    
    const appointments = await Appointment.find(query)
      .populate('user', 'nombre email telefono')
      .populate('order', 'total_amount status')
      .populate('itemsToPickup.product', 'nombre imagen_url')
      .sort({ scheduledDate: 1, timeSlot: 1 });
    
    res.json(appointments);
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
      .populate('itemsToPickup.product');
    
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
          // Buscar el producto individual por el ID del producto
          const individualProduct = await IndividualProduct.findOne({
            product: pickupItem.product._id,
            user: appointment.user._id,
            status: 'reserved',
            assignedLocker: pickupItem.lockerNumber
          });
          
          if (individualProduct) {
            console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
            
            // Liberar el producto individual
            individualProduct.status = 'available';
            individualProduct.assignedLocker = undefined;
            individualProduct.reservedAt = undefined;
            await individualProduct.save();
            
            liberatedProducts.push({
              productId: individualProduct._id,
              productName: pickupItem.product.nombre,
              lockerNumber: pickupItem.lockerNumber
            });
            
            console.log(`✅ Producto liberado: ${pickupItem.product.nombre}`);
          } else {
            console.log(`⚠️ No se encontró producto individual para: ${pickupItem.product.nombre}`);
          }
        } catch (productError) {
          console.error(`❌ Error liberando producto ${pickupItem.product.nombre}:`, productError);
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
      .populate('itemsToPickup.product');
    
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
        // Buscar el producto individual por el ID del producto
        const individualProduct = await IndividualProduct.findOne({
          product: pickupItem.product._id,
          user: appointment.user,
          status: 'reserved',
          assignedLocker: pickupItem.lockerNumber
        });
        
        if (individualProduct) {
          console.log(`🔓 Liberando producto individual: ${individualProduct._id}`);
          
          // Liberar el producto individual
          individualProduct.status = 'available';
          individualProduct.assignedLocker = undefined;
          individualProduct.reservedAt = undefined;
          await individualProduct.save();
          
          liberatedProducts.push({
            productId: individualProduct._id,
            productName: pickupItem.product.nombre,
            lockerNumber: pickupItem.lockerNumber
          });
          
          console.log(`✅ Producto liberado: ${pickupItem.product.nombre}`);
        } else {
          console.log(`⚠️ No se encontró producto individual para: ${pickupItem.product.nombre}`);
        }
      } catch (productError) {
        console.error(`❌ Error liberando producto ${pickupItem.product.nombre}:`, productError);
      }
    }
    
    // Si la cita tiene productos asignados, liberar los casilleros en la orden
    if (appointment.order && appointment.itemsToPickup.length > 0) {
      const order = appointment.order;
      
      // Reducir la cantidad reclamada de los productos
      for (const pickupItem of appointment.itemsToPickup) {
        const orderItem = order.items.find(item => 
          item.product.toString() === pickupItem.product._id
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
      
      validProducts.push({
        product: individualProduct.product._id,
        quantity: productData.quantity || 1,
        lockerNumber: productData.lockerNumber,
        individualProductId: individualProduct._id
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
        const selectedDate = new Date(scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          errors.push(`No se pueden agendar citas en fechas pasadas`);
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
            product: individualProduct.product._id,
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