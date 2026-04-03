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

async function listUsers() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`Conectado a DB: ${mongoose.connection.name}`);
    
    // Probar varias colecciones comunes si 'usuarios' falla
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Colecciones en DB:', collections.map(c => c.name).join(', '));
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'usuarios');
    const users = await User.find({}, { nombre: 1, email: 1, role: 1 });
    console.log(`USUARIOS EN 'usuarios': ${users.length}`);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
    
    // Si 'usuarios' está vacía, probar 'users'
    if (users.length === 0) {
        const User2 = mongoose.model('User2', new mongoose.Schema({}, { strict: false }), 'users');
        const users2 = await User2.find({}, { nombre: 1, email: 1, role: 1 });
        console.log(`USUARIOS EN 'users': ${users2.length}`);
        users2.forEach(u => console.log(`- ${u.email} (${u.role})`));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listUsers();
