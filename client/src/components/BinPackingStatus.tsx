import React, { useState, useEffect } from 'react';
import orderService from '../services/orderService';
import './BinPackingStatus.css';

interface BinPackingStatusProps {
  orders: any[];
}

const BinPackingStatus: React.FC<BinPackingStatusProps> = ({ orders }) => {
  const [lockerStats, setLockerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocker, setSelectedLocker] = useState<number | null>(null);
  const [testProduct, setTestProduct] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchLockerStats();
  }, [orders]);

  const fetchLockerStats = async () => {
    try {
      setLoading(true);
      const stats = await orderService.getSimpleLockerStats();
      setLockerStats(stats);
    } catch (error) {
      console.error('Error fetching locker stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLockerClick = (lockerNumber: number) => {
    setSelectedLocker(selectedLocker === lockerNumber ? null : lockerNumber);
  };

  const getLockerColor = (usagePercentage: number, canFitMore: boolean) => {
    if (!canFitMore) return '#ff4444'; // Rojo - no cabe más
    if (usagePercentage > 80) return '#ffaa00'; // Naranja - casi lleno
    if (usagePercentage > 50) return '#ffff00'; // Amarillo - medio lleno
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

  const testLockerCapacity = async (lockerNumber: number) => {
    if (!testProduct) return;

    try {
      const result = await orderService.validateLockerCapacity(lockerNumber, testProduct);
      setTestResult(result);
    } catch (error) {
      console.error('Error testing locker capacity:', error);
      alert('Error al probar capacidad del casillero');
    }
  };

  const findBestLockerForProduct = async () => {
    if (!testProduct) return;

    try {
      const result = await orderService.findBestLocker(testProduct);
      if (result.success) {
        alert(`Mejor casillero: ${result.bestLocker?.number} (Score: ${result.bestLocker?.score})`);
      } else {
        alert('No hay casilleros disponibles para este producto');
      }
    } catch (error) {
      console.error('Error finding best locker:', error);
      alert('Error al encontrar mejor casillero');
    }
  };

  if (loading) {
    return (
      <div className="bin-packing-status">
        <div className="loading">Cargando estadísticas de Bin Packing...</div>
      </div>
    );
  }

  return (
    <div className="bin-packing-status">
      <div className="bin-packing-header">
        <h3>Estado de Casilleros (Bin Packing 3D)</h3>
        {lockerStats && (
          <div className="bin-packing-stats">
            <div className="stat-item">
              <span className="stat-label">Casilleros usados:</span>
              <span className="stat-value">{lockerStats.generalStats.usedLockers}/12</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Eficiencia total:</span>
              <span className="stat-value">{lockerStats.generalStats.overallEfficiency}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Volumen usado:</span>
              <span className="stat-value">{formatVolume(lockerStats.generalStats.totalUsedVolume)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Panel de prueba de productos */}
      <div className="test-panel">
        <h4>Probar Producto</h4>
        <div className="test-inputs">
          <input
            type="number"
            placeholder="Largo (cm)"
            onChange={(e) => setTestProduct(prev => ({ ...prev, dimensiones: { ...prev?.dimensiones, largo: Number(e.target.value) } }))}
          />
          <input
            type="number"
            placeholder="Ancho (cm)"
            onChange={(e) => setTestProduct(prev => ({ ...prev, dimensiones: { ...prev?.dimensiones, ancho: Number(e.target.value) } }))}
          />
          <input
            type="number"
            placeholder="Alto (cm)"
            onChange={(e) => setTestProduct(prev => ({ ...prev, dimensiones: { ...prev?.dimensiones, alto: Number(e.target.value) } }))}
          />
          <button 
            onClick={findBestLockerForProduct}
            disabled={!testProduct?.dimensiones?.largo || !testProduct?.dimensiones?.ancho || !testProduct?.dimensiones?.alto}
          >
            Encontrar Mejor Casillero
          </button>
        </div>
      </div>

      <div className="lockers-grid">
        {lockerStats?.lockers.map((locker: any) => (
          <div
            key={locker.number}
            className={`locker-item ${selectedLocker === locker.number ? 'selected' : ''} ${!locker.canFitMore ? 'full' : ''}`}
            onClick={() => handleLockerClick(locker.number)}
            style={{ borderColor: getLockerColor(locker.usagePercentage, locker.canFitMore) }}
          >
            <div className="locker-header">
              <span className="locker-number">Casillero {locker.number}</span>
              <span className="locker-usage">{locker.usagePercentage}%</span>
            </div>
            
            <div className="locker-progress">
              <div 
                className="progress-bar"
                style={{ 
                  width: `${locker.usagePercentage}%`,
                  backgroundColor: getLockerColor(locker.usagePercentage, locker.canFitMore)
                }}
              />
            </div>
            
            <div className="locker-info">
              <div className="volume-info">
                <small>{formatVolume(locker.usedVolume)} / {formatVolume(locker.maxVolume)}</small>
              </div>
              <div className="bin-packing-status">
                <small>{locker.canFitMore ? 'Cabe más' : 'LLENO'}</small>
              </div>
            </div>

            {!locker.canFitMore && (
              <div className="full-indicator">
                <span>LLENO (Bin Packing)</span>
              </div>
            )}

            {testProduct && (
              <button 
                className="test-button"
                onClick={(e) => {
                  e.stopPropagation();
                  testLockerCapacity(locker.number);
                }}
              >
                Probar
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedLocker && (
        <div className="locker-details">
          <h4>Detalles del Casillero {selectedLocker} (Bin Packing)</h4>
          <div className="locker-products">
            {lockerStats?.lockers.find((l: any) => l.number === selectedLocker)?.products?.map((product: any, index: number) => (
              <div key={index} className="product-item">
                <div className="product-info">
                  <span className="product-name">{product.name}</span>
                  <span className="product-quantity">x{product.quantity}</span>
                  <span className="product-volume">{formatVolume(product.volume)}</span>
                </div>
                <div className="product-position">
                  <small>Pos: ({product.x}, {product.y}, {product.z})</small>
                  <small>Dim: {product.width}×{product.height}×{product.depth} cm</small>
                </div>
              </div>
            )) || <p>No hay productos en este casillero</p>}
          </div>
        </div>
      )}

      {testResult && (
        <div className="test-result">
          <h4>Resultado de Prueba</h4>
          <div className="result-info">
            <p><strong>Casillero:</strong> {testResult.lockerNumber}</p>
            <p><strong>¿Cabe?</strong> {testResult.canFit ? '✅ Sí' : '❌ No'}</p>
            {testResult.canFit && (
              <>
                <p><strong>Posición:</strong> ({testResult.position?.x}, {testResult.position?.y}, {testResult.position?.z})</p>
                <p><strong>Orientación:</strong> {testResult.orientation?.width}×{testResult.orientation?.height}×{testResult.orientation?.depth} cm</p>
              </>
            )}
            {testResult.reason && <p><strong>Razón:</strong> {testResult.reason}</p>}
          </div>
        </div>
      )}

      <div className="bin-packing-legend">
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
          <span>LLENO (Bin Packing)</span>
        </div>
      </div>
    </div>
  );
};

export default BinPackingStatus; 