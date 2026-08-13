import React, { useEffect, useId, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { resolveTicketObservacao } from '../../lib/ticketObservacao';
import { cn } from '../../lib/utils';

type TicketTypeInfoProps = {
  ticketKey?: string;
  descricao?: string;
  nome?: string;
  className?: string;
};

/**
 * Ícone de observação (exclamação) — hover ou clique abre as regras
 * de meia / inteira / retirada (ou texto customizado do admin).
 */
export function TicketTypeInfo({
  ticketKey,
  descricao,
  nome,
  className,
}: TicketTypeInfoProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const text = resolveTicketObservacao({
    key: ticketKey,
    descricao,
    nome,
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-flex shrink-0', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Observações: ${nome || 'ingresso'}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-full',
          'border border-amber-200 bg-amber-50 text-amber-700',
          'hover:bg-amber-100 hover:border-amber-300 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'
        )}
      >
        <CircleAlert size={15} aria-hidden="true" strokeWidth={2.25} />
      </button>

      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className={cn(
            'absolute z-30 left-0 top-full mt-2 w-[min(18rem,calc(100vw-2.5rem))]',
            'rounded-2xl border border-amber-100 bg-white p-3.5 shadow-[var(--shadow-card)]',
            'text-left'
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1.5">
            Observações
            {nome ? ` · ${nome}` : ''}
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">{text}</p>
        </div>
      ) : null}
    </div>
  );
}
