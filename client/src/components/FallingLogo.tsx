import React, { useState, useEffect } from 'react';
import './FallingLogo.css';

interface FallingLogoProps {
  x: number;
  onAnimationEnd: () => void;
}

const FallingLogo: React.FC<FallingLogoProps> = ({ x, onAnimationEnd }) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(0);
    }, 1900); // Un poco antes de que termine la animación

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="falling-logo"
      style={{ 
        left: `${x}%`,
        opacity
      }}
      onAnimationEnd={onAnimationEnd}
    >
      箱
    </div>
  );
};

export default FallingLogo; 