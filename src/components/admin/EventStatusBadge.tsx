import { Bell } from 'lucide-react';
import { Badge } from '../ui';
import type { Event } from '../../types';
import { getEventDisplayStatus } from '../../lib/eventDisplayStatus';

interface EventStatusBadgeProps {
  event: Event;
  now?: Date;
  className?: string;
}

export function EventStatusBadge({
  event,
  now,
  className,
}: EventStatusBadgeProps) {
  const status = getEventDisplayStatus(event, now);
  return (
    <Badge variant={status.variant} className={`gap-1 ${className ?? ''}`}>
      {status.notified && status.kind === 'disponivel' ? (
        <Bell size={10} aria-hidden="true" className="shrink-0" />
      ) : null}
      {status.label}
      {status.notified && status.kind === 'disponivel' ? (
        <span className="sr-only">com notificação enviada</span>
      ) : null}
    </Badge>
  );
}
