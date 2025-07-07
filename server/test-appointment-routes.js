const express = require('express');
const app = express();
const appointmentRoutes = require('./routes/appointmentRoutes');

// Configuración básica
app.use(express.json());

// Mock middleware de autenticación para pruebas
const mockAuth = (req, res, next) => {
  req.user = { id: '507f1f77bcf86cd799439011' }; // Mock user ID
  next();
};

const mockAdminAuth = (req, res, next) => {
  req.user = { id: '507f1f77bcf86cd799439011', isAdmin: true }; // Mock admin user
  next();
};

// Montar rutas con middleware mock
app.use('/api/appointments', (req, res, next) => {
  // Aplicar mock auth a todas las rutas
  if (req.path.startsWith('/admin')) {
    mockAdminAuth(req, res, next);
  } else {
    mockAuth(req, res, next);
  }
}, appointmentRoutes);

// Ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor de prueba funcionando' });
});

// Iniciar servidor
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Servidor de prueba ejecutándose en http://localhost:${PORT}`);
  console.log('Rutas disponibles:');
  console.log('- GET /api/appointments/available-slots/:date');
  console.log('- POST /api/appointments');
  console.log('- GET /api/appointments/my-appointments');
  console.log('- GET /api/appointments/admin');
  console.log('- GET /api/appointments/admin/stats');
});

module.exports = app; 