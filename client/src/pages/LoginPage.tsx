import React, { useState, useEffect } from 'react';
import '../App.css'; // Asegúrate de que los estilos generales se apliquen
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated } = useAuth();

  // Obtener la página de donde vino el usuario (si existe)
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validarEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validarContraseña = (contraseña: string) => contraseña.trim().length > 0;

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
      setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
      setLoading(false);
      return;
    }
    
    try {
      await login(email, contraseña);
      setMensaje('¡Inicio de sesión exitoso!');
      // Redirigir a la página de donde vino o a la página principal
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
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

  const handleGoogleLogin = async (credentialResponse: any) => {
    try {
      if (!credentialResponse.credential) throw new Error('No se recibió token de Google');
      await loginWithGoogle(credentialResponse.credential);
      setMensaje('¡Inicio de sesión con Google exitoso!');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
    }
  };

  return (
    <div className="auth-page-container light-gray-bg">
      <div className="auth-form-card peach-bg rounded-card">
        <div className="logo-bar-login text-center mb-4">
          <span className="logo-japanese">箱</span><span className="brand-text">hako</span>
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
          <div className="mb-3 d-flex align-items-center justify-content-center">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => {
                setError('Error al iniciar sesión con Google');
              }}
              width="100%"
            />
          </div>
        </form>
        <div className="text-center mt-3">
          <p><Link to="/forgot-password">Se me olvido mi contraseña</Link></p>
          <p>¿No tienes cuenta? <a href="/signup">Crear cuenta</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 