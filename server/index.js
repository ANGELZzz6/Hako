// index.js
// Punto de entrada del servidor

const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno usando ruta absoluta
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB } = require('./config/db');
const app = require('./app');

// Conectar a MongoDB Atlas
connectDB().catch(console.error);

// Headers adicionales para Google OAuth
app.use((req, res, next) => {
  // Permitir popups para Google OAuth
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Headers adicionales para CORS
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  next();
});

// Rutas básicas
app.get('/', (req, res) => {
    res.send('API de Hako funcionando');
});

// Puerto
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
