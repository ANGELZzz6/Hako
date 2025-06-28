const adminAuth = (req, res, next) => {
  try {
    console.log('=== adminAuth middleware DEBUG ===');
    console.log('req.user:', JSON.stringify(req.user, null, 2));
    console.log('req.headers.authorization:', req.headers.authorization ? 'Present' : 'Missing');
    
    // Verificar que el usuario existe
    if (!req.user) {
      console.log('adminAuth: Usuario no encontrado en req.user');
      return res.status(401).json({ message: 'Acceso denegado - Usuario no encontrado' });
    }

    // Verificar que el usuario es admin (puede ser role: 'admin' o isAdmin: true)
    console.log('adminAuth: Verificando rol - role:', req.user.role, 'isAdmin:', req.user.isAdmin);
    
    if (req.user.role !== 'admin' && !req.user.isAdmin) {
      console.log('adminAuth: Usuario no es admin - role:', req.user.role, 'isAdmin:', req.user.isAdmin);
      return res.status(403).json({ 
        message: 'Acceso denegado. Se requieren permisos de administrador',
        userRole: req.user.role,
        userIsAdmin: req.user.isAdmin
      });
    }

    console.log('adminAuth: Usuario es admin, continuando...');
    next();
  } catch (error) {
    console.error('Error en adminAuth middleware:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = adminAuth; 