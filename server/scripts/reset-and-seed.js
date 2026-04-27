/**
 * reset-and-seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Limpia TODA la base de datos HAKO y crea un usuario admin de prueba.
 * 
 * SOLO para uso en desarrollo local. NO ejecutar en producción.
 * 
 * Uso:
 *   node server/scripts/reset-and-seed.js
 *
 * Usuario creado:
 *   Email:      admin@hako.test
 *   Contraseña: Admin1234*
 *   Rol:        admin
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Bloqueo de seguridad: solo en desarrollo ──────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌ BLOQUEADO: Este script no puede ejecutarse en producción.');
  process.exit(1);
}

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI no está definida en el archivo .env');
  process.exit(1);
}

// ── Credenciales del admin de prueba ─────────────────────────────────────────
const ADMIN = {
  nombre: 'Admin Hako',
  email: 'admin@hako.test',
  contraseña: 'Admin1234*',
  role: 'admin',
  isActive: true,
  authProvider: 'local',
};

// ── Colecciones a limpiar ─────────────────────────────────────────────────────
const COLLECTIONS_TO_CLEAR = [
  // Usuarios
  'usuarios',
  'pendingusers',
  'pending_users',
  // Finanzas / Pedidos
  'orders',
  'compras',
  'payments',
  // Citas y casilleros
  'appointments',
  'individualproducts',
  'lockerassignments',
  'locker_assignments',
  // QR
  'qrcodes',
  'qr_compras',
  'qrs',
  // Carrito
  'carts',
  'carthistories',
  // Soporte / Debug
  'debuglogs',
  'supporttickets',
  'soporte',
];

// ── Helper de log con color ───────────────────────────────────────────────────
const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);

async function run() {
  log('🔌', 'Conectando a MongoDB HAKO...');
  await mongoose.connect(MONGO_URI, { dbName: 'HAKO' });
  log('✅', 'Conectado correctamente.');

  const db = mongoose.connection.db;

  // 1. Listar colecciones existentes
  const existingCollections = (await db.listCollections().toArray()).map(c => c.name);
  log('📋', `Colecciones encontradas: ${existingCollections.join(', ') || 'ninguna'}`);

  // 2. Limpiar colecciones
  log('🗑️ ', 'Vaciando colecciones...');
  for (const col of COLLECTIONS_TO_CLEAR) {
    if (existingCollections.includes(col)) {
      const result = await db.collection(col).deleteMany({});
      log('  ↳', `${col}: ${result.deletedCount} documentos eliminados`);
    } else {
      log('  ↷', `${col}: no existe, omitiendo`);
    }
  }

  // 3. Crear usuario admin
  log('👤', 'Creando usuario admin de prueba...');
  const hash = await bcrypt.hash(ADMIN.contraseña, 12);

  await db.collection('usuarios').insertOne({
    nombre: ADMIN.nombre,
    email: ADMIN.email,
    contraseña: hash,
    role: ADMIN.role,
    isActive: ADMIN.isActive,
    authProvider: ADMIN.authProvider,
    loginAttempts: 0,
    lockUntil: null,
    lastLogin: null,
    cedula: '',
    telefono: '',
    direccion: '',
    genero: '',
    bio: '',
    savedCards: [],
    reservationPenalties: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Resumen
  console.log('\n' + '═'.repeat(55));
  console.log('  ✅  BASE DE DATOS RESETEADA Y ADMIN CREADO');
  console.log('═'.repeat(55));
  console.log(`  📧  Email:      ${ADMIN.email}`);
  console.log(`  🔑  Contraseña: ${ADMIN.contraseña}`);
  console.log(`  🛡️   Rol:        ${ADMIN.role}`);
  console.log('═'.repeat(55));
  console.log('  ⚠️   SOLO USAR EN DESARROLLO LOCAL');
  console.log('═'.repeat(55) + '\n');

  await mongoose.disconnect();
  log('🔌', 'Desconectado de MongoDB.');
}

run().catch(err => {
  console.error('❌ Error durante el reset:', err.message);
  process.exit(1);
});
