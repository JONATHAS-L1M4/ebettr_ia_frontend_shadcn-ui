import React from 'react';
import Grainient from '../Grainient';
import { cn } from '../../utils/cn';

interface AppBackgroundProps {
  className?: string;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({ className }) => {
  return (
    <div
      aria-hidden="true"
      className={cn('fixed inset-0 overflow-hidden pointer-events-none', className)}
    >
      <div className="absolute -inset-20 transform-gpu opacity-90 saturate-[0.82]">
        <Grainient
          color1="#181818"
          color2="#1f1f1f"
          color3="#161616"
          timeSpeed={0.25}
          colorBalance={0.02}
          warpStrength={2.1}
          warpFrequency={4.6}
          warpSpeed={2.2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.18}
          rotationAmount={240}
          noiseScale={1.1}
          grainAmount={0.02}
          grainScale={2}
          grainAnimated={false}
          contrast={1.1}
          gamma={1}
          saturation={0.85}
          centerX={0}
          centerY={0}
          zoom={1.02}
        />
      </div>

      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_44%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.44))]" />
    </div>
  );
};

export default AppBackground;
