import React from 'react';
import { getDimensiones, getVolumen, tieneDimensiones } from '../utils/productUtils';

interface ProductCardProps {
  item: any;
  index: number;
  selectedProduct: any;
  isRecentlyUnlocked: boolean;
  yaEstaEnReserva: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  item,
  index,
  selectedProduct,
  isRecentlyUnlocked,
  yaEstaEnReserva
}) => {
  const isClaimed = item.isClaimed || false;
  
  return (
    <div className={`card shadow-sm mb-3 ${isRecentlyUnlocked ? 'border-success border-2' : ''}`}>
      {isRecentlyUnlocked && (
        <div className="card-header bg-success text-white text-center py-2">
          <i className="bi bi-unlock me-2"></i>
          <strong>Producto Recién Desbloqueado</strong>
        </div>
      )}
      <div className="card-body">
        <div className="row align-items-center">
          <div className="col-md-2">
            <img 
              src={item.product.imagen_url} 
              alt={item.product?.nombre} 
              className="img-fluid rounded"
              style={{ width: 80, height: 80, objectFit: 'cover' }} 
            />
          </div>
          <div className="col-md-3">
            <h6 className="mb-1">{item.product?.nombre}</h6>
            <p className="text-muted mb-1">{item.product.descripcion}</p>
            
            {/* Mostrar variantes si existen */}
            {item.variants && Object.keys(item.variants).length > 0 && (
              <div className="mb-2">
                <small className="text-muted">
                  <strong>Variantes:</strong>
                </small>
                <div className="d-flex gap-1 flex-wrap">
                  {Object.entries(item.variants).map(([key, value]) => (
                    <span key={key} className="badge bg-warning text-dark">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="d-flex gap-2 flex-wrap">
              <span className="badge bg-primary">${item.unit_price.toLocaleString('es-CO')}</span>
              {(() => {
                const d = getDimensiones(item);
                return d ? (
                  <span className="badge bg-info">
                    {d.largo}×{d.ancho}×{d.alto} cm
                  </span>
                ) : null;
              })()}
              {(() => {
                const v = getVolumen(item);
                return v ? (
                  <span className="badge bg-secondary">
                    {(v / 1000).toFixed(1)} L
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div className="col-md-2 text-center">
            <div className="mb-1">
              <strong>Producto:</strong> {item.individualIndex}/{item.totalInOrder}
            </div>
            <div className="mb-1">
              <span className={`badge ${isClaimed ? 'bg-success' : yaEstaEnReserva ? 'bg-warning' : item.assigned_locker ? 'bg-warning' : isRecentlyUnlocked ? 'bg-success' : 'bg-info'}`}>
                {isClaimed ? 'Reclamado' : yaEstaEnReserva ? 'En Reserva' : item.assigned_locker ? 'Reservado' : isRecentlyUnlocked ? 'Disponible (Recién Desbloqueado)' : 'Disponible'}
              </span>
            </div>
            {isClaimed && item.assigned_locker && (
              <div>
                <span className="badge bg-primary">Casillero {item.assigned_locker}</span>
              </div>
            )}
          </div>
          <div className="col-md-3">
            {!isClaimed && !item.assigned_locker && !yaEstaEnReserva ? (
              <div className="d-flex flex-column gap-2">
                {/* Producto automáticamente seleccionado */}
                <div className="d-flex align-items-center gap-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`select-${index}`}
                      checked={selectedProduct?.quantity === 1}
                      disabled={true}
                    />
                    <label className="form-check-label small" htmlFor={`select-${index}`}>
                      Seleccionado automáticamente
                    </label>
                  </div>
                </div>
                
                {selectedProduct && (
                  <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 small">Casillero:</label>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-primary">
                        Casillero {selectedProduct.lockerNumber}
                      </span>
                      <small className="text-muted">
                        (Optimizado automáticamente)
                      </small>
                    </div>
                  </div>
                )}
                
                {selectedProduct && !tieneDimensiones(item) && (
                  <small className="text-warning">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Sin dimensiones
                  </small>
                )}
              </div>
            ) : yaEstaEnReserva ? (
              <div className="text-center">
                <span className="badge bg-warning">Ya en reserva</span>
                <br />
                <small className="text-muted">No disponible para nueva reserva</small>
              </div>
            ) : isClaimed ? (
              <div className="text-center">
                <span className="badge bg-success">Ya reclamado</span>
              </div>
            ) : item.assigned_locker ? (
              <div className="text-center">
                <span className="badge bg-warning">Ya reservado</span>
              </div>
            ) : null}
          </div>
          <div className="col-md-2 text-center">
            {isClaimed && item.assigned_locker && (
              <div>
                <span className="badge bg-primary mb-2">Casillero {item.assigned_locker}</span>
                <br />
                <small className="text-muted">Asignado</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 