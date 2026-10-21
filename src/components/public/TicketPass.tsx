import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import QRCode from 'react-qr-code';
import { Copy, Printer, Ticket } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn, formatEventDate } from '../../lib/utils';
import { APP_CONFIG } from '../../config';
import { BRAND_LOGOS } from '../../assets/brand';
import { formatCpfCnpj } from '../../lib/orgInfo';

export type TicketPassData = {
  id: string;
  codigo: string;
  qrPayload: string;
  status: string;
  ordem: number;
  ingressoNome?: string;
  natureza?: string;
  upgradedToInteira?: boolean;
  checkinRealizado?: boolean;
  retiradaRealizada?: boolean;
};

export type TicketEventInfo = {
  titulo?: string;
  data?: string;
  horaInicio?: string;
  horaFim?: string;
  local?: string;
  endereco?: string;
  cidade?: string;
};

export type TicketBuyerInfo = {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  documentoTipo?: 'cpf' | 'cnpj';
};

type TicketPassProps = {
  ticket: TicketPassData;
  evento?: TicketEventInfo;
  comprador?: TicketBuyerInfo;
  /** @deprecated use evento.titulo */
  eventoTitulo?: string;
  /** @deprecated use comprador.nome */
  compradorNome?: string;
  className?: string;
  onCopy?: (codigo: string) => void;
  copied?: boolean;
  onPrint?: () => void;
};

function DelphosTicketHeader() {
  return (
    <header className="ticket-pass-brand bg-gradient-to-r from-brand via-brand-dark to-brand-deeper px-5 py-4 text-white flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-medium tracking-[0.12em] uppercase text-white/90">
          Instituto
        </p>
        <p className="text-base sm:text-lg font-bold tracking-[0.22em] sm:tracking-[0.28em] uppercase leading-tight">
          DELPHOS
        </p>
      </div>
      <img
        src={BRAND_LOGOS.delphos}
        alt=""
        className="h-12 sm:h-14 w-auto object-contain drop-shadow-md shrink-0"
      />
    </header>
  );
}

function documentLabel(comprador?: TicketBuyerInfo): string {
  const digits = String(comprador?.cpf || '').replace(/\D/g, '');
  if (comprador?.documentoTipo === 'cnpj' || digits.length === 14) return 'CNPJ';
  return 'CPF';
}

function formatEventWhen(evento?: TicketEventInfo): string {
  if (!evento) return '';
  const parts: string[] = [];
  if (evento.data) parts.push(formatEventDate(evento.data));
  if (evento.horaInicio) {
    parts.push(
      evento.horaFim
        ? `${evento.horaInicio} – ${evento.horaFim}`
        : evento.horaInicio
    );
  }
  return parts.join(' · ');
}

/**
 * Ingresso digital estilo ticket — tela e impressão profissional.
 */
