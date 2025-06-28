const express = require('express');
const app = express();

// Middleware básico
app.use(express.json());

// Importar rutas
const cartRoutes = require('./routes/cartRoutes');

// Usar rutas
app.use('/api/cart', cartRoutes);

// Ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor funcionando' });
});

// Listar todas las rutas registradas
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(`Ruta: ${Object.keys(r.route.methods)} ${r.route.path}`);
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Servidor de prueba corriendo en puerto ${PORT}`);
  console.log('Rutas disponibles:');
  console.log('- GET /test');
  console.log('- GET /api/cart (requiere auth)');
  console.log('- POST /api/cart (requiere auth)');
}); 