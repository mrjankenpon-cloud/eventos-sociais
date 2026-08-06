import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { THEME } from '../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
  accent?: string;
  hint?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  onClick,
  className,
  accent = THEME.colors.primary,
  hint,
}: StatCardProps) {
  const interactive = Boolean(onClick);
  const classNames = cn(
    'card-surface p-5 sm:p-6 text-left w-full h-full min-h-[132px] flex flex-col justify-between gap-4',
    'transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
    interactive && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/30 active:scale-[0.99]',
    className
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="label-micro leading-relaxed pr-2">{title}</p>
        {Icon && (
          <div
            className="shrink-0 p-2.5 rounded-xl"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Icon size={18} aria-hidden="true" />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight tabular-nums">
          {value}
        </p>
        {hint && (
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
            {hint}
          </p>
        )}
      </div>
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={classNames}>
        {content}
      </button>
    );
  }

  return <div className={classNames}>{content}</div>;
}
