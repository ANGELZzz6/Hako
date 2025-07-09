import React, { useState, type ReactElement } from 'react';
import type { Locker3D, PackedItem } from '../services/gridPackingService';
import './Locker3DVisualization.css';

interface Locker3DVisualizationProps {
  bin: Locker3D;
  showDetails?: boolean;
  selectedProductId?: string | null;
  onItemClick?: (item: PackedItem) => void;
}

const GRID = 3;

const getProductColor = (productId: string) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#7FB3D5', '#F7CA18', '#B9770E'
  ];
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = productId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function buildSlotGrid(bin: Locker3D) {
  const grid: { productId: string | null; productName?: string }[][][] = [];
  for (let x = 0; x < GRID; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID; y++) {
      grid[x][y] = [];
      for (let z = 0; z < GRID; z++) {
        grid[x][y][z] = { productId: null };
      }
    }
  }
  bin.packedProducts.forEach(item => {
    const { x, y, z } = item.position;
    const { x: sx, y: sy, z: sz } = item.orientation;
    for (let dx = 0; dx < sx; dx++) {
      for (let dy = 0; dy < sy; dy++) {
        for (let dz = 0; dz < sz; dz++) {
          const px = x + dx, py = y + dy, pz = z + dz;
          if (px < GRID && py < GRID && pz < GRID) {
            grid[px][py][pz] = { productId: item.product.id, productName: item.product.name };
          }
        }
      }
    }
  });
  return grid;
}

const Locker3DVisualization: React.FC<Locker3DVisualizationProps> = ({ bin, showDetails = true, selectedProductId = null, onItemClick }) => {
  const [hovered, setHovered] = useState<{ x: number; y: number; z: number } | null>(null);
  const slotGrid = buildSlotGrid(bin);

  // Renderiza los 3 planos (niveles Z) de la cuadrícula
  const renderPlanes = (): ReactElement => {
    const planes: ReactElement[] = [];
    for (let z = GRID - 1; z >= 0; z--) { // De arriba hacia abajo
      planes.push(
        <div key={`plane-z${z}`} className="locker-plane">
          <div className="plane-label">Nivel Z={z}</div>
          <div className="plane-grid">
            {[...Array(GRID)].map((_, y) => (
              <div key={y} className="plane-row">
                {[...Array(GRID)].map((_, x) => {
                  const slot = slotGrid[x][y][z];
                  const isHovered = hovered && hovered.x === x && hovered.y === y && hovered.z === z;
                  const isSelected = selectedProductId && slot.productId === selectedProductId;
                  const isOccupied = !!slot.productId;
                  let color = '#e0e0e0';
                  if (isOccupied) {
                    color = isSelected ? '#FFD600' : getProductColor(slot.productId!);
                  }
                  return (
                    <div
                      key={`slot-${x}-${y}-${z}`}
                      className={`plane-slot${isHovered ? ' hovered' : ''}${isSelected ? ' selected' : ''}`}
                      style={{ background: color, opacity: isOccupied ? 1 : 0.3, border: isHovered ? '2px solid #333' : '1px solid #bbb' }}
                      onMouseEnter={() => setHovered({ x, y, z })}
                      onMouseLeave={() => setHovered(null)}
                      title={slot.productId ? slot.productName : 'Slot vacío'}
                      onClick={() => {
                        if (isOccupied && onItemClick) {
                          const packed = bin.packedProducts.find(p => p.product.id === slot.productId);
                          if (packed) onItemClick(packed);
                        }
                      }}
                    >
                      {slot.productId && isHovered && (
                        <span className="iso-tooltip">{slot.productName}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return <div className="locker-planes-3d">{planes}</div>;
  };

  return (
    <div className="locker-3d-visualization">
      <div className="iso-legend mb-2">
        <span className="legend-slot filled"></span> Slot ocupado
        <span className="legend-slot empty ms-3"></span> Slot vacío
        <span className="legend-slot selected ms-3"></span> Producto seleccionado
      </div>
      {renderPlanes()}
      {showDetails && (
        <div className="locker-details mt-3">
          <div><strong>Slots usados:</strong> {bin.usedSlots} / 27</div>
          <div><strong>Productos:</strong> {bin.packedProducts.length}</div>
        </div>
      )}
    </div>
  );
};

export default Locker3DVisualization; 