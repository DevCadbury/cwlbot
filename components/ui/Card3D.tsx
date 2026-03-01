'use client';
import { ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Card3DProps {
  children: ReactNode;
  className?: string;
  depth?: number;
}

export default function Card3D({ children, className, depth = 20 }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${depth}px)`
    );
  }

  function handleMouseLeave() {
    setTransform('perspective(1000px) rotateX(0) rotateY(0) translateZ(0)');
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
      style={{ transform, transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}
