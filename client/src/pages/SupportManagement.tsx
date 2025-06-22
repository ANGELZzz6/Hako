import React, { useState } from 'react';
import './SupportManagement.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const SupportPage = () => {
  const [form, setForm] = useState({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [enviado, setEnviado] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    // Aquí iría la lógica para enviar el formulario a la API
  };

  return (
    <div className="support-management">
      <main className="support-main-content">
        <div className="container" style={{ maxWidth: 600 }}>
          <h2 className="mb-4 text-center">¿Necesitas ayuda?</h2>
          <p className="mb-4 text-center">Completa el siguiente formulario y nuestro equipo de soporte te contactará lo antes posible.</p>
          {enviado ? (
            <div className="alert alert-success text-center">
              <i className="bi bi-check-circle me-2"></i>
              ¡Tu solicitud ha sido enviada! Pronto nos pondremos en contacto contigo.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow-sm">
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Correo electrónico</label>
                <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Asunto</label>
                <input type="text" className="form-control" name="asunto" value={form.asunto} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Mensaje</label>
                <textarea className="form-control" name="mensaje" rows={4} value={form.mensaje} onChange={handleChange} required />
              </div>
              <button type="submit" className="btn btn-primary w-100">Enviar solicitud</button>
            </form>
          )}
          <div className="mt-5 text-center">
            <h5>¿Prefieres contactarnos directamente?</h5>
            <p className="mb-1"><i className="bi bi-envelope me-2"></i>soporte@hako.com</p>
            <p className="mb-1"><i className="bi bi-telephone me-2"></i>(123) 456-7890</p>
            <p><i className="bi bi-geo-alt me-2"></i>Calle Principal #123, Ciudad</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SupportPage; 