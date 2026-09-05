import { useEffect } from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CheckoutMetodo = 'pix' | 'checkout_pro';

/**
 * Temporário: cartão desativado no front até o antifraude do Mercado Pago
 * liberar a conta vendedora. PIX segue normal — não é bloqueio geral de vendas.
 */
export const CARD_CHECKOUT_ENABLED = false;

const CARD_DISABLED_HINT =
  'Cartão pausado: o Mercado Pago está recusando cartões por antifraude nesta conta. O PIX continua aprovando normalmente — use PIX para concluir a compra.';

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

        {CARD_CHECKOUT_ENABLED ? (
          <button
            type="button"
            onClick={() => onChange('checkout_pro')}
            className={cn(
              'rounded-2xl border px-4 py-3 text-left transition-all',
              value === 'checkout_pro'
                ? 'border-brand bg-brand-muted/50 text-brand ring-2 ring-brand/20'
                : 'border-gray-100 bg-white text-gray-800 hover:border-brand/40'
            )}
          >
            <span className="flex items-center gap-2 font-black text-sm">
              <CreditCard size={18} aria-hidden="true" />
              Cartão
            </span>
            <span className="mt-1 block text-[11px] font-medium text-gray-500">
              Crédito ou débito no Mercado Pago
            </span>
          </button>
        ) : (
          <div className="group relative">
            {/* Não é <button>: só visual, sem clique/foco de controle. */}
            <div
              aria-disabled="true"
              title={CARD_DISABLED_HINT}
              className="w-full select-none rounded-2xl border border-gray-200 bg-gray-200/90 px-4 py-3 text-left text-gray-500 cursor-not-allowed grayscale"
            >
              <span className="flex items-center gap-2 font-black text-sm text-gray-500">
                <CreditCard size={18} aria-hidden="true" className="text-gray-400" />
                Cartão
              </span>
              <span className="mt-1 block text-[11px] font-medium text-gray-400">
                Temporariamente indisponível — use PIX
              </span>
            </div>
            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-0 right-0 bottom-full z-20 mb-2 hidden rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-medium leading-snug text-gray-600',
                'group-hover:block'
              )}
            >
              {CARD_DISABLED_HINT}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
