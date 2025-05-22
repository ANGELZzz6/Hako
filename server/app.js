// app.js
// Configuración principal de Express

const express = require('express');
const productoRoutes = require('./routes/productoRoutes');
const app = express();

app.use(express.json());
app.use('/api', productoRoutes);

module.exports = app;
