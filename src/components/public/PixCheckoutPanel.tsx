import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';
import { Button } from '../ui';
import { formatCurrency } from '../../lib/utils';
import {
  PIX_COUNTDOWN_MINUTES,
  PIX_TICKET_HOLD_DAYS,
  formatPixCountdown,
  pixRemainingMs,
} from '../../lib/pixCountdown';

function formatPixDeadlineDate(expiresAt?: string | null): string {
  if (!expiresAt) return '';
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function PixCheckoutPanel({
  amount,
  qrCode,
  qrCodeBase64,
  expiresAt,
  ticketUrl,
  hint,
  kind = 'ingresso',
}: {
  amount: number;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  expiresAt?: string | null;
  ticketUrl?: string | null;
  hint?: string;
  kind?: 'ingresso' | 'doacao';
}) {
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const qrValue = qrCode?.trim() || '';
  const qrImage = qrCodeBase64?.trim() || '';
  const isDonation = kind === 'doacao';

  // Doação: contagem por segundo. Ingresso: só revalida expiração a cada minuto
  // (prazo de 10 dias — sem cronômetro MM:SS).
  useEffect(() => {
    const ms = isDonation ? 1000 : 60_000;
    const id = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [isDonation]);

  const clock = useMemo(
    () =>
      isDonation
        ? formatPixCountdown(expiresAt, {
            maxMinutes: PIX_COUNTDOWN_MINUTES,
          })
        : '',
    // tick força atualização
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expiresAt, tick, isDonation]
  );

  const expired = useMemo(() => {
    if (isDonation) return clock === 'Expirado';
    const msLeft = pixRemainingMs(expiresAt);
    return msLeft != null && msLeft <= 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, tick, isDonation, clock]);

  const ticketDeadline = useMemo(
    () => (isDonation ? '' : formatPixDeadlineDate(expiresAt)),
    [expiresAt, isDonation]
  );

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

  const statusLabel = expired
    ? isDonation
      ? 'PIX expirado — inicie uma nova doação'
      : 'PIX expirado — inicie uma nova compra'
    : isDonation
      ? clock
        ? `Tempo restante ${clock}`
        : 'Aguardando pagamento PIX'
      : ticketDeadline
        ? `Aguardando pagamento · pague até ${ticketDeadline}`
        : `Aguardando pagamento · prazo de ${PIX_TICKET_HOLD_DAYS} dias`;

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 mb-6 print:hidden">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {isDonation ? 'Valor da doação' : 'Valor a pagar'}
        </p>
        <p className="text-2xl font-black text-brand tabular-nums mt-1">
          {formatCurrency(amount)}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-2xl border border-gray-100">
          {qrImage ? (
            <img
              src={`data:image/png;base64,${qrImage}`}
              alt={isDonation ? 'QR Code PIX da doação' : 'QR Code PIX'}
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
        {statusLabel}
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

      {ticketUrl ? (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button variant="secondary" className="w-full rounded-2xl">
            Abrir PIX no Mercado Pago
          </Button>
        </a>
      ) : null}

      <p className="text-[11px] text-gray-400 leading-relaxed">
        {hint ||
          (isDonation
            ? 'Abra o app do banco, escaneie o QR ou cole o código. O certificado aparece automaticamente após a confirmação.'
            : `Abra o app do banco, escaneie o QR ou cole o código. A vaga fica reservada por até ${PIX_TICKET_HOLD_DAYS} dias para pagamento. Os ingressos aparecem aqui após a confirmação.`)}
      </p>
    </div>
  );
}
