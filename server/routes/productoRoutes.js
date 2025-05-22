// productoRoutes.js
// Rutas relacionadas con productos

const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/productos', productoController.getProductos);

module.exports = router;
