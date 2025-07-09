import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Locker3D } from '../services/gridPackingService';

const GRID = 3;
const SLOT_SIZE = 0.5; // en unidades Three.js (ajustable)

// Cambiar para usar el nombre del producto como clave de color
const getProductColor = (productName: string) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#7FB3D5', '#F7CA18', '#B9770E'
  ];
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    hash = productName.charCodeAt(i) + ((hash << 5) - hash);
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

interface Locker3DCanvasProps {
  bin: Locker3D;
  selectedProductId?: string | null;
}

const Locker3DCanvas: React.FC<Locker3DCanvasProps> = ({ bin, selectedProductId = null }) => {
  const slotGrid = buildSlotGrid(bin);

  return (
    <div style={{ width: 400, height: 400 }}>
      <Canvas camera={{ position: [3, 3, 5], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.7} />
        {/* Renderizar slots */}
        {Array.from({ length: GRID }).map((_, x) =>
          Array.from({ length: GRID }).map((_, y) =>
            Array.from({ length: GRID }).map((_, z) => {
              const slot = slotGrid[x][y][z];
              const isOccupied = !!slot.productId;
              const isSelected = selectedProductId && slot.productId === selectedProductId;
              let color = '#e0e0e0';
              if (isOccupied) {
                color = isSelected ? '#FFD600' : getProductColor(slot.productName || '');
              }
              return (
                <mesh
                  key={`slot-${x}-${y}-${z}`}
                  position={[
                    (x - 1) * SLOT_SIZE,
                    (y - 1) * SLOT_SIZE,
                    (z - 1) * SLOT_SIZE
                  ]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[SLOT_SIZE * 0.95, SLOT_SIZE * 0.95, SLOT_SIZE * 0.95]} />
                  <meshStandardMaterial color={color} opacity={isOccupied ? 1 : 0.25} transparent />
                </mesh>
              );
            })
          )
        )}
        {/* Borde del casillero */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[SLOT_SIZE * 3.1, SLOT_SIZE * 3.1, SLOT_SIZE * 3.1]} />
          <meshStandardMaterial color="#222" wireframe opacity={0.2} transparent />
        </mesh>
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
};

export default Locker3DCanvas; 