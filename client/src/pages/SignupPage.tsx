import React, { useState } from 'react';
import '../App.css'; // Asegúrate de que los estilos generales se apliquen
import '@fontsource/montserrat'; // Importar fuente
import authService from '../services/authService';

const SignupPage = () => {
  const [nombre, setNombre] = useState('');
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
      const res = await authService.register(nombre, email, contraseña);
      setMensaje(res.message || '¡Registro exitoso!');
    } catch (err: any) {
      setError(err.message || 'Error en el registro');
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
        <h2 className="text-center mb-4">Crear Cuenta</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input type="text" className="form-control pill-input text-center" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div className="mb-3">
            <input type="email" className="form-control pill-input text-center" placeholder="Correo Electronico" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <input type="password" className="form-control pill-input text-center" placeholder="Contraseña" value={contraseña} onChange={e => setContraseña(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-custom-red w-100 mb-3" disabled={loading}>{loading ? 'Registrando...' : 'Continuar'}</button>
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
          <p>¿Ya tienes cuenta? <a href="/login">Iniciar Sesión</a></p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage; 