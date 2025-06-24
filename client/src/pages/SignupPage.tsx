import React, { useState } from 'react';
import '../App.css'; // Asegúrate de que los estilos generales se apliquen
import '@fontsource/montserrat'; // Importar fuente
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [confirmarContraseña, setConfirmarContraseña] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [codigo, setCodigo] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const navigate = useNavigate();

  const validarNombre = (nombre: string) => /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre);
  const validarEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validarContraseña = (contraseña: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(contraseña);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);
    if (!validarNombre(nombre)) {
      setError('El nombre solo puede contener letras y espacios.');
      setLoading(false);
      return;
    }
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
    if (contraseña !== confirmarContraseña) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }
    try {
      const res = await authService.register(nombre, email, contraseña);
      if (res.verificacionPendiente) {
        setUserEmail(email);
        setStep('verify');
      } else {
        setMensaje(res.message || '¡Registro exitoso!');
      }
    } catch (err: any) {
      setError(err.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.verifyCode(userEmail, codigo);
      setMensaje(res.message || '¡Verificación exitosa!');
      // Redirigir a login o dashboard
      // navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Código incorrecto o expirado.');
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
        <h2 className="text-center mb-4">{step === 'register' ? 'Crear Cuenta' : 'Verifica tu correo'}</h2>
        {step === 'register' ? (
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
            <div className="mb-3">
              <input type="password" className="form-control pill-input text-center" placeholder="Confirmar Contraseña" value={confirmarContraseña} onChange={e => setConfirmarContraseña(e.target.value)} required />
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
        ) : (
          <form onSubmit={handleVerify}>
            <div className="mb-3">
              <input type="text" className="form-control pill-input text-center" placeholder="Código de verificación" value={codigo} onChange={e => setCodigo(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-custom-red w-100 mb-3" disabled={loading}>{loading ? 'Verificando...' : 'Verificar'}</button>
            {mensaje && <div className="alert alert-success text-center">{mensaje}</div>}
            {error && <div className="alert alert-danger text-center">{error}</div>}
          </form>
        )}
        {step === 'register' && (
          <div className="text-center mt-3">
            <p>¿Ya tienes cuenta? <a href="/login">Iniciar Sesión</a></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupPage; 