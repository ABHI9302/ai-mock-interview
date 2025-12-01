import React from 'react';

interface OrbProps {
  isActive: boolean;
  volume: number; // 0 to 1
}

export const Orb: React.FC<OrbProps> = ({ isActive, volume }) => {
  const scale = 1 + volume * 1.5; // Scale up to 2.5x
  const glow = 30 + volume * 50;
  
  return (
    <div className="orb-container my-8">
      <div 
        className="orb transition-all duration-75 ease-out"
        style={{
            transform: `scale(${isActive ? scale : 1})`,
            boxShadow: isActive 
                ? `0 0 ${glow}px #3b82f6, 0 0 ${glow * 2}px #2563eb` 
                : '0 0 30px #1e293b, 0 0 60px #0f172a',
            opacity: isActive ? 1 : 0.6,
            background: isActive 
                ? 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6)' 
                : 'radial-gradient(circle at 30% 30%, #475569, #1e293b)'
        }}
      />
    </div>
  );
};