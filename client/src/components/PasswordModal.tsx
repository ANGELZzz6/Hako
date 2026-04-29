import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import userService from '../services/userService';

interface PasswordModalProps {
  show: boolean;
  onHide: () => void;
  isGoogleNoPassword: boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ show, onHide, isGoogleNoPassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(false);
    onHide();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordLoading(true);

    if (!isGoogleNoPassword && (!currentPassword || !newPassword || !confirmPassword)) {
      setPasswordError('Por favor, completa todos los campos.');
      setPasswordLoading(false);
      return;
    }

    if (isGoogleNoPassword && (!newPassword || !confirmPassword)) {
      setPasswordError('Por favor, completa todos los campos.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      setPasswordLoading(false);
      return;
    }

    try {
      const result = await userService.changePassword(isGoogleNoPassword ? '' : currentPassword, newPassword);
      setPasswordSuccess(result.message || (isGoogleNoPassword ? '¡Contraseña establecida exitosamente!' : '¡Contraseña cambiada exitosamente!'));
      setPasswordLoading(false);
      setTimeout(() => handleClose(), 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña');
      setPasswordLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{isGoogleNoPassword ? 'Establecer Contraseña' : 'Cambiar Contraseña'}</Modal.Title>
      </Modal.Header>
      <form onSubmit={handlePasswordChange}>
        <Modal.Body>
          {passwordError && <div className="alert alert-danger py-1">{passwordError}</div>}
          {passwordSuccess && <div className="alert alert-success py-1">{passwordSuccess}</div>}
          {!isGoogleNoPassword && (
            <div className="mb-3">
              <label className="form-label">Contraseña actual</label>
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Nueva contraseña</label>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoFocus={isGoogleNoPassword}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Confirmar nueva contraseña</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="flex-column flex-sm-row">
          <button type="button" className="btn btn-secondary w-100 w-sm-auto mb-2 mb-sm-0" onClick={handleClose} disabled={passwordLoading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary w-100 w-sm-auto" disabled={passwordLoading}>
            {passwordLoading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            ) : null}
            {isGoogleNoPassword ? 'Establecer contraseña' : 'Cambiar contraseña'}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default PasswordModal;
