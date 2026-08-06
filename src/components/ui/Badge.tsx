import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'highlight'
  | 'published'
  | 'draft'
  | 'used'
  | 'available';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border-green-100',
  danger: 'bg-red-50 text-red-600 border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  info: 'bg-brand-muted text-brand border-brand/10',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  highlight: 'bg-yellow-400 text-gray-900 border-yellow-500/20',
  published: 'bg-green-50 text-green-700 border-green-100',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  used: 'bg-blue-50 text-blue-700 border-blue-100',
  available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
