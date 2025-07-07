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
    
    // Validar datos requeridos
    if (!orderId || !scheduledDate || !timeSlot || !itemsToPickup || !Array.isArray(itemsToPickup)) {
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
    
    // Crear la cita
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
      message: 'Cita agendada exitosamente',
      appointment: {
        id: appointment._id,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status
      }
    });
    
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
      .populate('itemsToPickup.product', 'nombre imagen_url')
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
    .populate('itemsToPickup.product', 'nombre imagen_url descripcion');
    
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
    });
    
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
    
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = 'user';
    appointment.cancellationReason = reason;
    
    await appointment.save();
    
    res.json({
      message: 'Cita cancelada exitosamente',
      appointment: {
        id: appointment._id,
        status: appointment.status,
        cancelledAt: appointment.cancelledAt
      }
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
      .populate('order', 'status');
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
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
      .populate('order', 'status');
    
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // No permitir eliminar citas completadas
    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'No se puede eliminar una cita completada' });
    }
    
    // Si la cita tiene productos asignados, liberar los casilleros
    if (appointment.order && appointment.itemsToPickup.length > 0) {
      const order = appointment.order;
      
      // Reducir la cantidad reclamada de los productos
      for (const pickupItem of appointment.itemsToPickup) {
        const orderItem = order.items.find(item => 
          item.product.toString() === pickupItem.product
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
    
    res.json({
      message: 'Cita eliminada exitosamente',
      deletedAppointment: {
        id: appointment._id,
        user: appointment.user,
        scheduledDate: appointment.scheduledDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status
      }
    });
    
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 