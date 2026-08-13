import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Voltar',
  onBack,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0',
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {(backTo || onBack) && (
          backTo ? (
            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-brand transition-colors"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {backLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-brand transition-colors"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {backLabel}
            </button>
          )
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 max-w-2xl">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
