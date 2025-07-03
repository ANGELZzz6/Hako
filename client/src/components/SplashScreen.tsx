import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Mostrar el logo con fade-in después de un pequeño delay
    const showTimeout = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(showTimeout);
  }, []);

  const handleClick = () => {
    setFadeOut(true);
    setTimeout(() => onFinish(), 900); // Duración del fade-out
  };

  return (
    <div className={`splash-overlay2${fadeOut ? ' fade-out' : ''}`} onClick={handleClick}>
      <div className={`splash-logo-bar2${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}`}>
        <span className="logo-japanese">箱</span>
        <span className="brand-text">hako</span>
      </div>
    </div>
  );
};

export default SplashScreen; 