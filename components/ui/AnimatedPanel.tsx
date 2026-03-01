'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedPanel({ children, className, delay = 0 }: AnimatedPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -5 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
