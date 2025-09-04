import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './BoxAnimation.css';
import FallingLogo from './FallingLogo';

interface FallingLogoItem {
  id: string;
  x: number;
}

interface BoxAnimationProps {
  highlightRandomCell?: boolean;
  reservations?: Array<{ locker: number; date: string; time: string }>;
}

const BoxAnimation: React.FC<BoxAnimationProps> = ({ highlightRandomCell, reservations = [] }) => {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [fallingLogos, setFallingLogos] = useState<FallingLogoItem[]>([]);

  useEffect(() => {
    if (shelfRef.current) {
      gsap.to(shelfRef.current, {
        rotationY: 360,
        duration: 8,
        ease: "power1.inOut",
        repeat: -1
      });
    }

    return () => {
      gsap.killTweensOf(shelfRef.current);
    };
  }, []);

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCellClick = () => {
    const x = Math.random() * 100; // Posición horizontal aleatoria
    setFallingLogos(prev => [...prev, { id: generateUniqueId(), x }]);
  };

  const handleLogoAnimationEnd = (logoId: string) => {
    setFallingLogos(prev => prev.filter(logo => logo.id !== logoId));
  };

  // Crear un array 4x3 para representar los compartimentos
  const shelves = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => ({
      id: `shelf-${row}-${col}`,
      position: { row, col }
    }))
  );

  // Elegir una casilla al azar para resaltar si highlightRandomCell está activo
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  useEffect(() => {
    if (highlightRandomCell) {
      // Solo para la estantería frontal (4x3 = 12 celdas)
      setHighlightedIndex(Math.floor(Math.random() * 12));
    } else {
      setHighlightedIndex(null);
    }
  }, [highlightRandomCell]);

  return (
    <div className="shelf-container">
      {fallingLogos.map(logo => (
        <FallingLogo
          key={logo.id}
          x={logo.x}
          onAnimationEnd={() => handleLogoAnimationEnd(logo.id)}
        />
      ))}
      <div className="shelf" ref={shelfRef}>
        <div className="shelf-front">
          {shelves.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="shelf-row">
              {row.map((shelf, colIndex) => {
                const flatIndex = rowIndex * 3 + colIndex;
                // Mapear lockerNumber (1-12) -> flatIndex (0-11)
                const matchingReservations = reservations.filter(r => (r.locker - 1) === flatIndex);
                return (
                  <div
                    key={shelf.id}
                    className={`shelf-cell${highlightRandomCell && highlightedIndex === flatIndex ? ' shelf-cell-highlighted' : ''}`}
                    onClick={handleCellClick}
                    style={{ position: 'relative' }}
                  >
                    {highlightRandomCell && highlightedIndex === flatIndex && (
                      <div className="shelf-bubble">¡Resérvame!</div>
                    )}
                    {matchingReservations.length > 0 ? (
                      <div 
                        className="shelf-reservation"
                        title={matchingReservations.map(r => `${r.date} ${r.time}`).join(' | ')}
                      >
                        <div className="res-icon"><i className="bi bi-calendar2-check"></i></div>
                        <div className="res-date">{matchingReservations[0].date}</div>
                        <div className="res-time">{matchingReservations[0].time}</div>
                        {matchingReservations.length > 1 && (
                          <div className="res-chip">+{matchingReservations.length - 1}</div>
                        )}
                      </div>
                    ) : (
                      <i className="bi bi-box2-heart shelf-icon"></i>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="shelf-back">
          {shelves.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="shelf-row">
              {row.map((shelf) => (
                <div key={shelf.id} className="shelf-cell" onClick={handleCellClick}>
                  <i className="bi bi-box2-heart shelf-icon"></i>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="shelf-left"></div>
        <div className="shelf-right"></div>
        <div className="shelf-top"></div>
        <div className="shelf-bottom"></div>
      </div>
    </div>
  );
};

export default BoxAnimation; 