const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');

// Rate limiting específico para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos de autenticación por ventana de tiempo
  message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutas de autenticación con rate limiting
router.post('/register', authLimiter, userController.register);
router.post('/login', authLimiter, userController.login);
router.post('/verify-code', authLimiter, userController.verifyCode);
// Ruta de Google Auth
router.post('/google-auth', authLimiter, userController.googleAuth);

// Rutas de gestión de usuarios (para administrador) - SIN rate limiting
router.get('/all', userController.getAllUsers);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/toggle-status', userController.toggleUserStatus);

// Perfil - SIN rate limiting
router.get('/profile/:id', userController.getProfile);

module.exports = router; 