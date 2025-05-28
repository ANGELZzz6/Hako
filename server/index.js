// index.js
// Punto de entrada del servidor

const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno usando ruta absoluta
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const { connectDB } = require('./config/db');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB Atlas
connectDB().catch(console.error);

// Rutas básicas
app.get('/', (req, res) => {
    res.send('API de Hako funcionando');
});

// Puerto
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
