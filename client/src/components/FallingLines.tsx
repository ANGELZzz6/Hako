import React, { useEffect, useState } from 'react';
import './FallingLines.css';

interface Line {
  id: number;
  left: number;
  duration: number;
  delay: number;
  height: number;
}

const FallingLines: React.FC = () => {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    // Crear líneas iniciales
    const initialLines = Array.from({ length: 15 }, (_, index) => ({
      id: index,
      left: Math.random() * 100, // Posición horizontal aleatoria (%)
      duration: 2 + Math.random() * 3, // Duración entre 2 y 5 segundos
      delay: Math.random() * 2, // Retraso aleatorio
      height: 50 + Math.random() * 100 // Altura aleatoria entre 50 y 150px
    }));

    setLines(initialLines);

    // Función para actualizar líneas periódicamente
    const interval = setInterval(() => {
      setLines(prevLines => 
        prevLines.map(line => {
          if (line.delay <= 0) {
            return {
              ...line,
              left: Math.random() * 100,
              duration: 2 + Math.random() * 3,
              delay: Math.random() * 2,
              height: 50 + Math.random() * 100
            };
          }
          return line;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="falling-lines-container">
      {lines.map(line => (
        <div
          key={line.id}
          className="falling-line"
          style={{
            left: `${line.left}%`,
            animationDuration: `${line.duration}s`,
            animationDelay: `${line.delay}s`,
            height: `${line.height}px`
          }}
        />
      ))}
    </div>
  );
};

export default FallingLines; 