export function TicketPass({
  ticket,
  evento,
  comprador,
  eventoTitulo,
  compradorNome,
  className,
  onCopy,
  copied,
  onPrint,
}: TicketPassProps) {
  const qrValue = String(ticket.qrPayload || ticket.codigo || '').trim();
  const used =
    ticket.checkinRealizado ||
    ticket.retiradaRealizada ||
    ticket.status === 'Utilizado';

  const eventTitle = evento?.titulo || eventoTitulo || 'Evento';
  const buyerName = comprador?.nome || compradorNome || '';
  const when = formatEventWhen(evento);
  const place = [evento?.local, evento?.cidade].filter(Boolean).join(' · ');
  const address = evento?.endereco || '';

  return (
    <article
      className={cn(
        'ticket-pass rounded-[24px] border border-gray-200 bg-white overflow-hidden shadow-[var(--shadow-card)]',
        className
      )}
      data-ticket-id={ticket.id}
    >
      <DelphosTicketHeader />

      <div className="px-5 pt-4 pb-2 border-b border-dashed border-gray-200">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
          Ingresso oficial
        </p>
        <h2 className="font-black text-xl text-gray-900 leading-tight mt-1">
          {eventTitle}
        </h2>
        {when ? (
          <p className="text-sm font-semibold text-gray-700 mt-2">{when}</p>
        ) : null}
        {place ? (
          <p className="text-sm text-gray-600 mt-1">{place}</p>
        ) : null}
        {address ? (
          <p className="text-xs text-gray-500 mt-0.5">{address}</p>
        ) : null}
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-stretch">
        <div
          className={cn(
            'shrink-0 rounded-2xl bg-white p-3 border-2 border-gray-100 self-center',
            used && 'opacity-40'
          )}
          aria-label={`QR Code do ingresso ${ticket.codigo}`}
        >
          {qrValue ? (
            <QRCode value={qrValue} size={152} level="M" />
          ) : (
            <div className="w-[152px] h-[152px] bg-gray-100 rounded-xl" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-4 w-full">
          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Titular / Comprador
            </p>
            {buyerName ? (
              <p className="font-bold text-gray-900 text-sm leading-snug">
                {buyerName}
              </p>
            ) : null}
            <dl className="grid grid-cols-1 gap-1 text-xs text-gray-600">
              {comprador?.email ? (
                <div className="flex gap-2 min-w-0">
                  <dt className="text-gray-400 shrink-0">E-mail</dt>
                  <dd className="truncate font-medium">{comprador.email}</dd>
                </div>
              ) : null}
              {comprador?.telefone ? (
                <div className="flex gap-2 min-w-0">
                  <dt className="text-gray-400 shrink-0">Telefone</dt>
                  <dd className="font-medium">{comprador.telefone}</dd>
                </div>
              ) : null}
              {comprador?.cpf ? (
                <div className="flex gap-2 min-w-0">
                  <dt className="text-gray-400 shrink-0">
                    {documentLabel(comprador)}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {formatCpfCnpj(comprador.cpf)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div>
            <p className="label-micro flex items-center gap-1">
              <Ticket size={12} aria-hidden="true" />
              Ticket {String(ticket.ordem).padStart(3, '0')}
              {ticket.ingressoNome ? ` · ${ticket.ingressoNome}` : ''}
              {ticket.natureza ? ` · ${ticket.natureza}` : ''}
            </p>
            <p className="font-mono font-black text-lg text-gray-900 tracking-wide break-all mt-1">
              {ticket.codigo}
            </p>
            <p
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider mt-2',
                used ? 'text-amber-600' : 'text-emerald-600'
              )}
            >
              {used ? 'Já utilizado no check-in' : ticket.status || 'Válido'}
            </p>
            {ticket.upgradedToInteira ? (
              <p className="text-[11px] font-bold text-amber-800 mt-2">
                Observação: Meia convertida em inteira
              </p>
            ) : null}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed print:hidden">
            Apresente este QR no acesso. Cada código libera apenas este ingresso
            — se a compra tiver mais de um, cada pessoa precisa do seu QR.
          </p>

          {onPrint || onCopy ? (
            <div className="flex flex-col sm:flex-row gap-2 print:hidden">
              {onPrint ? (
                <Button
                  size="sm"
                  className="rounded-xl w-full sm:w-auto"
                  onClick={onPrint}
                  aria-label={`Salvar PDF ou imprimir ingresso ${ticket.codigo}`}
                >
                  <Printer size={14} aria-hidden="true" />
                  Salvar PDF / Imprimir
                </Button>
              ) : null}
              {onCopy ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl w-full sm:w-auto"
                  onClick={() => onCopy(ticket.codigo)}
                >
                  <Copy size={14} aria-hidden="true" />
                  {copied ? 'Copiado' : 'Copiar código'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 text-[10px] text-gray-400 font-medium">
        <span>{APP_CONFIG.name}</span>
        <span className="tabular-nums">#{ticket.codigo}</span>
      </footer>
    </article>
  );
}

type TicketPassListProps = {
  tickets: TicketPassData[];
  evento?: TicketEventInfo;
  comprador?: TicketBuyerInfo;
  eventoTitulo?: string;
  compradorNome?: string;
  title?: string;
};

export function TicketPassList({
  tickets,
  evento,
  comprador,
  eventoTitulo,
  compradorNome,
  title = 'Seus ingressos',
}: TicketPassListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [printTicketId, setPrintTicketId] = useState<string | null>(null);

  const handleCopy = async (codigo: string, id: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handlePrintOne = (ticketId: string) => {
    flushSync(() => {
      setPrintTicketId(ticketId);
    });
    document.body.classList.add('printing-one-ticket');
    const cleanup = () => {
      document.body.classList.remove('printing-one-ticket');
      setPrintTicketId(null);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  if (tickets.length === 0) return null;

  const eventInfo: TicketEventInfo = {
    titulo: evento?.titulo || eventoTitulo,
    data: evento?.data,
    horaInicio: evento?.horaInicio,
    horaFim: evento?.horaFim,
    local: evento?.local,
    endereco: evento?.endereco,
    cidade: evento?.cidade,
  };

  const buyerInfo: TicketBuyerInfo = {
    nome: comprador?.nome || compradorNome,
    email: comprador?.email,
    telefone: comprador?.telefone,
    cpf: comprador?.cpf,
    documentoTipo: comprador?.documentoTipo,
  };

  const ticketsForPrint = printTicketId
    ? tickets.filter((t) => t.id === printTicketId)
    : tickets;

  return (
    <div
      className="ticket-pass-list"
      data-print-active={printTicketId ? 'true' : undefined}
    >
      <div className="print:hidden mb-4">
        <p className="label-micro">{title}</p>
        {tickets.length > 1 ? (
          <p className="text-xs text-gray-400 mt-1">
            Cada ingresso tem o próprio botão para salvar PDF ou imprimir.
          </p>
        ) : null}
      </div>

      {/* Tela: lista contínua */}
      <div className="space-y-4 print:hidden">
        {tickets.map((t) => (
          <TicketPass
            key={t.id}
            ticket={t}
            evento={eventInfo}
            comprador={buyerInfo}
            copied={copiedId === t.id}
            onCopy={(codigo) => void handleCopy(codigo, t.id)}
            onPrint={() => handlePrintOne(t.id)}
          />
        ))}
      </div>

      {/* Impressão: 1 ingresso por folha quando individual; senão 1–2 por folha */}
      <div className="hidden print:block ticket-print-pages" aria-hidden="true">
        {chunkTickets(ticketsForPrint, printTicketId ? 1 : 2).map(
          (pageTickets, pageIndex) => (
            <section
              key={`print-page-${pageIndex}`}
              className={
                pageTickets.length === 1
                  ? 'ticket-print-page ticket-print-page--single'
                  : 'ticket-print-page'
              }
            >
              {pageTickets.map((t) => (
                <TicketPass
                  key={`print-${t.id}`}
                  ticket={t}
                  evento={eventInfo}
                  comprador={buyerInfo}
                />
              ))}
            </section>
          )
        )}
      </div>
    </div>
  );
}

function chunkTickets<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}
