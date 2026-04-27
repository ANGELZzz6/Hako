const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  const config = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) config[key.trim()] = valueParts.join('=').trim();
  });
  return config;
}

const env = loadEnv();

async function cleanData() {
  try {
    console.log('--- DB CLEANUP PROCESS ---');
    await mongoose.connect(env.MONGODB_URI, { dbName: 'HAKO' });
    console.log('✅ Connected to HAKO database');

    // Define models dynamically to avoid potential schema conflicts
    const Order = mongoose.model('Order', new mongoose.Schema({}), 'orders');
    const IndividualProduct = mongoose.model('IndividualProduct', new mongoose.Schema({}), 'individual_products');
    const Appointment = mongoose.model('Appointment', new mongoose.Schema({}), 'appointments');
    const Cart = mongoose.model('Cart', new mongoose.Schema({}), 'carts');

    const oRes = await Order.deleteMany({});
    console.log(`🗑️ Deleted ${oRes.deletedCount} Orders`);

    const ipRes = await IndividualProduct.deleteMany({});
    console.log(`🗑️ Deleted ${ipRes.deletedCount} IndividualProducts`);

    const aRes = await Appointment.deleteMany({});
    console.log(`🗑️ Deleted ${aRes.deletedCount} Appointments`);

    const cRes = await Cart.updateMany({}, { $set: { items: [], total: 0 } });
    console.log(`🧹 Cleaned ${cRes.modifiedCount} Carts`);

    console.log('--- CLEANUP COMPLETE ---');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
}

cleanData();
