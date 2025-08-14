const nodemailer = require('nodemailer');
const User = require('../models/User');
const Cart = require('../models/Cart');

class NotificationService {
  constructor() {
    // Configurar el transportador de email (usando nodemailer)
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'tu-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'tu-password'
        }
      });
      
      // Verificar que el transporter se creó correctamente
      if (!this.transporter) {
        console.warn('⚠️ No se pudo crear el transporter de email');
      }
    } catch (error) {
      console.error('❌ Error al crear transporter de email:', error);
      this.transporter = null;
    }
  }

  async sendPaymentConfirmationEmail(userEmail, orderData) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'hako@example.com',
        to: userEmail,
        subject: '¡Pago Confirmado - Hako Store!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">¡Pago Confirmado!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hola,</h2>
              <p>Tu pago ha sido procesado exitosamente. Aquí están los detalles de tu orden:</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3>Detalles del Pedido:</h3>
                <ul>
                  ${orderData.items.map(item => `
                    <li>${item.title} - Cantidad: ${item.quantity} - $${item.unit_price}</li>
                  `).join('')}
                </ul>
                <p><strong>Total: $${orderData.total}</strong></p>
              </div>
              
              <p>Gracias por tu compra. Tu pedido será procesado y enviado pronto.</p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:5173/productos" 
                   style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                  Seguir Comprando
                </a>
              </div>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Email de confirmación enviado a:', userEmail);
    } catch (error) {
      console.error('Error al enviar email de confirmación:', error);
    }
  }

  async processSuccessfulPayment(paymentId, userId) {
    try {
      console.log('Procesando pago exitoso:', paymentId, 'para usuario:', userId);
      
      // 1. Obtener información del usuario
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // 2. Obtener el carrito del usuario
      const cart = await Cart.findOne({ id_usuario: userId }).populate('items.id_producto');
      if (!cart) {
        throw new Error('Carrito no encontrado');
      }

      // 3. Preparar datos de la orden
      const orderData = {
        items: cart.items.map(item => ({
          title: item.nombre_producto,
          quantity: item.cantidad,
          unit_price: item.precio_unitario
        })),
        total: cart.total
      };

      // 4. Enviar email de confirmación
      await this.sendPaymentConfirmationEmail(user.email, orderData);

      // 5. Vaciar el carrito (opcional, ya se hace en el frontend)
      // await Cart.findOneAndUpdate({ id_usuario: userId }, { items: [], total: 0 });

      // 6. Aquí podrías crear una orden en la base de datos
      // await Order.create({ ... });

      console.log('Pago procesado exitosamente para usuario:', userId);
      return { success: true, message: 'Pago procesado correctamente' };
    } catch (error) {
      console.error('Error al procesar pago exitoso:', error);
      throw error;
    }
  }

  // Enviar email con código QR para recogida
  async sendQREmail(userEmail, qrData) {
    try {
      // Verificar que el transporter esté disponible
      if (!this.transporter) {
        console.error('❌ Transporter de email no disponible');
        throw new Error('Servicio de email no disponible');
      }

      const mailOptions = {
        from: process.env.EMAIL_USER || 'hako@example.com',
        to: userEmail,
        subject: `Código QR para Recogida - Hako Store (${qrData.qrId})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Código QR para Recogida</h1>
            </div>
            <div style="padding: 20px;">
              <h2>¡Tu código QR está listo!</h2>
              <p>Hemos generado tu código QR único para recoger tus productos en la tienda.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3>Detalles de la Cita:</h3>
                <ul>
                  <li><strong>Código QR:</strong> ${qrData.qrId}</li>
                  <li><strong>Fecha:</strong> ${new Date(qrData.appointmentDate).toLocaleDateString('es-CO')}</li>
                  <li><strong>Hora:</strong> ${qrData.appointmentTime}</li>
                  <li><strong>Orden:</strong> #${qrData.orderId.toString().slice(-6)}</li>
                  <li><strong>Productos:</strong> ${qrData.products.length} producto${qrData.products.length > 1 ? 's' : ''}</li>
                </ul>
              </div>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h4 style="color: #28a745; margin-top: 0;">📱 Cómo usar tu código QR:</h4>
                <ol>
                  <li>Llega a la tienda en la fecha y hora de tu cita</li>
                  <li>Muestra este código QR al personal de la tienda</li>
                  <li>Ellos escanearán el código y te entregarán tus productos</li>
                  <li>¡Listo! Disfruta de tu compra</li>
                </ol>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="color: #856404; margin-top: 0;">⚠️ Importante:</h4>
                <ul>
                  <li>Este código QR es único y personal</li>
                  <li>No lo compartas con nadie</li>
                  <li>Debes presentarlo en persona en la tienda</li>
                  <li>El código vence cuando termina tu cita</li>
                </ul>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <strong>¡Gracias por elegir Hako Store!</strong>
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Email con código QR enviado a:', userEmail);
    } catch (error) {
      console.error('❌ Error al enviar email con código QR:', error);
      throw error;
    }
  }

  // Método de fallback para generar QR sin email
  async generateQRWithoutEmail(qrData) {
    try {
      console.log('⚠️ Generando QR sin enviar email (servicio de email no disponible)');
      console.log('📱 QR generado:', qrData.qrId);
      console.log('📅 Para cita del:', new Date(qrData.appointmentDate).toLocaleDateString('es-CO'));
      console.log('⏰ A las:', qrData.appointmentTime);
      
      return {
        success: true,
        message: 'QR generado exitosamente (email no enviado)',
        qrId: qrData.qrId
      };
    } catch (error) {
      console.error('❌ Error en fallback de QR:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService(); 