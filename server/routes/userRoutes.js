const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const { auth, requireAdmin } = require('../middleware/auth');

// Rate limiting específico para autenticación (1000 en test, 10 en otros)
const authLimitMax = process.env.NODE_ENV === 'test' ? 1000 : 10;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authLimitMax,
  message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutas de autenticación con rate limiting
router.post('/register', authLimiter, userController.register);
router.post('/login', authLimiter, userController.login);
router.post('/verify-code', authLimiter, userController.verifyCode); // MED-02: proteger contra fuerza bruta
// Ruta de Google Auth
router.post('/google-auth', authLimiter, userController.googleAuth);

// Ruta de validación de token (requiere autenticación)
router.get('/validate-token', auth, userController.validateToken);

// Rutas de gestión de usuarios (para administrador) - requieren autenticación y permisos de admin
router.get('/all', auth, requireAdmin, userController.getAllUsers);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, requireAdmin, userController.deleteUser);
router.patch('/:id/toggle-status', auth, requireAdmin, userController.toggleUserStatus);

// Perfil - requiere autenticación
router.get('/profile/:id', auth, userController.getProfile);

// Obtener todos los admins
router.get('/admins', auth, requireAdmin, userController.getAdmins);

// Nueva ruta para cambiar la contraseña
router.post('/change-password', auth, userController.changePassword);

// Recuperación de contraseña (MED-03: proteger contra fuerza bruta)
router.post('/forgot-password', authLimiter, userController.forgotPassword);
router.post('/reset-password', authLimiter, userController.resetPassword);

// Rutas para tarjetas guardadas (requieren autenticación)
router.post('/save-card', auth, userController.saveCard);
router.get('/saved-cards', auth, userController.getSavedCards);

module.exports = router; 