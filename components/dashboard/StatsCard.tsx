'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  description?: string;
  className?: string;
}

export default function StatsCard({ title, value, icon: Icon, color = 'text-indigo-600', bg = 'bg-indigo-50', description, className }: StatsCardProps) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={cn('p-2 rounded-lg', bg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
      {description && (
        <p className="text-sm text-slate-500">{description}</p>
      )}
    </motion.div>
  );
}

