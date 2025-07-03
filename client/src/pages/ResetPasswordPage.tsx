import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [nueva, setNueva] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (nueva !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await AuthService.resetPassword(token || '', nueva);
      setMessage('¡Contraseña restablecida correctamente! Ahora puedes iniciar sesión.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-form-container" style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Restablecer contraseña</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nueva">Nueva contraseña</label>
          <input
            id="nueva"
            type="password"
            className="form-control"
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm">Confirmar contraseña</label>
          <input
            id="confirm"
            type="password"
            className="form-control"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordPage; 