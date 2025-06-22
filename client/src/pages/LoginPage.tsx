import React, { useState } from 'react';
import '../App.css'; // Asegúrate de que los estilos generales se apliquen
import '@fontsource/montserrat'; // Importar fuente
import authService from '../services/authService';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email, contraseña);
      setMensaje(res.message || '¡Inicio de sesión exitoso!');
    } catch (err: any) {
      if (err.message && err.message.includes('Usuario o contraseña incorrectos')) {
        setError('Correo o contraseña incorrectos. Por favor, verifica tus datos.');
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