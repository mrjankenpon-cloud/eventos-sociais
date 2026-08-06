import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const styles: Record<AlertVariant, string> = {
  error: 'bg-red-50 border-red-100 text-red-700',
  success: 'bg-green-50 border-green-100 text-green-700',
  info: 'bg-brand-muted border-brand/10 text-brand-dark',
  warning: 'bg-amber-50 border-amber-100 text-amber-800',
};

const icons: Record<AlertVariant, React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
};

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
}: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 items-start rounded-2xl border px-4 py-3.5 text-sm',
        styles[variant],
        className
      )}
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar alerta"
          className="shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
