import React from 'react';
import { Modal } from 'react-bootstrap';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert';
  variant?: 'primary' | 'danger' | 'warning' | 'success' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'confirm',
  variant = 'primary'
}) => {
  return (
    <Modal show={show} onHide={onCancel || onConfirm} centered backdrop="static">
      <Modal.Header closeButton={type === 'confirm'}>
        <Modal.Title className={`text-${variant}`}>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ whiteSpace: 'pre-line' }}>{message}</div>
      </Modal.Body>
      <Modal.Footer>
        {type === 'confirm' && onCancel && (
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            {cancelText}
          </button>
        )}
        <button className={`btn btn-${variant}`} type="button" onClick={onConfirm}>
          {type === 'alert' ? 'Aceptar' : confirmText}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
