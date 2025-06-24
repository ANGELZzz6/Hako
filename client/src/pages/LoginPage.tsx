import React, { useState } from 'react';
import '../App.css'; // Asegúrate de que los estilos generales se apliquen
import '@fontsource/montserrat'; // Importar fuente
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validarEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validarContraseña = (contraseña: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(contraseña);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);
    if (!validarEmail(email)) {
      setError('El correo electrónico no es válido.');
      setLoading(false);
      return;
    }
    if (!validarContraseña(contraseña)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.');
      setLoading(false);
      return;
    }
    try {
      const res = await authService.login(email, contraseña);
      // Login exitoso - guardar token y usuario directamente
      if (res.token && res.user) {
        authService.setToken(res.token);
        const safeUser = {
          id: res.user.id,
          nombre: res.user.nombre,
          email: res.user.email,
          role: res.user.role
        };
        sessionStorage.setItem('user', JSON.stringify(safeUser));
        setMensaje(res.message || '¡Inicio de sesión exitoso!');
        // Redirigir a dashboard o página principal
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Credenciales inválidas')) {
        setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
      } else if (err.message && err.message.includes('Cuenta temporalmente bloqueada')) {
        setError(err.message);
      } else {
        setError('Error en el inicio de sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container light-gray-bg">
      <div className="auth-form-card peach-bg rounded-card">
        <div className="brand-logo text-center mb-4">
          <span className="logo-japanese red-text">箱</span><span className="brand-text black-text">hako</span>
        </div>
        <h2 className="text-center mb-4">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input type="email" className="form-control pill-input text-center" placeholder="Correo Electronico" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <input type="password" className="form-control pill-input text-center" placeholder="Contraseña" value={contraseña} onChange={e => setContraseña(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-custom-red w-100 mb-3" disabled={loading}>{loading ? 'Ingresando...' : 'Continuar'}</button>
          {mensaje && <div className="alert alert-success text-center">{mensaje}</div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}
          <div className="text-center mb-3">
            <p>o</p>
          </div>
          <button type="button" className="btn btn-google-icon mb-3 d-flex align-items-center justify-content-center">
            <img src="https://cdn-icons-png.flaticon.com/128/300/300221.png" alt="Google logo" />
          </button>
        </form>
        <div className="text-center mt-3">
          <p><a href="#">Se me olvido mi contraseña</a></p>
          <p>¿No tienes cuenta? <a href="/signup">Crear cuenta</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 