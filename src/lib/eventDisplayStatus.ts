import type { Event } from '../types/models/event';
import { parseEventDate } from './utils';

export type EventDisplayKind =
  | 'rascunho'
  | 'disponivel'
  | 'encerrado'
  | 'arquivado';

export interface EventDisplayStatus {
  kind: EventDisplayKind;
  label: string;
  /** Aligns with Badge variants in components/ui/Badge. */
  variant: 'draft' | 'available' | 'neutral' | 'danger';
  /** Aviso push já foi enviado na publicação. */
  notified: boolean;
}

function parseTimeParts(time: string): {
  hours: number;
  minutes: number;
  seconds: number;
} | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
    seconds: Number(match[3] || 0),
  };
}

/**
 * Instant when the event schedule ends (data + horaFim).
 * Falls back to horaInicio, then end of day.
 */
export function getEventEndDateTime(
  event: Pick<Event, 'data' | 'horaFim' | 'horaInicio'>
): Date {
  const base = parseEventDate(event.data);
  if (Number.isNaN(base.getTime())) return new Date(NaN);

  const parts =
    parseTimeParts(event.horaFim || '') ||
    parseTimeParts(event.horaInicio || '');

  if (!parts) {
    base.setHours(23, 59, 59, 999);
    return base;
  }

  base.setHours(parts.hours, parts.minutes, parts.seconds, 0);
  return base;
}

/**
 * Encerrado a partir do minuto seguinte ao horário de fim
 * (ex.: termina às 16:00 → Encerrado a partir de 16:01).
 */
export function isEventPastEnd(
  event: Pick<Event, 'data' | 'horaFim' | 'horaInicio'>,
  now: Date = new Date()
): boolean {
  const end = getEventEndDateTime(event);
  if (Number.isNaN(end.getTime())) return false;
  const closesAt = new Date(end.getTime() + 60_000);
  return now.getTime() >= closesAt.getTime();
}

export function isEventArchived(
  event: Pick<Event, 'status' | 'arquivado'>
): boolean {
  return event.status === 'arquivado' || Boolean(event.arquivado);
}

/**
 * Status operacional para listagens/admin — acompanha publicação e prazo.
 * Não altera Firestore; só a leitura na UI.
 */
export function getEventDisplayStatus(
  event: Pick<
    Event,
    | 'publicado'
    | 'status'
    | 'arquivado'
    | 'data'
    | 'horaFim'
    | 'horaInicio'
    | 'notificacaoEnviadaEm'
  >,
  now: Date = new Date()
): EventDisplayStatus {
  if (isEventArchived(event)) {
    return {
      kind: 'arquivado',
      label: 'Arquivado',
      variant: 'danger',
      notified: false,
    };
  }

  if (!event.publicado) {
    return {
      kind: 'rascunho',
      label: 'Rascunho',
      variant: 'draft',
      notified: false,
    };
  }

  if (isEventPastEnd(event, now)) {
    return {
      kind: 'encerrado',
      label: 'Encerrado',
      variant: 'neutral',
      notified: Boolean(event.notificacaoEnviadaEm),
    };
  }

  return {
    kind: 'disponivel',
    label: 'Disponível',
    variant: 'available',
    notified: Boolean(event.notificacaoEnviadaEm),
  };
}
