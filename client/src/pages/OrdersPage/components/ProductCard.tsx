import { getDimensiones, tieneDimensiones } from '../utils/productUtils';

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
  const isClaimed = item.isClaimed || item.status === 'claimed' || item.status === 'picked_up';
  // Reservado por administración: status='reserved' pero no fue el usuario quien lo reservó
  // Se detecta cuando isReserved=true y el producto tiene assignedLocker sin que el usuario lo haya elegido,
  // O simplemente cuando status==='reserved' (el usuario no puede reservar directamente — eso lo hace el scheduler)
  const isAdminReserved = item.status === 'reserved' && !isClaimed;

  return (
    <div className={`card shadow-sm mb-3 ${isRecentlyUnlocked ? 'border-success border-2' : ''} ${isAdminReserved ? 'border-warning border-2' : ''}`}>
      {isRecentlyUnlocked && (
        <div className="card-header bg-success text-white text-center py-2">
          <i className="bi bi-unlock me-2"></i>
          <strong>Producto Recién Desbloqueado</strong>
        </div>
      )}
      {isAdminReserved && !isRecentlyUnlocked && (
        <div className="card-header bg-warning text-dark text-center py-2">
          <i className="bi bi-shield-lock me-2"></i>
          <strong>Reservado por Administración</strong>
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
            </div>
          </div>
          <div className="col-md-2 text-center">
            <div className="mb-1">
              <strong>Producto:</strong> {item.individualIndex}/{item.totalInOrder}
            </div>
            <div className="mb-1">
              <span className={`badge ${
                isClaimed
                  ? 'bg-success'
                  : isAdminReserved
                  ? 'bg-warning text-dark'
                  : yaEstaEnReserva
                  ? 'bg-warning'
                  : item.assigned_locker
                  ? 'bg-warning'
                  : isRecentlyUnlocked
                  ? 'bg-success'
                  : 'bg-info'
              }`}>
                {isClaimed
                  ? 'Listo para recoger'
                  : isAdminReserved
                  ? 'Reservado (Admin)'
                  : yaEstaEnReserva
                  ? 'En Reserva'
                  : item.assigned_locker
                  ? 'Reservado'
                  : isRecentlyUnlocked
                  ? 'Disponible (Recién Desbloqueado)'
                  : 'Disponible'}
              </span>
            </div>
            {isClaimed && item.assigned_locker && (
              <div>
                <span className="badge bg-primary">Casillero {item.assigned_locker}</span>
              </div>
            )}
            {isAdminReserved && item.assigned_locker && (
              <div>
                <span className="badge bg-primary">Casillero {item.assigned_locker}</span>
              </div>
            )}
          </div>
          <div className="col-md-3">
            {/* Bloquear cualquier acción si fue reservado por admin */}
            {isAdminReserved ? (
              <div className="text-center">
                <i className="bi bi-shield-lock text-warning fs-4 mb-1 d-block"></i>
                <span className="badge bg-warning text-dark d-block mb-1">Ya fue reservado</span>
                <small className="text-muted d-block">
                  La administración ha gestionado este producto.<br />
                  Pronto recibirás instrucciones.
                </small>
              </div>
            ) : !isClaimed && !item.assigned_locker && !yaEstaEnReserva ? (
              <div className="d-flex flex-column gap-2">
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
                <span className="badge bg-success">Listo para recoger</span>
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