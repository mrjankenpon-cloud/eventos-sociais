import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

type ProcessingOverlayProps = {
  open?: boolean;
  label?: string;
  detail?: string;
  /** Quando true, ocupa só a área do pai (position absolute). Default: tela cheia. */
  contained?: boolean;
  className?: string;
};

/**
 * Pop de espera com barra indeterminada — usado em transições e checkout.
 */
export function ProcessingOverlay({
  open = true,
  label = 'Processando',
  detail,
  contained = false,
  className,
}: ProcessingOverlayProps) {
  if (!open) return null;

  const panel = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        contained
          ? 'absolute inset-0 z-40'
          : 'fixed inset-0 z-[100]',
        'flex items-center justify-center bg-brand-deeper/45 backdrop-blur-[2px] p-4',
        className
      )}
    >
      <div className="w-full max-w-sm rounded-[28px] bg-white shadow-xl border border-gray-100 px-6 py-7 space-y-5">
        <div className="space-y-1 text-center">
          <p className="text-lg font-black text-gray-900 tracking-tight">
            {label}
          </p>
          {detail ? (
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              {detail}
            </p>
          ) : null}
        </div>

        <div
          className="h-2.5 rounded-full bg-gray-100 overflow-hidden"
          aria-hidden="true"
        >
          <div className="processing-bar h-full rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );

  if (contained || typeof document === 'undefined') {
    return panel;
  }

  return createPortal(panel, document.body);
}
