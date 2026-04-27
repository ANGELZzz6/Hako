const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
function loadEnv() {
  const content = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf-8');
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
mongoose.connect(env.MONGODB_URI, { dbName: 'HAKO' }).then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection('individualproducts').updateMany(
    { status: 'reserved' },
    { $set: { status: 'picked_up' } }
  );
  console.log('IndividualProducts actualizados a picked_up:', result.modifiedCount);
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
