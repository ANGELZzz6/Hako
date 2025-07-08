import React, { useState, useEffect } from 'react';
import type { Bin3D, PackedItem } from '../services/binPackingService';
import './Locker3DVisualization.css';

interface Locker3DVisualizationProps {
  bin: Bin3D;
  showDetails?: boolean;
  onItemClick?: (item: PackedItem) => void;
}

const Locker3DVisualization: React.FC<Locker3DVisualizationProps> = ({
  bin,
  showDetails = true,
  onItemClick
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');

  const efficiency = Math.round((bin.usedVolume / bin.maxVolume) * 100);
  const unusedVolume = bin.maxVolume - bin.usedVolume;

  // Colores para diferentes productos
  const getProductColor = (productName: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    
    const hash = productName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Calcular posición relativa en el casillero
  const getItemPosition = (item: PackedItem, index: number) => {
    const { orientation } = item;
    const { dimensions } = bin;
    
    // Para productos muy pequeños, usar una escala más grande para visualización
    const scale = Math.min(10, Math.max(3, 200 / Math.max(orientation.length, orientation.width, orientation.height)));
    
    // Calcular dimensiones escaladas
    const scaledLength = orientation.length * scale;
    const scaledWidth = orientation.width * scale;
    const scaledHeight = orientation.height * scale;
    
    // Para vista 2D, distribuir productos en una cuadrícula
    const itemsPerRow = Math.floor((dimensions.length - 20) / (scaledLength + 10));
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    
    const x = 10 + col * (scaledLength + 10);
    const y = 10 + row * (scaledWidth + 10);
    const z = 0;
    
    return {
      x: Math.max(5, Math.min(x, dimensions.length - scaledLength - 5)),
      y: Math.max(5, Math.min(y, dimensions.width - scaledWidth - 5)),
      z: Math.max(5, Math.min(z, dimensions.height - scaledHeight - 5)),
      scale
    };
  };

  const render3DView = () => (
    <div className="locker-3d-container">
      <div className="locker-3d-box">
        {/* Casillero base */}
        <div className="locker-base">
          <div className="locker-walls">
            {/* Pared trasera */}
            <div className="locker-wall back-wall"></div>
            {/* Pared izquierda */}
            <div className="locker-wall left-wall"></div>
            {/* Pared derecha */}
            <div className="locker-wall right-wall"></div>
            {/* Techo */}
            <div className="locker-wall top-wall"></div>
            {/* Piso */}
            <div className="locker-wall floor-wall"></div>
          </div>
          
          {/* Productos */}
          {bin.items.map((item, index) => {
            const position = getItemPosition(item, index);
            const color = getProductColor(item.product.name);
            const isHovered = hoveredItem === item.product.id;
            
            return (
              <div
                key={`${item.product.id}-${index}`}
                className={`product-box ${isHovered ? 'hovered' : ''}`}
                style={{
                  width: `${item.orientation.length * position.scale}px`,
                  height: `${item.orientation.height * position.scale}px`,
                  backgroundColor: color,
                  transform: `translate3d(${position.x}px, ${position.y}px, ${position.z}px)`,
                  zIndex: index + 1
                }}
                onMouseEnter={() => setHoveredItem(item.product.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => onItemClick?.(item)}
                title={`${item.product.name} (${item.orientation.length}×${item.orientation.width}×${item.orientation.height}cm) - Escala: ${position.scale}x`}
              >
                <div className="product-label">
                  {item.product.name.length > 8 ? 
                    item.product.name.substring(0, 8) + '...' : 
                    item.product.name
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const render2DView = () => (
    <div className="locker-2d-container">
      <div className="locker-2d-box">
        {/* Vista superior del casillero */}
        {bin.items.map((item, index) => {
          const position = getItemPosition(item, index);
          const color = getProductColor(item.product.name);
          const isHovered = hoveredItem === item.product.id;
          
          return (
            <div
              key={`${item.product.id}-${index}`}
              className={`product-2d-box ${isHovered ? 'hovered' : ''}`}
              style={{
                width: `${item.orientation.length * position.scale}px`,
                height: `${item.orientation.width * position.scale}px`,
                backgroundColor: color,
                left: `${position.x}px`,
                top: `${position.y}px`
              }}
              onMouseEnter={() => setHoveredItem(item.product.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => onItemClick?.(item)}
              title={`${item.product.name} (${item.orientation.length}×${item.orientation.width}×${item.orientation.height}cm) - Escala: ${position.scale}x`}
            >
              <div className="product-2d-label">
                {item.product.name.length > 6 ? 
                  item.product.name.substring(0, 6) + '...' : 
                  item.product.name
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="locker-3d-visualization">
      {/* Controles de vista */}
      <div className="view-controls mb-2">
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn ${viewMode === '3D' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('3D')}
          >
            <i className="bi bi-cube me-1"></i>
            Vista 3D
          </button>
          <button
            type="button"
            className={`btn ${viewMode === '2D' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('2D')}
          >
            <i className="bi bi-square me-1"></i>
            Vista Superior
          </button>
        </div>
      </div>

      {/* Visualización */}
      <div className="visualization-container">
        {viewMode === '3D' ? render3DView() : render2DView()}
      </div>

             {/* Información detallada */}
       {showDetails && (
         <div className="locker-details mt-3">
           <div className="row">
             <div className="col-md-6">
               <div className="detail-item">
                 <strong>Eficiencia de empaquetado:</strong>
                 <div className="progress mt-1" style={{ height: '8px' }}>
                   <div 
                     className={`progress-bar ${efficiency > 90 ? 'bg-success' : efficiency > 70 ? 'bg-warning' : 'bg-danger'}`}
                     style={{ width: `${efficiency}%` }}
                   ></div>
                 </div>
                 <small className="text-muted">{efficiency}% ({bin.usedVolume.toLocaleString()} / {bin.maxVolume.toLocaleString()} cm³)</small>
               </div>
             </div>
             <div className="col-md-6">
               <div className="detail-item">
                 <strong>Productos:</strong> {bin.items.length}
                 <br />
                 <strong>Espacio sin usar:</strong> {unusedVolume.toLocaleString()} cm³
                 {bin.items.length > 0 && (
                   <>
                     <br />
                     <small className="text-info">
                       <i className="bi bi-info-circle me-1"></i>
                       Productos escalados para mejor visualización
                     </small>
                   </>
                 )}
               </div>
             </div>
           </div>

          {/* Lista de productos */}
          <div className="products-list mt-2">
            <small className="text-muted">Productos en este casillero:</small>
            <div className="row">
              {bin.items.map((item, index) => (
                <div key={index} className="col-md-6">
                  <div className="product-item">
                    <div 
                      className="color-indicator"
                      style={{ backgroundColor: getProductColor(item.product.name) }}
                    ></div>
                    <div className="product-info">
                      <small className="product-name">{item.product.name}</small>
                      <small className="product-dimensions">
                        {item.orientation.length}×{item.orientation.width}×{item.orientation.height}cm
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locker3DVisualization; 