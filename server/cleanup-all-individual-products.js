const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const IndividualProduct = require('./models/IndividualProduct');
const User = require('./models/User');
const db = require('./config/db');

(async () => {
  try {
    await db();
    console.log('Conectado a la base de datos');

    const now = new Date();
    now.setSeconds(0, 0);

    // Buscar todas las reservas vencidas (scheduled o confirmed) cuya fecha y hora ya pasaron
    const expiredAppointments = await Appointment.find({
      status: { $in: ['scheduled', 'confirmed'] },
    });

    let totalLiberadas = 0;
    let totalPenalizaciones = 0;

    for (const appointment of expiredAppointments) {
      const appointmentDateTime = appointment.getFullDateTime();
      if (appointmentDateTime < now) {
        // Liberar productos individuales
        for (const pickupItem of appointment.itemsToPickup) {
          const individualProduct = await IndividualProduct.findOne({
            product: pickupItem.product,
            user: appointment.user,
            status: 'reserved',
            assignedLocker: pickupItem.lockerNumber
          });
          if (individualProduct) {
            individualProduct.status = 'available';
            individualProduct.assignedLocker = undefined;
            individualProduct.reservedAt = undefined;
            await individualProduct.save();
            totalLiberadas++;
          }
        }
        // Penalizar al usuario para ese día
        const user = await User.findById(appointment.user);
        if (user) {
          const penaltyDate = new Date(appointment.scheduledDate);
          penaltyDate.setHours(0, 0, 0, 0);
          // Evitar duplicados
          const alreadyPenalized = user.reservationPenalties.some(p => {
            const d = new Date(p.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === penaltyDate.getTime();
          });
          if (!alreadyPenalized) {
            user.reservationPenalties.push({ date: penaltyDate, reason: 'Reserva vencida' });
            await user.save();
            totalPenalizaciones++;
          }
        }
        // Marcar la cita como cancelada por el sistema
        appointment.status = 'cancelled';
        appointment.cancelledAt = now;
        appointment.cancelledBy = 'system';
        appointment.cancellationReason = 'Reserva vencida automáticamente';
        await appointment.save();
        console.log(`Reserva ${appointment._id} vencida y limpiada.`);
      }
    }
    console.log(`Reservas vencidas limpiadas. Productos liberados: ${totalLiberadas}, penalizaciones aplicadas: ${totalPenalizaciones}`);
    process.exit(0);
  } catch (err) {
    console.error('Error en limpieza automática de reservas vencidas:', err);
    process.exit(1);
  }
})(); 