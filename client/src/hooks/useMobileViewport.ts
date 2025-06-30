import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useMobileViewport = () => {
  const location = useLocation();
  useEffect(() => {
    // Función para forzar el viewport móvil
    const forceMobileViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      // Forzar el ancho del viewport en dispositivos móviles
      if (window.innerWidth <= 768) {
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        document.documentElement.style.setProperty('--vw', `${window.innerWidth * 0.01}px`);
      }
    };

    // Aplicar inmediatamente
    forceMobileViewport();

    // Aplicar en cambios de orientación y resize
    const handleResize = () => {
      forceMobileViewport();
    };

    const handleOrientationChange = () => {
      // Pequeño delay para asegurar que la orientación cambió
      setTimeout(forceMobileViewport, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [location.pathname]);
}; 