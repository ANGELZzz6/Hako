const transporter = require('../config/nodemailer');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const IndividualProduct = require('../models/IndividualProduct');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const axios = require('axios');
const Appointment = require('../models/Appointment');
const crypto = require('crypto');
const mongoose = require('mongoose');

const isDev = process.env.NODE_ENV === 'development';
const WOMPI_PUB_KEY = process.env.WOMPI_PUBLIC_KEY_TEST;
const WOMPI_PRIV_KEY = process.env.WOMPI_PRIVATE_KEY_TEST;
const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;
const API_BASE_URL = 'https://sandbox.wompi.co/v1';
// CRIT-03: Guard de idempotencia movido a DB (resistente a reinicios del servidor)

async function getAcceptanceToken() {
    try {
        const response = await axios.get(`${API_BASE_URL}/merchants/${WOMPI_PUB_KEY}`);
        return response.data.data.presigned_acceptance.acceptance_token;
    } catch (error) {
        console.error('❌ Error Wompi Acceptance Token:', error.message);
        return null;
    }
}

function validateWompiSignature(data, checksum) {
    const orderStr = data.transaction.id + data.transaction.status + data.transaction.amount_in_cents + data.timestamp + WOMPI_EVENTS_SECRET;
    const hash = crypto.createHash('sha256').update(orderStr).digest('hex');
    return hash === checksum;
}

exports.createPreference = async (req, res) => {
    try {
        if (WOMPI_PUB_KEY?.includes('PENDING')) {
            return res.status(503).json({ success: false, message: 'Wompi no configurado' });
        }

        const { items, payer, selected_items } = req.body;
        const user_id = req.user.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Faltan items' });
        }

        const totalAmount = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        const reference = `HAKO-${Date.now()}-${user_id}`;

        // Crear/Actualizar Orden Pendiente para persistir items antes del pago
        const orderData = {
            user: user_id,
            items: items.map(item => ({
                product: item.id || item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.unit_price * item.quantity,
                variants: item.variants
            })),
            total_amount: totalAmount,
            status: 'pending',
            external_reference: reference
        };

        await Order.findOneAndUpdate({ external_reference: reference }, orderData, { upsert: true });

        res.json({
            success: true,
            payment_data: {
                publicKey: WOMPI_PUB_KEY,
                currency: 'COP',
                amountInCents: totalAmount * 100,
                reference: reference,
                redirectUrl: `${process.env.FRONTEND_URL}/payment-result`
            }
        });

    } catch (error) {
        console.error('❌ Error createPreference:', error.message);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

exports.mercadoPagoWebhook = async (req, res) => {
    // CRIT-04: Validar estructura del payload antes de procesar (previene DoS por crash)
    const { data, timestamp, signature } = req.body;
    if (!data?.transaction || !timestamp || !signature?.checksum) {
        console.error('❌ Webhook: Payload malformado o incompleto');
        return res.status(400).send('Malformed payload');
    }

    if (!validateWompiSignature(req.body, signature.checksum)) {
        return res.status(401).send('Unauthorized');
    }

    const tx = data.transaction;
    const reference = tx.reference;

    // CRIT-03: Idempotencia basada en DB — resiste reinicios del servidor
    const existingPayment = await Payment.findOne({ wompi_transaction_id: tx.id });
    if (existingPayment) {
        if (isDev) console.log(`⚠️ Webhook duplicado ignorado para tx: ${tx.id}`);
        return res.status(200).send('OK');
    }

    try {
        const hakoStatusMap = { 'APPROVED': 'approved', 'DECLINED': 'declined', 'VOIDED': 'voided', 'ERROR': 'failed' };
        const hakoStatus = hakoStatusMap[tx.status] || 'pending';

        // HIGH-02: Castear userId a ObjectId correctamente
        const userIdStr = reference.split('-')[2];
        const userId = mongoose.Types.ObjectId.isValid(userIdStr)
            ? new mongoose.Types.ObjectId(userIdStr)
            : userIdStr;

        // 1. Registrar/Actualizar Pago
        await Payment.findOneAndUpdate(
            { payment_id: reference },
            {
                payment_id: reference,
                wompi_transaction_id: tx.id,
                amount: tx.amount_in_cents / 100,
                status: hakoStatus,
                date_created: new Date(timestamp),
                date_approved: tx.status === 'APPROVED' ? new Date() : null,
                external_reference: reference,
                user_id: userId
            },
            { upsert: true }
        );

        // 2. Procesar Orden aprobada
        if (tx.status === 'APPROVED') {
            const order = await Order.findOne({ external_reference: reference });
            if (order) {
                // CRIT-4: Crear productos individuales PRIMERO para evitar estado parcial
                const productsCreated = await createIndividualProductsForPayment(order, tx);

                if (productsCreated) {
                    order.status = 'paid';
                    order.paid_at = new Date();
                    order.payment = {
                        payment_id: reference,
                        wompi_transaction_id: tx.id,
                        status: 'approved',
                        amount: tx.amount_in_cents / 100,
                        reference: reference
                    };
                    await order.save();

                    // Limpiar Carrito
                    await Cart.updateOne({ id_usuario: order.user }, { $set: { items: [] } });

                    // Notificar por correo
                    const user = await User.findById(order.user);
                    if (user) {
                        await transporter.sendMail({
                            to: user.email,
                            subject: 'Confirmación de Pago - Hako',
                            html: `<h2>¡Pago recibido!</h2><p>Tu orden ${order._id} ha sido confirmada.</p>`
                        });
                    }
                } else {
                    console.error('❌ Error crítico: webhook abortado porque no se crearon los IndividualProducts');
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Error Webhook:', error.message);
        res.status(500).send('Error');
    }
};

async function createIndividualProductsForPayment(order, tx) {
    try {
        const itemsToCreate = [];
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (!product) continue;

            for (let i = 0; i < item.quantity; i++) {
                itemsToCreate.push({
                    user: order.user,
                    order: order._id,
                    product: item.product,
                    individualIndex: itemsToCreate.length + 1,
                    status: 'available',
                    unitPrice: item.unit_price,
                    dimensiones: product.dimensiones,
                    variants: item.variants,
                    payment: { payment_id: order.external_reference, wompi_transaction_id: tx.id, status: 'approved' }
                });
            }
        }
        await IndividualProduct.insertMany(itemsToCreate);
        return true;
    } catch (error) {
        console.error('❌ Error creando productos individuales:', error.message);
        return false;
    }
}

exports.refundPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findById(paymentId);

        if (!payment) return res.status(404).json({ message: 'Pago no encontrado' });
        if (!payment.wompi_transaction_id) return res.status(400).json({ message: 'El pago no tiene transacción Wompi asociada' });

        // CRIT-05: Regla — no reembolsar si ya fue reembolsado
        if (['refunded', 'voided'].includes(payment.status)) {
            return res.status(400).json({ message: 'Este pago ya fue anulado o reembolsado' });
        }

        // CRIT-05: Buscar la orden asociada
        const order = await Order.findOne({ external_reference: payment.payment_id });
        if (!order) return res.status(404).json({ message: 'Orden asociada no encontrada' });

        // CRIT-05: Regla — no reembolsar si la orden ya está cancelada
        if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'La orden ya está cancelada' });
        }

        // CRIT-05: Regla — no reembolsar si algún producto ya fue recogido
        const pickedUpCount = await IndividualProduct.countDocuments({
            order: order._id,
            status: 'picked_up'
        });
        if (pickedUpCount > 0) {
            return res.status(400).json({
                message: `No se puede reembolsar: ${pickedUpCount} producto(s) ya fueron recogidos`
            });
        }

        // CRIT-05: Regla — bloquear si la cita activa comienza en menos de 1 hora
        const appointment = await Appointment.findOne({
            order: order._id,
            status: { $in: ['scheduled', 'confirmed'] }
        });
        if (appointment) {
            const now = new Date();
            const appointmentTime = new Date(appointment.scheduledDate);
            const [h, m] = appointment.timeSlot.split(':');
            appointmentTime.setHours(parseInt(h), parseInt(m), 0, 0);
            const hoursDiff = (appointmentTime.getTime() - now.getTime()) / 3600000;
            if (hoursDiff < 1) {
                return res.status(400).json({
                    message: 'No se puede reembolsar: la cita comienza en menos de 1 hora'
                });
            }
        }

        // Procesar void en Wompi
        await axios.post(`${API_BASE_URL}/transactions/${payment.wompi_transaction_id}/void`, {}, {
            headers: { Authorization: `Bearer ${WOMPI_PRIV_KEY}` }
        });

        // Actualizar estados
        payment.status = 'refunded';
        await payment.save();

        await Order.updateOne({ external_reference: payment.payment_id }, { $set: { status: 'cancelled' } });

        // Liberar productos individuales no recogidos
        await IndividualProduct.updateMany(
            { order: order._id, status: { $nin: ['picked_up'] } },
            { $set: { status: 'available' }, $unset: { assignedLocker: '', reservedAt: '' } }
        );

        // Cancelar cita si existe
        if (appointment) {
            appointment.status = 'cancelled';
            appointment.cancelledBy = 'admin';
            appointment.cancellationReason = 'Reembolso procesado por administrador';
            appointment.cancelledAt = new Date();
            await appointment.save();
        }

        if (isDev) console.log(`✅ Reembolso procesado para pago ${paymentId}`);
        res.json({ success: true, message: 'Pago anulado exitosamente' });
    } catch (error) {
        console.error('❌ Error refundPayment:', error.message);
        res.status(400).json({ message: 'Error al anular el pago', details: error.response?.data || error.message });
    }
};

