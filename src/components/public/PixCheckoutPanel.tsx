import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';
import { Button } from '../ui';
import { formatCurrency } from '../../lib/utils';

function remainingLabel(expiresAt?: string | null): string {
  if (!expiresAt) return '';
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return '';
  const ms = end - Date.now();
  if (ms <= 0) return 'Expirado';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function PixCheckoutPanel({
  amount,
  qrCode,
  qrCodeBase64,
  expiresAt,
  hint,
}: {
  amount: number;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  expiresAt?: string | null;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const qrValue = qrCode?.trim() || '';
  const qrImage = qrCodeBase64?.trim() || '';

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const clock = useMemo(() => remainingLabel(expiresAt), [expiresAt, tick]);
  const expired = clock === 'Expirado';

  const copyCode = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 mb-6 print:hidden">
      <div className="text-center">
        <p className="text-sm text-gray-600">Valor da doação</p>
        <p className="text-2xl font-black text-brand tabular-nums mt-1">
          {formatCurrency(amount)}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-2xl border border-gray-100">
          {qrImage ? (
            <img
              src={`data:image/png;base64,${qrImage}`}
              alt="QR Code PIX da doação"
              className="w-48 h-48 object-contain"
            />
          ) : qrValue ? (
            <QRCode value={qrValue} size={192} level="M" />
          ) : (
            <p className="text-sm text-gray-400 p-8">QR indisponível</p>
          )}
        </div>
      </div>

      <p className="text-center text-xs font-bold uppercase tracking-wider text-amber-600">
        {expired
          ? 'PIX expirado — inicie uma nova doação'
          : clock
            ? `Válido por ${clock}`
            : 'Aguardando pagamento PIX'}
      </p>

      {qrValue ? (
        <div className="space-y-2">
          <p className="label-micro">Copia e cola</p>
          <p className="text-[11px] font-mono break-all bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-700 max-h-24 overflow-y-auto">
            {qrValue}
          </p>
          <Button
            variant="secondary"
            className="w-full rounded-2xl"
            onClick={() => void copyCode()}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? 'Copiado' : 'Copiar código PIX'}
          </Button>
        </div>
      ) : null}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        {hint ||
          'Abra o app do banco, escaneie o QR ou cole o código. O certificado aparece automaticamente após a confirmação.'}
      </p>
    </div>
  );
}
