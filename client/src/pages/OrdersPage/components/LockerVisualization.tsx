import React from 'react';
import Locker3DCanvas from '../../../components/Locker3DCanvas';

interface LockerVisualizationProps {
  locker: any;
  index: number;
  isExistingLocker: boolean;
  selectedProductId?: string | null;
}

const LockerVisualization: React.FC<LockerVisualizationProps> = ({
  locker,
  index,
  isExistingLocker,
  selectedProductId
}) => {
  const lockerNumber = parseInt(locker.id.replace('locker_', ''));
  
  return (
    <div key={locker.id} className="col-md-6 mb-4">
      <div className={`card ${isExistingLocker ? 'border-success' : 'border-primary'}`}>
        <div className={`card-header ${isExistingLocker ? 'bg-success' : 'bg-primary'} text-white`}>
          <div className="d-flex justify-content-between align-items-center">
            <strong>
              {isExistingLocker ? (
                <>
                  <i className="bi bi-arrow-repeat me-1"></i>
                  Casillero {lockerNumber} (Existente)
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-1"></i>
                  Casillero {lockerNumber} (Nuevo)
                </>
              )}
            </strong>
            <span>Slots: {locker.usedSlots}/27</span>
          </div>
        </div>
        <div className="card-body">
          <Locker3DCanvas 
            bin={locker}
            selectedProductId={selectedProductId}
          />
          
          {/* Barra de progreso de ocupación del casillero */}
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted">
                <i className="bi bi-box me-1"></i>
                Ocupación del casillero
              </small>
              <small className="text-muted">
                {locker.usedSlots}/27 slots ({Math.round((locker.usedSlots / 27) * 100)}%)
              </small>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div 
                className={`progress-bar ${locker.usedSlots / 27 >= 0.8 ? 'bg-danger' : locker.usedSlots / 27 >= 0.6 ? 'bg-warning' : 'bg-success'}`}
                role="progressbar" 
                style={{ width: `${(locker.usedSlots / 27) * 100}%` }}
                aria-valuenow={locker.usedSlots} 
                aria-valuemin={0} 
                aria-valuemax={27}
              ></div>
            </div>
          </div>
          
          {/* Información adicional para casilleros existentes */}
          {isExistingLocker && (
            <div className="mt-2">
              <small className="text-success">
                <i className="bi bi-info-circle me-1"></i>
                Productos nuevos agregados a este casillero existente
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockerVisualization; 