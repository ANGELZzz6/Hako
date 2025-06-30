const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const transporter = require('../config/nodemailer');

exports.createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    const ticket = await SupportTicket.create({ user: userId, subject, message });

    // Enviar correo al usuario confirmando recepción
    await transporter.sendMail({
      to: user.email,
      subject: '¡Hemos recibido tu solicitud de soporte! - Hako',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://i.imgur.com/0y0y0y0.png" alt="Hako Logo" style="height: 48px; margin-bottom: 8px;"/>
            <h2 style="color: #d32f2f; margin: 0;">¡Tu solicitud de soporte ha sido recibida!</h2>
          </div>
          <p style="font-size: 17px; color: #222;">Hola <b>${user.nombre}</b>,</p>
          <p style="font-size: 16px; color: #444;">Gracias por contactarnos. Hemos recibido tu solicitud y nuestro equipo de soporte la atenderá lo antes posible.</p>
          <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;">
            <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Asunto:</b> ${subject}</p>
            <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Mensaje enviado:</b></p>
            <blockquote style="margin: 0; color: #555; border-left: 3px solid #eee; padding-left: 12px;">${message}</blockquote>
            <p style="margin: 16px 0 0 0; font-size: 15px;"><b>Número de ticket:</b> ${ticket._id}</p>
          </div>
          <p style="font-size: 15px; color: #444;">Te notificaremos por este medio cuando recibas una respuesta.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;"/>
          <footer style="font-size: 13px; color: #888; text-align: center;">
            <p>¿Tienes dudas urgentes? Contáctanos en <a href="mailto:soporte@hako.com" style="color: #d32f2f; text-decoration: none;">soporte@hako.com</a></p>
            <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
          </footer>
        </div>
      `
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTickets = async (req, res) => {
  try {
    let tickets;
    if (req.user.role === 'admin') {
      tickets = await SupportTicket.find().populate('user', 'nombre email');
    } else {
      tickets = await SupportTicket.find({ user: req.user.id });
    }
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.replyTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findById(req.params.id).populate('user');
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    ticket.replies.push({ sender: req.user.id, message });
    await ticket.save();

    // Enviar correo al usuario si responde un admin
    if (req.user.role === 'admin') {
      await transporter.sendMail({
        to: ticket.user.email,
        subject: 'Respuesta a tu ticket de soporte',
        text: `El equipo de soporte ha respondido: ${message}`
      });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 