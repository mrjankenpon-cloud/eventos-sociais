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
    'card-surface p-5 sm:p-6 text-left w-full h-full min-h-[132px] flex flex-col justify-between gap-4',
    'transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
    interactive && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/30 active:scale-[0.99]',
    className
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="label-micro leading-relaxed pr-2">{title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {sensitive ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setRevealed((v) => !v);
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-brand hover:bg-brand-muted transition-colors"
              aria-label={hidden ? 'Mostrar valor' : 'Ocultar valor'}
              title={hidden ? 'Mostrar valor' : 'Ocultar valor'}
            >
              {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          ) : null}
          {Icon && (
            <div
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: `${accent}14`, color: accent }}
            >
              <Icon size={18} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
      <div>
        <p
          className={cn(
            'text-2xl sm:text-3xl font-black tracking-tight',
            hidden ? 'text-gray-400' : 'text-gray-900 tabular-nums'
          )}
        >
          {hidden ? '••••••' : value}
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
