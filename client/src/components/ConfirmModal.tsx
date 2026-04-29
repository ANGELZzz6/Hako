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
  /** En móvil renderiza como bottom-sheet. En desktop se mantiene centrada modal-sm. */
  bottomSheet?: boolean;
  size?: 'sm' | 'lg' | 'xl';
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
  variant = 'primary',
  bottomSheet = false,
  size,
}) => {
  return (
    <>
      {/* Inyectar estilos de bottom-sheet solo cuando se necesiten */}
      {bottomSheet && (
        <style>{`
          @media (max-width: 768px) {
            .confirm-bottom-sheet .modal-dialog {
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            .confirm-bottom-sheet .modal-content {
              border-radius: 20px 20px 0 0 !important;
              border: none !important;
              padding-bottom: env(safe-area-inset-bottom, 8px);
            }
            .confirm-bottom-sheet .modal-dialog-centered {
              align-items: flex-end !important;
              min-height: 100%;
            }
          }
          @media (min-width: 769px) {
            .confirm-bottom-sheet .modal-dialog {
              max-width: 400px !important;
            }
          }
        `}</style>
      )}
      <Modal
        show={show}
        onHide={onCancel || onConfirm}
        centered
        backdrop="static"
        scrollable
        size={size}
        dialogClassName={bottomSheet ? 'confirm-bottom-sheet' : undefined}
      >
        <Modal.Header closeButton={type === 'confirm'}>
          <Modal.Title className={`text-${variant}`}>
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ whiteSpace: 'pre-line' }}>{message}</div>
        </Modal.Body>
        <Modal.Footer className="flex-column flex-sm-row">
          {type === 'confirm' && onCancel && (
            <button className="btn btn-secondary w-100 w-sm-auto mb-2 mb-sm-0" type="button" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className={`btn btn-${variant} w-100 w-sm-auto`} type="button" onClick={onConfirm}>
            {type === 'alert' ? 'Aceptar' : confirmText}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ConfirmModal;
