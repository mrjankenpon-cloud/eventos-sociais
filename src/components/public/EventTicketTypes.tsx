import { Ticket } from 'lucide-react';
import type { Event } from '../../types';
import {
  formatTicketValue,
  getActiveTicketTypes,
  getTicketStatus,
} from '../../lib/eventData';
import { cn } from '../../lib/utils';

interface EventTicketTypesProps {
  event: Event;
  className?: string;
  /** When true, show inactive types as well (admin-style). Public = false. */
  includeInactive?: boolean;
}

export function EventTicketTypes({
  event,
  className,
  includeInactive = false,
}: EventTicketTypesProps) {
  const types = includeInactive
    ? event.tiposIngresso ?? []
    : getActiveTicketTypes(event);

  if (types.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <p className="label-micro">Ingressos</p>
      <ul className="space-y-3">
        {types.map((type) => {
          const status = getTicketStatus(type);
          const descricao = type.descricao?.trim();

          return (
            <li
              key={type.id}
              className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-white text-brand border border-gray-100">
                  <Ticket size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-black text-gray-900 leading-snug">
                      {type.nome}
                    </h3>
                    <p className="text-base font-black text-brand tabular-nums shrink-0">
                      {formatTicketValue(type)}
                    </p>
                  </div>

                  {descricao ? (
                    <p className="text-sm text-gray-500 leading-relaxed">{descricao}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <span>
                      Qtd.{' '}
                      <span className="text-gray-700 tabular-nums">{type.quantidade}</span>
                    </span>
                    <span
                      className={cn(
                        status.available ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
