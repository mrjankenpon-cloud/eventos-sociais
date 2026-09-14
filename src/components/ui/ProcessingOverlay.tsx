import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { HeartHandshake } from 'lucide-react';

const THANKS_LINES = [
  'Obrigado pela sua boa ação.',
  'Sua generosidade aquece quem precisa.',
  'Cada gesto solidário deixa marca boa no mundo.',
  'Você está ajudando a transformar este evento em cuidado real.',
  'Gratidão por caminhar conosco nessa causa.',
];

type ProcessingOverlayProps = {
  open?: boolean;
  label?: string;
  detail?: string;
  /** Mensagens de agradecimento rotativas (checkout / doação). */
  gratitude?: boolean;
  /** Quando true, ocupa só a área do pai (position absolute). Default: tela cheia. */
  contained?: boolean;
  className?: string;
};

/**
 * Pop de espera com barra indeterminada — usado em transições e checkout.
 * Usa `position: fixed` (sem portal) para não esvaziar o outlet do React Router/Suspense.
 */
export function ProcessingOverlay({
  open = true,
  label = 'Processando',
  detail,
  gratitude = false,
  contained = false,
  className,
}: ProcessingOverlayProps) {
  const [thanksIdx, setThanksIdx] = useState(0);
  const seed = useMemo(
    () => Math.floor(Math.random() * THANKS_LINES.length),
    // re-escolhe ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, gratitude]
  );

  useEffect(() => {
    if (!open || !gratitude) return;
    setThanksIdx(seed);
    const id = window.setInterval(() => {
      setThanksIdx((n) => (n + 1) % THANKS_LINES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [open, gratitude, seed]);

  if (!open) return null;

  const thanks = THANKS_LINES[thanksIdx % THANKS_LINES.length];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        contained ? 'absolute inset-0 z-40' : 'fixed inset-0 z-[100]',
        'flex items-center justify-center bg-brand-deeper/45 backdrop-blur-[2px] p-4',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-[28px] bg-white shadow-xl border border-gray-100 px-6 py-7 space-y-5',
          gratitude && 'overflow-hidden relative'
        )}
      >
        {gratitude ? (
          <div
            className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-brand/10"
            aria-hidden="true"
          />
        ) : null}

        <div className="space-y-2 text-center relative">
          {gratitude ? (
            <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-muted text-brand">
              <HeartHandshake className="h-6 w-6" aria-hidden="true" />
            </div>
          ) : null}
          <p className="text-lg font-black text-gray-900 tracking-tight">
            {label}
          </p>
          {gratitude ? (
            <p
              key={thanks}
              className="text-sm text-brand font-semibold leading-relaxed min-h-[2.75rem] animate-[fadeInUp_0.45s_ease]"
            >
              {thanks}
            </p>
          ) : null}
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

        {gratitude ? (
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Aguarde só um instante
          </p>
        ) : null}
      </div>
    </div>
  );
}
