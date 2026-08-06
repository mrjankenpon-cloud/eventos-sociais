import React from 'react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-14 px-6',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 p-4 rounded-2xl bg-gray-50 text-gray-300">
          <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-bold text-gray-800">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
