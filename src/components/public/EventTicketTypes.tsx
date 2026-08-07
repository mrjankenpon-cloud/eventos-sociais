import { Ticket } from 'lucide-react';
import type { Event } from '../../types';
import {
  formatTicketValue,
  getActiveTicketTypes,
  getTicketAvailableQty,
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
    <div className={cn('space-y-2', className)}>
      <p className="label-micro">Ingressos</p>
      <ul className="space-y-2">
        {types.map((type) => {
          const status = getTicketStatus(type);
          const descricao = type.descricao?.trim();

          return (
            <li
              key={type.id}
              className="rounded-xl border border-gray-100 bg-gray-50/80 p-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-white text-brand border border-gray-100">
                  <Ticket size={14} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-black text-gray-900 leading-snug text-sm">
                      {type.nome}
                    </h3>
                    <p className="text-sm font-black text-brand tabular-nums shrink-0">
                      {formatTicketValue(type)}
                    </p>
                  </div>

                  {descricao ? (
                    <p className="text-xs text-gray-500 leading-relaxed">{descricao}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span>
                      Qtd.{' '}
                      <span className="text-gray-700 tabular-nums">
                        {getTicketAvailableQty(type)}
                      </span>
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
