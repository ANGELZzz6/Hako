import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type { Locker3D } from '../services/gridPackingService';

const GRID = 3;
const SLOT_SIZE = 0.5; // en unidades Three.js (ajustable)
const LOCKER_WALL_THICKNESS = 0.05; // grosor de las paredes del casillero

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

  // Dimensiones del casillero
  const lockerWidth = GRID * SLOT_SIZE + LOCKER_WALL_THICKNESS * 2;
  const lockerHeight = GRID * SLOT_SIZE + LOCKER_WALL_THICKNESS * 2;
  const lockerDepth = GRID * SLOT_SIZE + LOCKER_WALL_THICKNESS * 2;

  return (
    <div style={{ width: 400, height: 400 }}>
      <Canvas camera={{ position: [4, 4, 6], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.8} />
        <pointLight position={[0, 5, 5]} intensity={0.3} />

        {/* Estructura del casillero */}
        <group>
          {/* Pared trasera */}
          <mesh
            position={[0, 0, -lockerDepth / 2 + LOCKER_WALL_THICKNESS / 2]}
            receiveShadow
          >
            <boxGeometry args={[lockerWidth, lockerHeight, LOCKER_WALL_THICKNESS]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          {/* Pared izquierda */}
          <mesh
            position={[-lockerWidth / 2 + LOCKER_WALL_THICKNESS / 2, 0, 0]}
            receiveShadow
          >
            <boxGeometry args={[LOCKER_WALL_THICKNESS, lockerHeight, lockerDepth]} />
            <meshStandardMaterial color="#f8f9fa" />
          </mesh>

          {/* Pared derecha */}
          <mesh
            position={[lockerWidth / 2 - LOCKER_WALL_THICKNESS / 2, 0, 0]}
            receiveShadow
          >
            <boxGeometry args={[LOCKER_WALL_THICKNESS, lockerHeight, lockerDepth]} />
            <meshStandardMaterial color="#f8f9fa" />
          </mesh>

          {/* Techo */}
          <mesh
            position={[0, lockerHeight / 2 - LOCKER_WALL_THICKNESS / 2, 0]}
            receiveShadow
          >
            <boxGeometry args={[lockerWidth, LOCKER_WALL_THICKNESS, lockerDepth]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          {/* Piso */}
          <mesh
            position={[0, -lockerHeight / 2 + LOCKER_WALL_THICKNESS / 2, 0]}
            receiveShadow
          >
            <boxGeometry args={[lockerWidth, LOCKER_WALL_THICKNESS, lockerDepth]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          {/* Texto "HAKO" en la parte superior */}
          <Text
            position={[0, lockerHeight / 2 + 0.1, 0]}
            fontSize={0.2}
            color="#2c3e50"
            anchorX="center"
            anchorY="middle"
          >
            箱HAKO
          </Text>
        </group>

        {/* Renderizar slots dentro del casillero */}
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
                  <boxGeometry args={[SLOT_SIZE * 0.9, SLOT_SIZE * 0.9, SLOT_SIZE * 0.9]} />
                  <meshStandardMaterial 
                    color={color} 
                    opacity={isOccupied ? 1 : 0.3} 
                    transparent 
                    metalness={isOccupied ? 0.1 : 0}
                    roughness={isOccupied ? 0.8 : 0.9}
                  />
                </mesh>
              );
            })
          )
        )}

        <OrbitControls 
          enablePan={false} 
          minDistance={3}
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default Locker3DCanvas; 