const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(__dirname, './.env');
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
const ADMIN_EMAIL = env.ADMIN_TEST_EMAIL;

async function unlock() {
  try {
    console.log(`Conectando a MongoDB para desbloquear ${ADMIN_EMAIL}...`);
    await mongoose.connect(env.MONGODB_URI, { dbName: 'HAKO' });
    
    // El modelo se llama User pero la colección es 'usuarios'
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'usuarios');
    
    const result = await User.updateOne(
      { email: ADMIN_EMAIL.toLowerCase() },
      { $set: { loginAttempts: 0, lockUntil: null } }
    );
    
    if (result.matchedCount > 0) {
      console.log(`✅ Usuario ${ADMIN_EMAIL} desbloqueado exitosamente.`);
    } else {
      console.log(`❌ No se encontró el usuario ${ADMIN_EMAIL}.`);
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

unlock();
