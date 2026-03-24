const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isDev = process.env.NODE_ENV === 'development';

const auth = async (req, res, next) => {
  try {
    if (isDev) console.log('=== auth middleware DEBUG ===');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (isDev) console.log('Token present:', !!token);
    
    if (!token) {
      if (isDev) console.log('auth: No token provided');
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (isDev) console.log('Token decoded:', JSON.stringify(decoded, null, 2));
    
    // Verificar que el usuario existe y está activo
    const user = await User.findById(decoded.id).select('-contraseña -verificationCode -verificationCodeExpires');
    if (isDev) {
      console.log('User found:', user ? 'Yes' : 'No');
      console.log('User role:', user?.role);
      console.log('User isActive:', user?.isActive);
    }
    
    if (!user) {
      if (isDev) console.log('auth: Usuario no encontrado en DB');
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!user.isActive) {
      if (isDev) console.log('auth: Usuario desactivado');
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    req.user = {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      role: user.role
    };
    
    if (isDev) console.log('auth: req.user set:', JSON.stringify(req.user, null, 2));
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para verificar si el usuario es administrador
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
  }
  
  next();
};

module.exports = { auth, requireAdmin }; 