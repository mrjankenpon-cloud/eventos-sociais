import type { Event, TicketType } from '../types/models/event';
import { formatCurrency } from './utils';

/** Active ticket types configured for the event (admin source of truth). */
export function getActiveTicketTypes(event: Event): TicketType[] {
  return (event.tiposIngresso ?? []).filter((t) => t.ativo);
}

export function getTicketTypeById(
  event: Event,
  ticketTypeId: string
): TicketType | undefined {
  return (event.tiposIngresso ?? []).find((t) => t.id === ticketTypeId);
}

/** Quantidade ainda disponível para compra */
export function getTicketAvailableQty(type: TicketType): number {
  if (typeof type.quantidadeDisponivel === 'number') {
    return Math.max(0, type.quantidadeDisponivel);
  }
  return Math.max(0, type.quantidade);
}

export function getTicketStatus(type: TicketType): {
  label: string;
  available: boolean;
} {
  if (!type.ativo) return { label: 'Inativo', available: false };
  if (getTicketAvailableQty(type) <= 0) {
    return { label: 'ESGOTADO', available: false };
  }
  return { label: 'Disponível', available: true };
}

/** Compact price label for cards/banners — derived only from active tickets. */
export function getEventPriceLabel(event: Event, decimals = 0): string {
  const active = getActiveTicketTypes(event);
  if (active.length === 0) {
    if (event.gratuito || event.valor === 0) return 'Gratuito';
    return formatCurrency(event.valor, decimals);
  }

  const values = active.map((t) => t.valor);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === 0 && max === 0) return 'Gratuito';
  if (min === max) return formatCurrency(min, decimals);
  return `A partir de ${formatCurrency(min, decimals)}`;
}

export function formatTicketValue(type: TicketType): string {
  return type.valor === 0 ? 'Gratuito' : formatCurrency(type.valor);
}
