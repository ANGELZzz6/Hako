import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface ProfileData {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  genero?: string;
  bio?: string;
}

const ProfilePage: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    fechaNacimiento: '',
    genero: '',
    bio: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (currentUser) {
      setProfileData({
        nombre: currentUser.nombre || '',
        email: currentUser.email || '',
        telefono: '',
        direccion: '',
        fechaNacimiento: '',
        genero: '',
        bio: ''
      });
    }
  }, [currentUser, isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Simular actualización (aquí iría la llamada real al backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage('¡Perfil actualizado exitosamente! 💕');
      setIsEditing(false);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      setProfileData({
        nombre: currentUser.nombre || '',
        email: currentUser.email || '',
        telefono: '',
        direccion: '',
        fechaNacimiento: '',
        genero: '',
        bio: ''
      });
    }
    setIsEditing(false);
    setError('');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header del perfil */}
        <div className="profile-header">
          <div className="profile-avatar">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{currentUser?.nombre}</h1>
            <p className="profile-email">{currentUser?.email}</p>
            <div className="profile-stats">
              <span className="stat">
                <i className="bi bi-calendar-check"></i>
                Miembro desde {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Mensajes de éxito/error */}
        {message && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            <i className="bi bi-check-circle me-2"></i>
            {message}
            <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
          </div>
        )}

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* Formulario de perfil */}
        <div className="profile-form-container">
          <div className="form-header">
            <h2>Información Personal</h2>
            {!isEditing && (
              <button 
                className="btn btn-primary edit-btn"
                onClick={() => setIsEditing(true)}
              >
                <i className="bi bi-pencil-square me-2"></i>
                Editar Perfil
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="row g-3">
              {/* Nombre */}
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-person me-2"></i>
                  Nombre completo
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="nombre"
                  value={profileData.nombre}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              {/* Email */}
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-envelope me-2"></i>
                  Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </div>

              {/* Teléfono */}
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-telephone me-2"></i>
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="form-control"
                  name="telefono"
                  value={profileData.telefono}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+57 300 123 4567"
                />
              </div>

              {/* Fecha de nacimiento */}
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-calendar me-2"></i>
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  className="form-control"
                  name="fechaNacimiento"
                  value={profileData.fechaNacimiento}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>

              {/* Género */}
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-gender-ambiguous me-2"></i>
                  Género
                </label>
                <select
                  className="form-select"
                  name="genero"
                  value={profileData.genero}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero-no-decir">Prefiero no decir</option>
                </select>
              </div>

              {/* Dirección */}
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-geo-alt me-2"></i>
                  Dirección
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="direccion"
                  value={profileData.direccion}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Ciudad, País"
                />
              </div>

              {/* Bio */}
              <div className="col-12">
                <label className="form-label">
                  <i className="bi bi-chat-quote me-2"></i>
                  Biografía
                </label>
                <textarea
                  className="form-control"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Cuéntanos un poco sobre ti..."
                  maxLength={500}
                />
                <div className="form-text">
                  {profileData.bio?.length || 0}/500 caracteres
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            {isEditing && (
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Sección de seguridad */}
        <div className="security-section">
          <h3>
            <i className="bi bi-shield-lock me-2"></i>
            Seguridad
          </h3>
          <div className="security-options">
            <button className="btn btn-outline-primary">
              <i className="bi bi-key me-2"></i>
              Cambiar Contraseña
            </button>
            <button className="btn btn-outline-warning">
              <i className="bi bi-bell me-2"></i>
              Notificaciones
            </button>
            <button className="btn btn-outline-info">
              <i className="bi bi-gear me-2"></i>
              Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 