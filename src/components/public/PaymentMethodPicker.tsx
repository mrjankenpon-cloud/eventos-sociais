import { useEffect } from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CheckoutMetodo = 'pix' | 'checkout_pro';

/** Temporário: cartão desativado até liberação do antifraude Mercado Pago. */
export const CARD_CHECKOUT_ENABLED = false;

const CARD_DISABLED_HINT =
  'O pagamento com cartão está temporariamente em atualização para melhor atendê-lo. O PIX continua funcionando normalmente.';

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: CheckoutMetodo;
  onChange: (metodo: CheckoutMetodo) => void;
}) {
  useEffect(() => {
    if (!CARD_CHECKOUT_ENABLED && value === 'checkout_pro') {
      onChange('pix');
    }
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <p className="label-micro">Forma de pagamento</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('pix')}
          className={cn(
            'rounded-2xl border px-4 py-3 text-left transition-all',
            value === 'pix'
              ? 'border-brand bg-brand-muted/50 text-brand ring-2 ring-brand/20'
              : 'border-gray-100 bg-white text-gray-800 hover:border-brand/40'
          )}
        >
          <span className="flex items-center gap-2 font-black text-sm">
            <QrCode size={18} aria-hidden="true" />
            PIX
          </span>
          <span className="mt-1 block text-[11px] font-medium text-gray-500">
            Recomendado — QR nesta página, confirmação rápida
          </span>
        </button>

        <div className="group relative">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={CARD_DISABLED_HINT}
            className={cn(
              'w-full cursor-not-allowed rounded-2xl border border-gray-100 bg-gray-100 px-4 py-3 text-left text-gray-400 opacity-70'
            )}
          >
            <span className="flex items-center gap-2 font-black text-sm">
              <CreditCard size={18} aria-hidden="true" />
              Cartão
            </span>
            <span className="mt-1 block text-[11px] font-medium text-gray-400">
              Temporariamente indisponível
            </span>
          </button>
          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute left-0 right-0 bottom-full z-20 mb-2 hidden rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium leading-snug text-gray-700 shadow-sm',
              'group-hover:block group-focus-within:block'
            )}
          >
            {CARD_DISABLED_HINT}
          </div>
        </div>
      </div>
    </div>
  );
}
