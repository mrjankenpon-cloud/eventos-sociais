import React from 'react';
import { Banner } from './Banner';
import { Event } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { Calendar } from 'lucide-react';

interface BannerListProps {
  events: Event[];
}

export default function BannerList({ events }: BannerListProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Nenhum evento em destaque"
        description="Os próximos destaques aparecerão aqui."
        className="py-16"
      />
    );
  }

  return (
    <section className="space-y-8" aria-label="Destaques">
      {events.map((event) => (
        <Banner key={event.id} event={event} />
      ))}
    </section>
  );
}
