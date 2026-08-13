import type { Event, TicketType } from '../types/models/event';
import { formatCurrency } from './utils';
import { typeCompetesForEventSeats } from '../types/ingressoNatureza';

export { typeCompetesForEventSeats };

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

export function getEventSalonSold(event: Event): number {
  if (typeof event.vagasVendidasCompetindo === 'number') {
    return Math.max(0, event.vagasVendidasCompetindo);
  }
  return (event.tiposIngresso ?? [])
    .filter((t) => typeCompetesForEventSeats(t))
    .reduce((s, t) => s + Math.max(0, t.quantidadeVendida || 0), 0);
}

/** Vagas do salão ainda livres (não inclui cotas isoladas). */
export function getEventSalonRemaining(event: Event): number {
  return Math.max(0, (event.vagas || 0) - getEventSalonSold(event));
}

/** Quantidade ainda disponível para compra deste tipo. */
export function getTicketAvailableQty(type: TicketType, event?: Event): number {
  const sold = Math.max(0, type.quantidadeVendida || 0);
  if (!typeCompetesForEventSeats(type)) {
    if (typeof type.quantidadeDisponivel === 'number') {
      return Math.max(0, type.quantidadeDisponivel);
    }
    return Math.max(0, type.quantidade - sold);
  }

  const salon = event ? getEventSalonRemaining(event) : Number.POSITIVE_INFINITY;
  const cap = Math.max(0, type.quantidade || 0);
  const typeRemain = cap > 0 ? Math.max(0, cap - sold) : salon;
  if (!Number.isFinite(salon)) return typeRemain;
  return Math.max(0, Math.min(typeRemain, salon));
}

export function getTicketStatus(
  type: TicketType,
  event?: Event
): {
  label: string;
  available: boolean;
} {
  if (!type.ativo) return { label: 'Inativo', available: false };
  if (getTicketAvailableQty(type, event) <= 0) {
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
