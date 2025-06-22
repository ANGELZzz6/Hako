const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Registro
router.post('/register', userController.register);
// Login
router.post('/login', userController.login);
// Perfil
router.get('/profile/:id', userController.getProfile);

module.exports = router; 