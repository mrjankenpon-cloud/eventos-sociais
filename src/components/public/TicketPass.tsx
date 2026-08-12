import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Printer, Ticket } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export type TicketPassData = {
  id: string;
  codigo: string;
  qrPayload: string;
  status: string;
  ordem: number;
  ingressoNome?: string;
  natureza?: string;
  checkinRealizado?: boolean;
  retiradaRealizada?: boolean;
};

type TicketPassProps = {
  ticket: TicketPassData;
  eventoTitulo?: string;
  compradorNome?: string;
  className?: string;
  onCopy?: (codigo: string) => void;
  copied?: boolean;
};

/**
 * Ingresso digital com QR para check-in — tela e impressão.
 */
export function TicketPass({
  ticket,
  eventoTitulo,
  compradorNome,
  className,
  onCopy,
  copied,
}: TicketPassProps) {
  const qrValue = String(ticket.qrPayload || ticket.codigo || '').trim();
  const used =
    ticket.checkinRealizado ||
    ticket.retiradaRealizada ||
    ticket.status === 'Utilizado';

  return (
    <article
      className={cn(
        'ticket-pass rounded-[28px] border border-gray-100 bg-white overflow-hidden shadow-[var(--shadow-card)]',
        className
      )}
      data-ticket-id={ticket.id}
    >
      <div className="bg-brand px-5 py-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
          Instituto DELPHOS
        </p>
        <p className="font-black text-lg leading-tight mt-1">
          {eventoTitulo || 'Evento'}
        </p>
        <p className="text-sm text-white/80 mt-1">
          {ticket.ingressoNome || 'Ingresso'}
          {ticket.natureza ? ` · ${ticket.natureza}` : ''}
        </p>
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <div
          className={cn(
            'shrink-0 rounded-2xl bg-white p-3 border border-gray-100',
            used && 'opacity-40'
          )}
          aria-label={`QR Code do ingresso ${ticket.codigo}`}
        >
          {qrValue ? (
            <QRCode value={qrValue} size={148} level="M" />
          ) : (
            <div className="w-[148px] h-[148px] bg-gray-100 rounded-xl" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left w-full">
          <div>
            <p className="label-micro flex items-center justify-center sm:justify-start gap-1">
              <Ticket size={12} aria-hidden="true" />
              Ticket {String(ticket.ordem).padStart(3, '0')}
            </p>
            <p className="font-mono font-black text-xl text-gray-900 tracking-wide break-all">
              {ticket.codigo}
            </p>
            {compradorNome ? (
              <p className="text-sm text-gray-500 mt-1">{compradorNome}</p>
            ) : null}
          </div>

          <p
            className={cn(
              'text-[11px] font-bold uppercase tracking-wider',
              used ? 'text-amber-600' : 'text-emerald-600'
            )}
          >
            {used ? 'Já utilizado no check-in' : ticket.status || 'Disponível'}
          </p>

          <p className="text-xs text-gray-400 leading-relaxed print:hidden">
            Apresente este QR no acesso. O administrador fará o check-in no dia
            do evento.
          </p>

          {onCopy ? (
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl print:hidden"
              onClick={() => onCopy(ticket.codigo)}
            >
              <Copy size={14} aria-hidden="true" />
              {copied ? 'Copiado' : 'Copiar código'}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

type TicketPassListProps = {
  tickets: TicketPassData[];
  eventoTitulo?: string;
  compradorNome?: string;
  title?: string;
};

export function TicketPassList({
  tickets,
  eventoTitulo,
  compradorNome,
  title = 'Seus ingressos',
}: TicketPassListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (codigo: string, id: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  if (tickets.length === 0) return null;

  return (
    <div className="space-y-4 ticket-pass-list">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="label-micro">{title}</p>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-xl"
          onClick={() => window.print()}
        >
          <Printer size={14} aria-hidden="true" />
          Imprimir
        </Button>
      </div>

      <div className="space-y-4">
        {tickets.map((t) => (
          <TicketPass
            key={t.id}
            ticket={t}
            eventoTitulo={eventoTitulo}
            compradorNome={compradorNome}
            copied={copiedId === t.id}
            onCopy={(codigo) => void handleCopy(codigo, t.id)}
          />
        ))}
      </div>
    </div>
  );
}
