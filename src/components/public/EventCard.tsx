import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { Event } from '../../types';
import { Badge } from '../ui/Badge';
import { formatEventDate } from '../../lib/utils';
import { getEventPriceLabel } from '../../lib/eventData';
import { THEME } from '../../theme';
import { AppImage } from '../ui/AppImage';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
      className="group relative aspect-[4/5] card-surface overflow-hidden transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 h-full"
    >
      <Link to={`/evento/${event.id}`} className="flex flex-col h-full focus-visible:outline-none">
        <div className="relative h-[60%] overflow-hidden shrink-0">
          <AppImage
            src={event.banner}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70" />

          {event.eventoDestaque && (
            <div className="absolute top-5 left-5">
              <Badge variant="highlight">Destaque</Badge>
            </div>
          )}

          <div className="absolute bottom-5 left-5 right-5">
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-md">
              {event.titulo}
            </h3>
          </div>
        </div>

        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-h-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-gray-400">
              <Calendar size={15} className="text-brand shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {formatEventDate(event.data)}
              </span>
            </div>

            <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">
              {event.descricaoCurta}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
              <MapPin size={14} className="shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">
                {event.local}
              </span>
            </div>

            <div className="text-brand font-black text-sm shrink-0 tabular-nums">
              {getEventPriceLabel(event, 0).toUpperCase()}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
};
