import React, { useState, useEffect } from 'react';
import SimpleLockerService from '../services/simpleLockerService';
import type { LockerStatus } from '../services/simpleLockerService';
import './SimpleLockerStatus.css';

interface SimpleLockerStatusProps {
  orders: any[];
  onLockerChange?: (orderId: string, newLocker: number) => void;
}

const SimpleLockerStatus: React.FC<SimpleLockerStatusProps> = ({ orders, onLockerChange }) => {
  const [lockerAssignments, setLockerAssignments] = useState<Map<number, any[]>>(new Map());
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedLocker, setSelectedLocker] = useState<number | null>(null);

  useEffect(() => {
    // Organizar órdenes por casillero
    const assignments = new Map<number, any[]>();
    
    orders.forEach(order => {
      const lockerNumber = order.casillero || 1;
      if (!assignments.has(lockerNumber)) {
        assignments.set(lockerNumber, []);
      }
      assignments.get(lockerNumber)!.push(order);
    });

    setLockerAssignments(assignments);
    
    // Calcular estadísticas
    const stats = SimpleLockerService.getStatistics(assignments);
    setStatistics(stats);
  }, [orders]);

  const getLockerStatus = (lockerNumber: number): LockerStatus => {
    const items = lockerAssignments.get(lockerNumber) || [];
    const lockerItems = SimpleLockerService.convertToLockerItems(items);
    return SimpleLockerService.getLockerStatus(lockerNumber, lockerItems);
  };

  const handleLockerClick = (lockerNumber: number) => {
    setSelectedLocker(selectedLocker === lockerNumber ? null : lockerNumber);
  };

  const getLockerColor = (status: LockerStatus) => {
    if (status.isFull) return '#ff4444'; // Rojo - lleno
    if (status.usagePercentage > 80) return '#ffaa00'; // Naranja - casi lleno
    if (status.usagePercentage > 50) return '#ffff00'; // Amarillo - medio lleno
    return '#44ff44'; // Verde - disponible
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)} m³`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)} L`;
    }
    return `${volume} cm³`;
  };

  return (
    <div className="simple-locker-status">
      <div className="locker-header">
        <h3>Estado de Casilleros</h3>
        {statistics && (
          <div className="locker-stats">
            <div className="stat-item">
              <span className="stat-label">Casilleros usados:</span>
              <span className="stat-value">{statistics.usedLockers}/12</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Eficiencia total:</span>
              <span className="stat-value">{statistics.overallEfficiency}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Volumen usado:</span>
              <span className="stat-value">{formatVolume(statistics.totalUsedVolume)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="lockers-grid">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(lockerNumber => {
          const status = getLockerStatus(lockerNumber);
          const orders = lockerAssignments.get(lockerNumber) || [];
          
          return (
            <div
              key={lockerNumber}
              className={`locker-item ${selectedLocker === lockerNumber ? 'selected' : ''} ${status.isFull ? 'full' : ''}`}
              onClick={() => handleLockerClick(lockerNumber)}
              style={{ borderColor: getLockerColor(status) }}
            >
              <div className="locker-header">
                <span className="locker-number">Casillero {lockerNumber}</span>
                <span className="locker-usage">{status.usagePercentage}%</span>
              </div>
              
              <div className="locker-progress">
                <div 
                  className="progress-bar"
                  style={{ 
                    width: `${status.usagePercentage}%`,
                    backgroundColor: getLockerColor(status)
                  }}
                />
              </div>
              
              <div className="locker-info">
                <div className="volume-info">
                  <small>{formatVolume(status.usedVolume)} / {formatVolume(status.maxVolume)}</small>
                </div>
                <div className="orders-count">
                  <small>{orders.length} orden{orders.length !== 1 ? 'es' : ''}</small>
                </div>
              </div>

              {status.isFull && (
                <div className="full-indicator">
                  <span>LLENO</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedLocker && (
        <div className="locker-details">
          <h4>Detalles del Casillero {selectedLocker}</h4>
          <div className="locker-orders">
            {lockerAssignments.get(selectedLocker)?.map((order, index) => (
              <div key={order._id || index} className="order-item">
                <div className="order-header">
                  <span className="order-id">Orden #{order.numeroOrden}</span>
                  <span className="order-date">
                    {new Date(order.fechaCreacion).toLocaleDateString()}
                  </span>
                </div>
                <div className="order-products">
                  {order.productos?.map((product: any, pIndex: number) => (
                    <div key={pIndex} className="product-item">
                      <span className="product-name">{product.product?.nombre || 'Producto'}</span>
                      <span className="product-quantity">x{product.quantity}</span>
                      {product.dimensiones && (
                        <span className="product-volume">
                          {formatVolume(product.dimensiones.largo * product.dimensiones.ancho * product.dimensiones.alto)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )) || <p>No hay órdenes en este casillero</p>}
          </div>
        </div>
      )}

      <div className="locker-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#44ff44' }}></div>
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffff00' }}></div>
          <span>Medio lleno</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffaa00' }}></div>
          <span>Casi lleno</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff4444' }}></div>
          <span>Lleno</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleLockerStatus; 