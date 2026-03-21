import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import userService from '../services/userService';
import authService from '../services/authService';
import LoadingSpinner from '../components/LoadingSpinner';
import PasswordModal from '../components/PasswordModal';

interface ProfileData {
  nombre: string;
  email: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  genero?: string;
  bio?: string;
  createdAt: string;
}

const ProfilePage: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    nombre: '',
    email: '',
    cedula: '',
    telefono: '',
    direccion: '',
    fechaNacimiento: '',
    genero: '',
    bio: '',
    createdAt: ''
  });

  const isGoogleNoPassword = currentUser?.authProvider === 'google';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    const fetchProfile = async () => {
      if (currentUser) {
        try {
          let userFromDb = await userService.getUserById(currentUser.id);
          if (!userFromDb.id && userFromDb._id) userFromDb.id = userFromDb._id;
          setProfileData({
            nombre: userFromDb.nombre || '',
            email: userFromDb.email || '',
            cedula: userFromDb.cedula || '',
            telefono: userFromDb.telefono || '',
            direccion: userFromDb.direccion || '',
            fechaNacimiento: userFromDb.fechaNacimiento ? new Date(userFromDb.fechaNacimiento).toISOString().slice(0, 10) : '',
            genero: userFromDb.genero || '',
            bio: userFromDb.bio || '',
            createdAt: userFromDb.createdAt || ''
          });
        } catch (err) {
          setError('No se pudo cargar el perfil');
        }
      }
    };
    fetchProfile();
  }, [currentUser, isAuthenticated, isLoading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') return; // No permitir cambios en el email
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
      if (!currentUser) throw new Error('Usuario no autenticado');
      // Excluir el email del objeto enviado para actualización
      const { email, ...restProfileData } = profileData;
      const result = await userService.updateUser(currentUser.id, restProfileData);
      const updatedUser = await userService.getUserById(currentUser.id);
      if (!updatedUser.id && updatedUser._id) updatedUser.id = updatedUser._id;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setMessage('¡Perfil actualizado exitosamente! 💕');
      setIsEditing(false);
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
        cedula: '',
        telefono: '',
        direccion: '',
        fechaNacimiento: '',
        genero: '',
        bio: '',
        createdAt: ''
      });
    }
    setIsEditing(false);
    setError('');
  };

  const handleOpenPasswordModal = () => {
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
  };


  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner message="Verificando autenticación..." />;
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
            <h1 className="profile-name">{profileData.nombre}</h1>
            <p className="profile-email">{profileData.email}</p>
            <div className="profile-stats">
              <span className="stat">
                <i className="bi bi-calendar-check"></i>
                Miembro desde {profileData.createdAt ? new Date(profileData.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
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
                  disabled
                  readOnly
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">
                  <i className="bi bi-person-vcard me-2"></i>
                  Cédula
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="cedula"
                  value={profileData.cedula}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Número de cédula"
                  maxLength={12}
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
                  value={profileData.bio ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e)}
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
            <button className="btn btn-outline-primary" onClick={handleOpenPasswordModal}>
              <i className="bi bi-key me-2"></i>
              Cambiar Contraseña
            </button>
            <button className="btn btn-outline-warning">
              <i className="bi bi-bell me-2"></i>
              Notificaciones
            </button>
          </div>
        </div>

        {/* Modal de cambio de contraseña */}
        <PasswordModal 
          show={showPasswordModal} 
          onHide={handleClosePasswordModal} 
          isGoogleNoPassword={isGoogleNoPassword} 
        />
      </div>
    </div>
  );
};

export default ProfilePage; 