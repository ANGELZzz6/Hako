import React from 'react';
import '../App.css'; // Asegúrate de que los estilos generales se apliquen
import '@fontsource/montserrat'; // Importar fuente

const SignupPage = () => {
  return (
    <div className="auth-page-container light-gray-bg">
      <div className="auth-form-card peach-bg rounded-card">
        <div className="brand-logo text-center mb-4">
          <span className="logo-japanese red-text">箱</span><span className="brand-text black-text">hako</span>
        </div>
        <h2 className="text-center mb-4">Crear Cuenta</h2>
        <form>
          <div className="mb-3">
            <input type="email" className="form-control pill-input text-center" placeholder="Correo Electronico" required />
          </div>
          <div className="mb-3">
            <input type="text" className="form-control pill-input text-center" placeholder="Documento" required />
          </div>
           <div className="mb-3">
            <input type="tel" className="form-control pill-input text-center" placeholder="Telefono" required />
          </div>
          <div className="mb-3">
            <input type="password" className="form-control pill-input text-center" placeholder="Contraseña" required />
          </div>
          <button type="submit" className="btn btn-custom-red w-100 mb-3">Continuar</button>
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