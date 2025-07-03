const bcrypt = require('bcryptjs');
const User = require('../models/User');
// const nodemailer = require('nodemailer');
const crypto = require('crypto');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const PendingUser = require('../models/PendingUser');
const transporter = require('../config/nodemailer');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '529191388743-v1gull31du3pi8aovi34d8srt7424kva.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

function generarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function enviarCodigo(email, code) {
  try {
    // Verificar si tenemos configuración de email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`⚠️  Configuración de email no encontrada. Código de verificación para ${email}: ${code}`);
      return; // No fallar si no hay configuración de email
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Tu código de verificación - Hako',
      text: `Tu código de verificación es: ${code}. Este código expira en 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Hako - Código de Verificación</h2>
          <p>Tu código de verificación es:</p>
          <h1 style="color: #d32f2f; font-size: 32px; text-align: center; letter-spacing: 5px;">${code}</h1>
          <p><strong>Este código expira en 10 minutos.</strong></p>
          <p>Si no solicitaste este código, ignora este mensaje.</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error enviando email:', error);
    console.log(`⚠️  No se pudo enviar email. Código de verificación para ${email}: ${code}`);
    // No lanzar error para que el registro no falle
  }
}

function generarJWT(user) {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'tu_jwt_secret_super_seguro_cambialo_en_produccion',
    { expiresIn: '1h' }
  );
}

function validarContraseña(contraseña) {
  // Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  return regex.test(contraseña);
}

function validarNombre(nombre) {
  // Solo letras, espacios y caracteres especiales comunes en nombres
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  return regex.test(nombre) && nombre.trim().length >= 2 && nombre.trim().length <= 50;
}

// Generador de contraseña segura que cumple con los requisitos del modelo
function generarContraseñaSegura() {
  const mayus = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minus = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{};:,.<>/?';
  function randomChar(str) { return str[Math.floor(Math.random() * str.length)]; }
  let pass =
    randomChar(mayus) +
    randomChar(minus) +
    randomChar(nums) +
    randomChar(symbols);
  const all = mayus + minus + nums + symbols;
  for (let i = 0; i < 12; i++) pass += randomChar(all);
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

// Registrar usuario
exports.register = async (req, res) => {
  try {
    const { nombre, email, contraseña } = req.body;
    
    // Validación de campos obligatorios
    if (!nombre || !email || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Validación de formato de email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Validación de nombre
    if (!validarNombre(nombre)) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres y solo puede contener letras y espacios' });
    }

    // Validación de contraseña
    if (!validarContraseña(contraseña)) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo' 
      });
    }

    // Verificar si el usuario ya existe en usuarios o pending_users
    const existe = await User.findOne({ email: email.toLowerCase() });
    const pendiente = await PendingUser.findOne({ email: email.toLowerCase() });
    if (existe || pendiente) {
      return res.status(400).json({ error: 'El correo ya está registrado o en proceso de verificación' });
    }

    // Hashear contraseña
    const hash = await bcrypt.hash(contraseña, 12);
    const code = generarCodigo();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    // Guardar en PendingUser
    const pendingUser = new PendingUser({
      nombre: nombre.trim(),
      email: email.toLowerCase(),
      contraseña: hash,
      verificationCode: code,
      verificationCodeExpires: expires
    });
    await pendingUser.save();
    await enviarCodigo(email, code);
    console.log(`Nuevo registro pendiente: ${email} desde IP: ${req.ip}`);
    res.status(201).json({ 
      message: 'Registro iniciado. Revisa tu correo para el código de verificación.',
      verificacionPendiente: true 
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Login usuario
exports.login = async (req, res) => {
  try {
    const { email, contraseña } = req.body;
    
    // Validación de campos obligatorios
    if (!email || !contraseña) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Validación de formato de email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Buscar usuario incluyendo campos de seguridad
    const user = await User.findOne({ email: email.toLowerCase() }).select('+loginAttempts +lockUntil');
    
    if (!user) {
      // Log de intento fallido
      console.log(`Intento de login fallido - email no encontrado: ${email} desde IP: ${req.ip}`);
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      console.log(`Intento de login en cuenta bloqueada: ${email} desde IP: ${req.ip}`);
      return res.status(423).json({ 
        error: `Cuenta temporalmente bloqueada. Intenta de nuevo en ${lockTime} minutos.` 
      });
    }

    const match = await bcrypt.compare(contraseña, user.contraseña);
    if (!match) {
      // Incrementar intentos fallidos
      await user.incLoginAttempts();
      
      // Log de intento fallido
      console.log(`Intento de login fallido - contraseña incorrecta: ${email} desde IP: ${req.ip}`);
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      return res.status(400).json({ error: 'Cuenta desactivada' });
    }

    // Resetear intentos de login exitoso
    await user.resetLoginAttempts();

    // Generar JWT directamente
    const token = generarJWT(user);
    
    // Log de login exitoso
    console.log(`Login exitoso: ${email} desde IP: ${req.ip}`);
    
    res.json({ 
      message: 'Login exitoso', 
      user: { 
        id: user._id, 
        nombre: user.nombre, 
        email: user.email, 
        role: user.role 
      },
      token: token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Verificar código de 2FA
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son obligatorios' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }
    // Buscar usuario pendiente
    const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() });
    if (!pendingUser) {
      return res.status(400).json({ error: 'No hay registro pendiente para este correo o ya fue verificado' });
    }
    if (pendingUser.verificationCode !== code) {
      console.log(`Intento de verificación fallido: ${email} desde IP: ${req.ip}`);
      return res.status(400).json({ error: 'Código incorrecto' });
    }
    if (pendingUser.verificationCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Código expirado' });
    }
    // Crear usuario definitivo
    const user = new User({
      nombre: pendingUser.nombre,
      email: pendingUser.email,
      contraseña: pendingUser.contraseña
    });
    await user.save();
    // Eliminar registro temporal
    await PendingUser.deleteOne({ _id: pendingUser._id });
    // Generar JWT
    const token = generarJWT(user);
    console.log(`Verificación exitosa y usuario creado: ${email} desde IP: ${req.ip}`);
    res.json({
      message: 'Verificación exitosa. Usuario creado.',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      },
      token: token
    });
  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los usuarios (para administrador)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-contraseña -verificationCode -verificationCodeExpires -loginAttempts -lockUntil');
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, role, isActive, telefono, direccion, fechaNacimiento, genero, bio } = req.body;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Validar email si se proporciona
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Validar nombre si se proporciona
    if (nombre && !validarNombre(nombre)) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres y solo puede contener letras y espacios' });
    }

    // Verificar si el email ya existe (excluyendo el usuario actual)
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }

    // Permitir solo si es admin o el mismo usuario
    if (!(req.user.role === 'admin' || String(req.user.id) === String(id))) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este usuario' });
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre.trim();
    if (email) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (fechaNacimiento !== undefined) updateData.fechaNacimiento = fechaNacimiento;
    if (genero !== undefined) updateData.genero = genero;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-contraseña -verificationCode -verificationCodeExpires -loginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`Usuario actualizado: ${user.email} por admin desde IP: ${req.ip}`);
    res.json({ message: 'Usuario actualizado correctamente', user });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Prevenir eliminación de usuarios admin (opcional)
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'No se puede eliminar un usuario administrador' });
    }

    await User.findByIdAndDelete(id);
    
    console.log(`Usuario eliminado: ${user.email} por admin desde IP: ${req.ip}`);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cambiar estado de usuario (activar/desactivar)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Prevenir desactivación de usuarios admin (opcional)
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'No se puede desactivar un usuario administrador' });
    }

    user.isActive = !user.isActive;
    await user.save();

    const statusText = user.isActive ? 'activado' : 'desactivado';
    console.log(`Usuario ${statusText}: ${user.email} por admin desde IP: ${req.ip}`);
    
    res.json({ 
      message: `Usuario ${statusText} correctamente`, 
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener perfil de usuario
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!validator.isMongoId(id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    const user = await User.findById(id).select('-contraseña -verificationCode -verificationCodeExpires');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
      _id: user._id,
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      telefono: user.telefono,
      direccion: user.direccion,
      fechaNacimiento: user.fechaNacimiento,
      genero: user.genero,
      bio: user.bio,
      authProvider: user.authProvider || 'local'
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Login/registro con Google
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token de Google requerido' });
    const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload.email_verified) return res.status(400).json({ error: 'Email de Google no verificado' });
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      // Crear usuario nuevo con contraseña segura
      const randomPass = generarContraseñaSegura();
      const hash = await bcrypt.hash(randomPass, 12);
      user = await User.create({
        nombre: payload.name || 'Usuario Google',
        email: payload.email,
        contraseña: hash, // Contraseña segura hasheada
        role: 'user',
        isActive: true,
        authProvider: 'google'
      });
    }
    // Generar JWT
    const tokenJwt = generarJWT(user);
    res.json({
      message: 'Login con Google exitoso',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider || 'google'
      },
      token: tokenJwt
    });
  } catch (error) {
    console.error('Error en Google Auth:', error);
    res.status(500).json({ error: 'Error en autenticación con Google' });
  }
};

// Validar token JWT
exports.validateToken = async (req, res) => {
  try {
    // El middleware de autenticación ya verificó el token
    // y agregó el usuario a req.user
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar que el usuario aún existe en la base de datos
    const currentUser = await User.findById(user.id).select('-contraseña -verificationCode -verificationCodeExpires');
    
    if (!currentUser) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!currentUser.isActive) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    res.json({
      message: 'Token válido',
      user: {
        id: currentUser._id,
        nombre: currentUser.nombre,
        email: currentUser.email,
        role: currentUser.role,
        isActive: currentUser.isActive,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.updatedAt,
        telefono: currentUser.telefono,
        direccion: currentUser.direccion,
        fechaNacimiento: currentUser.fechaNacimiento,
        genero: currentUser.genero,
        bio: currentUser.bio,
        authProvider: currentUser.authProvider || 'local'
      }
    });
  } catch (error) {
    console.error('Error validando token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los admins
exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }, '_id nombre email');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cambiar contraseña de usuario autenticado
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { actual, nueva } = req.body;
    const user = await User.findById(userId).select('+contraseña');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    // Si el usuario es Google, permite establecer o cambiar la contraseña sin pedir la actual
    if (user.authProvider === 'google') {
      if (!nueva) {
        return res.status(400).json({ error: 'Debes proporcionar la nueva contraseña.' });
      }
      // Validar nueva contraseña (mínimo 8 caracteres, mayúscula, minúscula, número, símbolo)
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!regex.test(nueva)) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.' });
      }
      user.contraseña = await bcrypt.hash(nueva, 12);
      user.authProvider = 'local'; // Ahora puede iniciar sesión con contraseña
      await user.save();
      // Enviar correo de notificación de cambio de contraseña
      await transporter.sendMail({
        to: user.email,
        subject: 'Tu contraseña ha sido cambiada - Hako',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="https://i.imgur.com/0y0y0y0.png" alt="Hako Logo" style="height: 48px; margin-bottom: 8px;"/>
              <h2 style="color: #d32f2f; margin: 0;">¡Tu contraseña ha sido cambiada!</h2>
            </div>
            <p style="font-size: 17px; color: #222;">Hola <b>${user.nombre}</b>,</p>
            <p style="font-size: 16px; color: #444;">Te informamos que la contraseña de tu cuenta ha sido cambiada correctamente. Si no realizaste este cambio, por favor contacta a soporte de inmediato.</p>
            <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;">
              <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Correo:</b> ${user.email}</p>
              <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Fecha y hora:</b> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' })}</p>
            </div>
            <p style="font-size: 15px; color: #444;">Si no fuiste tú, cambia tu contraseña inmediatamente y avisa a nuestro equipo.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;"/>
            <footer style="font-size: 13px; color: #888; text-align: center;">
              <p>¿Tienes dudas? Contáctanos en <a href="mailto:soporte@hako.com" style="color: #d32f2f; text-decoration: none;">soporte@hako.com</a></p>
              <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
            </footer>
          </div>
        `
      });
      return res.json({ message: 'Contraseña establecida correctamente.' });
    }
    // Para usuarios normales, ambos campos son obligatorios
    if (!actual || !nueva) {
      return res.status(400).json({ error: 'Debes proporcionar la contraseña actual y la nueva.' });
    }
    // Verificar contraseña actual
    const match = await bcrypt.compare(actual, user.contraseña);
    if (!match) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }
    // Validar nueva contraseña (mínimo 8 caracteres, mayúscula, minúscula, número, símbolo)
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!regex.test(nueva)) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.' });
    }
    // Hashear y guardar nueva contraseña
    user.contraseña = await bcrypt.hash(nueva, 12);
    await user.save();
    // Enviar correo de notificación de cambio de contraseña
    await transporter.sendMail({
      to: user.email,
      subject: 'Tu contraseña ha sido cambiada - Hako',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://i.imgur.com/0y0y0y0.png" alt="Hako Logo" style="height: 48px; margin-bottom: 8px;"/>
            <h2 style="color: #d32f2f; margin: 0;">¡Tu contraseña ha sido cambiada!</h2>
          </div>
          <p style="font-size: 17px; color: #222;">Hola <b>${user.nombre}</b>,</p>
          <p style="font-size: 16px; color: #444;">Te informamos que la contraseña de tu cuenta ha sido cambiada correctamente. Si no realizaste este cambio, por favor contacta a soporte de inmediato.</p>
          <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;">
            <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Correo:</b> ${user.email}</p>
            <p style="margin: 0 0 8px 0; font-size: 15px;"><b>Fecha y hora:</b> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' })}</p>
          </div>
          <p style="font-size: 15px; color: #444;">Si no fuiste tú, cambia tu contraseña inmediatamente y avisa a nuestro equipo.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;"/>
          <footer style="font-size: 13px; color: #888; text-align: center;">
            <p>¿Tienes dudas? Contáctanos en <a href="mailto:soporte@hako.com" style="color: #d32f2f; text-decoration: none;">soporte@hako.com</a></p>
            <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
          </footer>
        </div>
      `
    });
    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Recuperación de contraseña: solicitar reseteo
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Debes proporcionar un correo electrónico.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // No revelar si el usuario existe o no
      return res.json({ message: 'Si el correo está registrado, recibirás un email con instrucciones.' });
    }
    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hora
    await user.save();
    // Enviar correo
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Recupera tu contraseña - Hako',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://i.imgur.com/0y0y0y0.png" alt="Hako Logo" style="height: 48px; margin-bottom: 8px;"/>
            <h2 style="color: #d32f2f; margin: 0;">Recupera tu contraseña</h2>
          </div>
          <p style="font-size: 17px; color: #222;">Hola <b>${user.nombre}</b>,</p>
          <p style="font-size: 16px; color: #444;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no fuiste tú, ignora este mensaje.</p>
          <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin: 24px 0; border-left: 4px solid #d32f2f;">
            <p style="margin: 0 0 8px 0; font-size: 15px;">Para restablecer tu contraseña, haz clic en el siguiente botón:</p>
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #db554e, #c04c3e); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 12px;">Restablecer contraseña</a>
            <p style="margin: 16px 0 0 0; font-size: 14px; color: #888;">Este enlace expirará en 1 hora.</p>
          </div>
          <p style="font-size: 15px; color: #444;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px 0;"/>
          <footer style="font-size: 13px; color: #888; text-align: center;">
            <p>¿Tienes dudas? Contáctanos en <a href="mailto:soporte@hako.com" style="color: #d32f2f; text-decoration: none;">soporte@hako.com</a></p>
            <p>Equipo Hako &copy; ${new Date().getFullYear()}</p>
          </footer>
        </div>
      `
    });
    res.json({ message: 'Si el correo está registrado, recibirás un email con instrucciones.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Recuperación de contraseña: restablecer
exports.resetPassword = async (req, res) => {
  try {
    const { token, nueva } = req.body;
    if (!token || !nueva) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios.' });
    }
    // Buscar usuario con token válido y no expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+contraseña');
    if (!user) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha expirado.' });
    }
    // Validar nueva contraseña (mínimo 8 caracteres, mayúscula, minúscula, número, símbolo)
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!regex.test(nueva)) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.' });
    }
    user.contraseña = await bcrypt.hash(nueva, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.authProvider = 'local';
    await user.save();
    res.json({ message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 