module.exports = {
    createPreference: exports.createPreference,
    mercadoPagoWebhook: exports.mercadoPagoWebhook,
    refundPayment: exports.refundPayment,
    getAllPayments: async (req, res) => res.json(await Payment.find().populate('user_id')),
    getPaymentById: async (req, res) => res.json(await Payment.findById(req.params.paymentId).populate('user_id')),
    updatePaymentStatus: async (req, res) => {
        const { status } = req.body;
        const validStatuses = ['pending', 'approved', 'declined', 'failed', 'voided', 'error', 'refunded'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }
        res.json(await Payment.findByIdAndUpdate(req.params.paymentId, { status }, { new: true, runValidators: true }));
    },
    deletePayment: async (req, res) => {
        const payment = await Payment.findById(req.params.paymentId);
        if (!payment) return res.status(404).json({ message: 'Pago no encontrado' });

        const Order = require('../models/Order');
        const activeOrder = await Order.findOne({
            $or: [
                { 'payment.payment_id': payment.payment_id },
                { 'payment.wompi_transaction_id': payment.wompi_transaction_id }
            ],
            status: { $nin: ['cancelled'] }
        });

        if (activeOrder) {
            return res.status(400).json({ message: 'No se puede eliminar el pago: existe una orden activa asociada.' });
        }

        await Payment.findByIdAndDelete(req.params.paymentId);
        res.send('OK');
    },
    getPaymentStats: async (req, res) => res.json({ total: await Payment.countDocuments() })
};