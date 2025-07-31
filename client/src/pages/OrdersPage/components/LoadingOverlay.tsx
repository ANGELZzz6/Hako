import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  title: string;
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  title,
  message
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
        backdropFilter: 'blur(3px)'
      }}
    >
      <div className="text-center text-white">
        <div className="spinner-border text-light mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">{title}...</span>
        </div>
        <h5 className="mb-2">{title}</h5>
        <p className="mb-0">{message}</p>
        <div className="mt-3">
          <div className="spinner-grow spinner-grow-sm text-light me-2" role="status">
            <span className="visually-hidden">Procesando...</span>
          </div>
          <div className="spinner-grow spinner-grow-sm text-light me-2" role="status" style={{ animationDelay: '0.1s' }}>
            <span className="visually-hidden">Procesando...</span>
          </div>
          <div className="spinner-grow spinner-grow-sm text-light" role="status" style={{ animationDelay: '0.2s' }}>
            <span className="visually-hidden">Procesando...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay; 