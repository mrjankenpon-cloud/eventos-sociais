import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { CheckCircle, Copy, Check } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Modal, Button } from '../ui';
import { db } from '../../firebase/firestore';
import { COLLECTIONS } from '../../services/firebase/helpers';
import { formatCurrency } from '../../lib/utils';

export type UpgradePixPayload = {
  pedidoId?: string;
  ticketId: string;
  diff: number;
  fromValor?: number;
  toValor?: number;
  toIngressoNome?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: string;
  confirmed?: boolean;
};

function remainingLabel(expiresAt?: string): string {
  if (!expiresAt) return '';
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return '';
  const ms = end - Date.now();
  if (ms <= 0) return 'Expirado';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function UpgradePixModal({
  open,
  payload,
  loading,
  error,
  onClose,
  onConfirmed,
  onRetry,
}: {
  open: boolean;
  payload: UpgradePixPayload | null;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmed: () => void;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const [liveConfirmed, setLiveConfirmed] = useState(false);
  const notifiedRef = useRef(false);

  const confirmed = Boolean(payload?.confirmed || liveConfirmed);
  const qrValue = payload?.qrCode?.trim() || '';
  const qrImage = payload?.qrCodeBase64?.trim() || '';

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setLiveConfirmed(false);
      notifiedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || confirmed) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, confirmed]);

  useEffect(() => {
    if (!open || !payload?.ticketId || confirmed) return;
    const ref = doc(db, COLLECTIONS.tickets, payload.ticketId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      if (
        data?.upgradedToInteira === true ||
        String(data?.upgradeStatus || '') === 'confirmado'
      ) {
        setLiveConfirmed(true);
      }
    });
    return () => unsub();
  }, [open, payload?.ticketId, confirmed]);

  useEffect(() => {
    if (confirmed && open && !notifiedRef.current) {
      notifiedRef.current = true;
      onConfirmed();
    }
  }, [confirmed, open, onConfirmed]);

  const clock = useMemo(
    () => remainingLabel(payload?.expiresAt),
    [payload?.expiresAt, tick]
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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Pagar diferença (PIX)"
      maxWidth="sm"
    >
      {loading && !payload ? (
        <p className="text-sm text-gray-500">Gerando cobrança PIX…</p>
      ) : error ? (
        <div className="space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          {onRetry ? (
            <Button className="w-full rounded-2xl" onClick={onRetry}>
              Tentar de novo
            </Button>
          ) : null}
        </div>
      ) : confirmed ? (
        <div className="text-center space-y-3 py-2">
          <CheckCircle className="mx-auto text-green-600" size={40} aria-hidden="true" />
          <p className="text-lg font-black text-gray-900">PIX confirmado</p>
          <p className="text-sm text-gray-500">
            O ingresso passou a ser{' '}
            <strong className="text-gray-900">
              {payload?.toIngressoNome || 'Inteira'}
            </strong>
            .
          </p>
          <Button className="w-full rounded-2xl" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : payload ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Meia → {payload.toIngressoNome || 'Inteira'}
            </p>
            <p className="text-2xl font-black text-brand tabular-nums mt-1">
              {formatCurrency(payload.diff)}
            </p>
            {payload.fromValor != null && payload.toValor != null ? (
              <p className="text-xs text-gray-400 mt-1">
                {formatCurrency(payload.fromValor)} + {formatCurrency(payload.diff)} ={' '}
                {formatCurrency(payload.toValor)}
              </p>
            ) : null}
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-2xl border border-gray-100">
              {qrImage ? (
                <img
                  src={`data:image/png;base64,${qrImage}`}
                  alt="QR Code PIX"
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
            {clock === 'Expirado'
              ? 'PIX expirado — gere outro'
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

          {onRetry ? (
            <Button
              variant="outline"
              className="w-full rounded-2xl"
              onClick={onRetry}
            >
              Verificar pagamento
            </Button>
          ) : null}

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Só PIX. Quando o Mercado Pago confirmar, o ingresso vira inteira
            automaticamente.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
