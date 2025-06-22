// app.js
// Configuración principal de Express

const express = require('express');
const productoRoutes = require('./routes/productoRoutes');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const app = express();

app.use(cors()); // ¡Debe ir antes de cualquier ruta!
app.use(express.json());
app.use('/api', productoRoutes);
app.use('/api/users', userRoutes);

module.exports = app;
