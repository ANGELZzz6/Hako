const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ANSI Colors
const colors = {
  reset: '\u001b[0m',
  bright: '\u001b[1m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  red: '\u001b[31m'
};

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    console.error(`${colors.red}❌ Archivo .env no encontrado en: ${envPath}${colors.reset}`);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const config = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...v] = trimmed.split('=');
    if (key && v.length > 0) config[key.trim()] = v.join('=').trim();
  });
  return config;
}

const env = loadEnv();

// Importar modelos
const User = require('../models/User');
const Product = require('../models/Product');
const IndividualProduct = require('../models/IndividualProduct');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');

async function seed() {
  try {
    console.log(`${colors.cyan}🚀 Iniciando script de datos de prueba...${colors.reset}`);
    
    await mongoose.connect(env.MONGODB_URI, { dbName: 'HAKO' });
    console.log(`${colors.green}✅ Conectado a MongoDB Atlas (HAKO)${colors.reset}`);

    // 1. Buscar usuario
    const user = await User.findOne({ email: 'test@gmail.com' });
    if (!user) {
      throw new Error('Usuario test@gmail.com no encontrado');
    }
    console.log(`${colors.green}👤 Usuario encontrado: ${user.email} (${user._id})${colors.reset}`);

    // 2. Buscar un producto base
    const baseProduct = await Product.findOne({ isActive: true });
    if (!baseProduct) {
      throw new Error('No hay productos activos en la base de datos');
    }
    console.log(`${colors.green}📦 Producto base encontrado: ${baseProduct.nombre}${colors.reset}`);

    // 3. Crear una Orden si no existe
    let order = await Order.findOne({ user: user._id, status: 'paid' });
    if (!order) {
      order = new Order({
        user: user._id,
        items: [{
          product: baseProduct._id,
          quantity: 3,
          price: baseProduct.precio || 1000
        }],
        total_amount: (baseProduct.precio || 1000) * 3,
        status: 'paid',
        payment_status: 'approved',
        payment_method: 'Wompi'
      });
      await order.save();
      console.log(`${colors.blue}📝 Orden creada: ${order._id}${colors.reset}`);
    } else {
      console.log(`${colors.blue}📝 Usando orden existente: ${order._id}${colors.reset}`);
    }

    const commonProps = {
      user: user._id,
      order: order._id,
      product: baseProduct._id,
      unitPrice: baseProduct.precio || 1000,
      dimensiones: baseProduct.dimensiones || { largo: 10, ancho: 10, alto: 10 }
    };

    // Nettoyage previo para evitar duplicados en esta prueba específica si se desea
    // await IndividualProduct.deleteMany({ user: user._id, order: order._id });
    // await Appointment.deleteMany({ user: user._id, order: order._id });

    // 4. Crear IndividualProduct - Disponible
    const availableIP = new IndividualProduct({
      ...commonProps,
      individualIndex: 1,
      status: 'available'
    });
    await availableIP.save();
    console.log(`${colors.magenta}✨ IndividualProduct (AVAILABLE) creado: ${availableIP._id}${colors.reset}`);

    // 5. Crear IndividualProduct - Reservado
    const futureIP = new IndividualProduct({
      ...commonProps,
      individualIndex: 2,
      status: 'reserved',
      assignedLocker: 2,
      reservedAt: new Date()
    });
    await futureIP.save();
    console.log(`${colors.magenta}✨ IndividualProduct (RESERVED) creado: ${futureIP._id}${colors.reset}`);

    // 6. Crear IndividualProduct - Reclamado
    const pastIP = new IndividualProduct({
      ...commonProps,
      individualIndex: 3,
      status: 'claimed',
      assignedLocker: 1,
      claimedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    });
    await pastIP.save();
    console.log(`${colors.magenta}✨ IndividualProduct (CLAIMED) creado: ${pastIP._id}${colors.reset}`);

    // 7. Cita FUTURA (Mañana a las 14:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const futureAppointment = new Appointment({
      user: user._id,
      order: order._id,
      scheduledDate: tomorrow,
      timeSlot: '14:00',
      status: 'scheduled',
      itemsToPickup: [{
        individualProduct: futureIP._id,
        originalProduct: baseProduct._id,
        quantity: 1,
        lockerNumber: 2
      }]
    });
    await futureAppointment.save();
    console.log(`${colors.yellow}📅 Cita FUTURA creada: ${futureAppointment._id}${colors.reset}`);

    // 8. Cita PASADA (Hace 5 días)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    fiveDaysAgo.setHours(0, 0, 0, 0);

    const pastAppointment = new Appointment({
      user: user._id,
      order: order._id,
      scheduledDate: fiveDaysAgo,
      timeSlot: '10:00',
      status: 'completed',
      completedAt: new Date(fiveDaysAgo.getTime() + 10 * 60 * 1000),
      itemsToPickup: [{
        individualProduct: pastIP._id,
        originalProduct: baseProduct._id,
        quantity: 1,
        lockerNumber: 1
      }]
    });
    await pastAppointment.save();
    console.log(`${colors.yellow}📅 Cita PASADA creada: ${pastAppointment._id}${colors.reset}`);

    console.log(`\n${colors.bright}${colors.green}--- PROCESO COMPLETADO ---${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  } finally {
    await mongoose.disconnect();
    console.log(`\n${colors.blue}👋 Desconectado.${colors.reset}`);
  }
}

console.log(`${colors.yellow}⚠️  Ejecutando en 3s...${colors.reset}`);
setTimeout(seed, 3000);
