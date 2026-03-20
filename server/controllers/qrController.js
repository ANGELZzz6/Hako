const Qr = require('../models/qrModel');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const User = require('../models/User');
const IndividualProduct = require('../models/IndividualProduct');
const QRCode = require('qrcode');
const notificationService = require('../services/notificationService');

// Generar un nuevo código QR para una cita
async function generateQR(req, res) {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    console.log('=== DEBUG QR GENERATION ===');
    console.log('appointmentId:', appointmentId);
    console.log('userId from req.user:', userId);
    console.log('req.user:', JSON.stringify(req.user, null, 2));

    // Verificar que la cita existe y pertenece al usuario
    const appointment = await Appointment.findById(appointmentId)
      .populate('order')
      .populate('user');

    console.log('appointment found:', !!appointment);
    if (appointment) {
      console.log('appointment.user._id:', appointment.user._id);
      console.log('appointment.user._id type:', typeof appointment.user._id);
      console.log('userId type:', typeof userId);
      console.log('Comparison result:', appointment.user._id.toString() === userId);
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (appointment.user._id.toString() !== userId.toString()) {
      console.log('PERMISSION DENIED:');
      console.log('appointment.user._id:', appointment.user._id);
      console.log('userId:', userId);
      console.log('Types:', typeof appointment.user._id, typeof userId);
      console.log('String comparison:', appointment.user._id.toString(), '!==', userId.toString());
      return res.status(403).json({ error: 'No tienes permisos para acceder a esta cita' });
    }

    // Verificar que la cita no esté vencida
    const now = new Date();
    const appointmentDateTime = appointment.getFullDateTime();
    
    if (appointmentDateTime < now) {
      return res.status(400).json({ error: 'La cita ya ha vencido' });
    }

    // Verificar que no exista ya un QR para esta cita
    const existingQR = await Qr.findOne({ appointment: appointmentId });
    if (existingQR) {
      console.log('ℹ️ QR ya existe para esta cita, devolviendo el existente');
      return res.json({
        success: true,
        message: 'Código QR ya existe para esta cita',
        qr: {
          qr_id: existingQR.qr_id,
          qr_url: existingQR.qr_url,
          status: existingQR.status,
          vencimiento: existingQR.vencimiento
        }
      });
    }

    // Generar ID único para el QR
    const qrId = `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generar el código QR
    const qrData = {
      qrId: qrId,
      appointmentId: appointmentId,
      orderId: appointment.order._id,
      userId: userId,
      timestamp: Date.now()
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Crear el registro del QR en la base de datos
    const qr = new Qr({
      qr_id: qrId,
      order: appointment.order._id,
      appointment: appointmentId,
      user: userId,
      qr_url: qrCodeDataURL,
      vencimiento: appointmentDateTime,
      productos: appointment.itemsToPickup.map(item => ({
        individualProduct: item.individualProduct,
        lockerNumber: item.lockerNumber
      }))
    });

    await qr.save();

    // Enviar email con el QR
    try {
      await notificationService.sendQREmail(appointment.user.email, {
        qrId: qrId,
        appointmentDate: appointment.scheduledDate,
        appointmentTime: appointment.timeSlot,
        orderId: appointment.order._id,
        products: appointment.itemsToPickup
      });
      console.log('✅ Email enviado exitosamente');
    } catch (emailError) {
      console.warn('⚠️ Error al enviar email, usando fallback:', emailError.message);
      
      // Usar fallback si el email falla
      try {
        await notificationService.generateQRWithoutEmail({
          qrId: qrId,
          appointmentDate: appointment.scheduledDate,
          appointmentTime: appointment.timeSlot,
          orderId: appointment.order._id,
          products: appointment.itemsToPickup
        });
      } catch (fallbackError) {
        console.error('❌ Error en fallback también:', fallbackError.message);
        // Continuar aunque el fallback falle
      }
    }

    res.json({
      success: true,
      message: 'Código QR generado exitosamente',
      qr: {
        qr_id: qr.qr_id,
        qr_url: qr.qr_url,
        status: qr.status,
        vencimiento: qr.vencimiento
      }
    });

  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener información de un QR
async function getQRInfo(req, res) {
  try {
    const { qrId } = req.params;

    const qr = await Qr.findOne({ qr_id: qrId })
      .populate('order')
      .populate('appointment')
      .populate('user')
      .populate('productos.individualProduct');

    if (!qr) {
      return res.status(404).json({ error: 'Código QR no encontrado' });
    }

    res.json({
      success: true,
      qr: {
        qr_id: qr.qr_id,
        status: qr.status,
        vencimiento: qr.vencimiento,
        generado_en: qr.generado_en,
        recogido_en: qr.recogido_en,
        order: qr.order,
        appointment: qr.appointment,
        user: qr.user,
        productos: qr.productos
      }
    });

  } catch (error) {
    console.error('Error al obtener información del QR:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Marcar QR como recogido
async function markQRAsPickedUp(req, res) {
  try {
    const { qrId } = req.params;
    const { adminId } = req.body; // ID del admin que confirma la recogida

    const qr = await Qr.findOne({ qr_id: qrId })
      .populate('appointment')
      .populate('order');

    if (!qr) {
      return res.status(404).json({ error: 'Código QR no encontrado' });
    }

    if (qr.status === 'recogido') {
      return res.status(400).json({ error: 'Este QR ya fue marcado como recogido' });
    }

    if (qr.status === 'vencido') {
      return res.status(400).json({ error: 'Este QR ya ha vencido' });
    }

    // Marcar QR como recogido
    await qr.markAsPickedUp();

    // Actualizar estado de la cita a completada
    await Appointment.findByIdAndUpdate(qr.appointment._id, {
      status: 'completed',
      completedAt: new Date()
    });

    // Actualizar estado de la orden a recogida
    await Order.findByIdAndUpdate(qr.order._id, {
      status: 'picked_up',
      'locker.picked_up_at': new Date()
    });

    // Marcar productos individuales como reclamados
    for (const producto of qr.productos) {
      await IndividualProduct.findByIdAndUpdate(producto.individualProduct, {
        isClaimed: true,
        claimedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Productos marcados como recogidos exitosamente',
      qr: {
        qr_id: qr.qr_id,
        status: qr.status,
        recogido_en: qr.recogido_en
      }
    });

  } catch (error) {
    console.error('Error al marcar QR como recogido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener todos los QR de un usuario
async function getUserQRs(req, res) {
  try {
    const userId = req.user.id;

    const qrs = await Qr.find({ user: userId })
      .populate('order')
      .populate('appointment')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      qrs: qrs.map(qr => ({
        qr_id: qr.qr_id,
        status: qr.status,
        vencimiento: qr.vencimiento,
        generado_en: qr.generado_en,
        recogido_en: qr.recogido_en,
        order: qr.order,
        appointment: qr.appointment
      }))
    });

  } catch (error) {
    console.error('Error al obtener QRs del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Obtener QR de una cita específica
async function getQRByAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    // Verificar que la cita existe y pertenece al usuario
    const appointment = await Appointment.findById(appointmentId)
      .populate('user');

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (appointment.user._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a esta cita' });
    }

    // Buscar el QR de esta cita
    const qr = await Qr.findOne({ appointment: appointmentId });

    if (!qr) {
      return res.status(404).json({ error: 'No existe código QR para esta cita' });
    }

    res.json({
      success: true,
      qr: {
        qr_id: qr.qr_id,
        qr_url: qr.qr_url,
        status: qr.status,
        vencimiento: qr.vencimiento
      }
    });

  } catch (error) {
    console.error('Error al obtener QR de la cita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Actualizar estado de QRs vencidos (tarea programada)
async function updateExpiredQRs() {
  try {
    const now = new Date();
    
    // Buscar QRs vencidos que aún estén en estado 'disponible'
    const expiredQRs = await Qr.find({
      status: 'disponible',
      vencimiento: { $lt: now }
    });

    // Actualizar estado a 'vencido'
    for (const qr of expiredQRs) {
      qr.status = 'vencido';
      await qr.save();
    }

    console.log(`Se actualizaron ${expiredQRs.length} QRs vencidos`);
    
  } catch (error) {
    console.error('Error al actualizar QRs vencidos:', error);
  }
}

module.exports = {
  generateQR,
  getQRInfo,
  markQRAsPickedUp,
  getUserQRs,
  getQRByAppointment,
  updateExpiredQRs
};
