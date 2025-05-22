import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './SphereAnimation.css';

const SphereAnimation: React.FC = () => {
  const sphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sphereRef.current) {
      gsap.to(sphereRef.current, {
        rotation: 360,
        scale: 1.2,
        duration: 2,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1
      });
    }

    return () => {
      gsap.killTweensOf(sphereRef.current);
    };
  }, []);

  return (
    <div className="sphere-container">
      <div 
        ref={sphereRef} 
        className="sphere"
      >
        箱
      </div>
    </div>
  );
};

export default SphereAnimation;
