const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const { auth, requireAdmin } = require('../middleware/auth');
const { requireAdmin: adminAuth } = require('../middleware/auth');

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
router.post('/verify-code', userController.verifyCode);
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
router.get('/admins', auth, adminAuth, userController.getAdmins);

// Nueva ruta para cambiar la contraseña
router.post('/change-password', auth, userController.changePassword);

// Recuperación de contraseña
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

module.exports = router; 