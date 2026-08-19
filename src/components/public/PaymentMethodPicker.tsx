import { CreditCard, QrCode } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CheckoutMetodo = 'pix' | 'checkout_pro';

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: CheckoutMetodo;
  onChange: (metodo: CheckoutMetodo) => void;
}) {
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
            QR Code nesta página
          </span>
        </button>
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
            Crédito (parcelado quando o Mercado Pago permitir) ou débito Elo
          </span>
        </button>
      </div>
    </div>
  );
}
