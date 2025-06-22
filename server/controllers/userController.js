const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Registrar usuario
exports.register = async (req, res) => {
  try {
    const { nombre, email, contraseña } = req.body;
    if (!nombre || !email || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    // Verificar si el usuario ya existe
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    // Hashear contraseña
    const hash = await bcrypt.hash(contraseña, 10);
    const user = new User({ nombre, email, contraseña: hash });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Login usuario
exports.login = async (req, res) => {
  try {
    const { email, contraseña } = req.body;
    if (!email || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const match = await bcrypt.compare(contraseña, user.contraseña);
    if (!match) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
    }
    // No se implementa JWT aquí por simplicidad
    res.json({ message: 'Login exitoso', user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Obtener perfil de usuario
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-contraseña');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}; 