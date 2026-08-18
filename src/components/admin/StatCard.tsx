import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
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
  /** Valor monetário: começa oculto, com botão mostrar/ocultar. */
  sensitive?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  onClick,
  className,
  accent = THEME.colors.primary,
  hint,
  sensitive = false,
}: StatCardProps) {
  const [revealed, setRevealed] = useState(false);
  const hidden = sensitive && !revealed;
  const interactive = Boolean(onClick);
  const classNames = cn(
    'card-surface p-5 text-left w-full h-full min-h-[152px]',
    'grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-4 gap-y-4',
    'transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
    interactive &&
      'cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/30 active:scale-[0.99]',
    className
  );

  const content = (
    <>
      <p className="label-micro leading-snug line-clamp-2 h-10 overflow-hidden">
        {title}
      </p>
      <div className="flex items-center gap-1.5 shrink-0 self-start h-10">
        {sensitive ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setRevealed((v) => !v);
            }}
            className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-brand hover:bg-brand-muted transition-colors"
            aria-label={hidden ? 'Mostrar valor' : 'Ocultar valor'}
            title={hidden ? 'Mostrar valor' : 'Ocultar valor'}
          >
            {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        ) : null}
        {Icon ? (
          <div
            className="w-10 h-10 inline-flex items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <Icon size={18} aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <div className="col-span-2 min-w-0 self-end">
        <p
          className={cn(
            'text-[1.35rem] sm:text-2xl font-black tracking-tight leading-none truncate',
            hidden ? 'text-gray-400' : 'text-gray-900 tabular-nums'
          )}
        >
          {hidden ? '••••••' : value}
        </p>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 truncate min-h-[1rem]">
          {hint || '\u00a0'}
        </p>
      </div>
    </>
  );

  if (interactive) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={classNames}
      >
        {content}
      </div>
    );
  }

  return <div className={classNames}>{content}</div>;
}
