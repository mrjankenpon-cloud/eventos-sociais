import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  DollarSign,
  Users,
  Clock,
  Calendar as CalendarIcon,
  ArrowRight,
} from 'lucide-react';
import { Event } from '../../types';
import { formatEventDate, cn } from '../../lib/utils';
import { getEventPriceLabel } from '../../lib/eventData';
import { THEME } from '../../theme';
import { AppImage } from '../ui/AppImage';

interface BannerProps {
  event: Event;
}

/**
 * Destaque em 2/3 de foto sem sobreposição à esquerda e 1/3 de dados à direita.
 */
export const Banner: React.FC<BannerProps> = ({ event }) => {
  const weekday = formatEventDate(event.data, { weekday: 'long' });
  const fullDate = formatEventDate(event.data, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const description = (event.subtitulo || event.descricaoCurta)?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: THEME.motion.ease }}
      className="group relative mb-6 sm:mb-8 lg:mb-10 w-full"
    >
      <div
        className="absolute -inset-px rounded-2xl sm:rounded-[30px] lg:rounded-[34px] bg-brand opacity-10 blur-[2px] transition-opacity duration-500 group-hover:opacity-25"
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-3 rounded-2xl sm:rounded-[28px] lg:rounded-[32px] overflow-hidden shadow-xl bg-[#030712] border border-white/5">
        <div className="relative lg:col-span-2 h-[220px] sm:h-[280px] md:h-[340px] lg:h-auto lg:min-h-[420px] overflow-hidden bg-black">
          <AppImage
            src={event.banner}
            alt={event.titulo}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        </div>

        <div
          className={cn(
            'relative lg:col-span-1 flex flex-col justify-center gap-4 sm:gap-5 p-5 sm:p-7 lg:p-8 text-white overflow-hidden',
            THEME.gradient.header
          )}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32"
            aria-hidden="true"
          />

          <div className="relative z-10 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight line-clamp-3">
              {event.titulo}
            </h3>
            {description ? (
              <p className="text-white/85 text-[13px] font-medium leading-relaxed mt-2 line-clamp-3">
                {description}
              </p>
            ) : null}
          </div>

          <div className="relative z-10 flex flex-col gap-3 border-t border-white/10 pt-5">
            <Meta
              icon={CalendarIcon}
              label="Data"
              value={fullDate}
              detail={weekday}
            />
            {event.horaInicio ? (
              <Meta icon={Clock} label="Horário" value={event.horaInicio} />
            ) : null}
            {event.local?.trim() ? (
              <Meta icon={MapPin} label="Local" value={event.local} />
            ) : null}
            {event.mostrarValor !== false ? (
              <Meta
                icon={DollarSign}
                label="Ingresso"
                value={getEventPriceLabel(event)}
              />
            ) : null}
            {event.mostrarVagas ? (
              <Meta icon={Users} label="Vagas" value={`${event.vagas} no salão`} />
            ) : null}
          </div>

          <Link
            to={`/evento/${event.id}`}
            className="relative z-10 group/btn w-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/10 hover:border-transparent px-4 py-3.5 rounded-2xl transition-all duration-400 flex items-center justify-between gap-3 shadow-xl backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <span className="font-black text-[10px] tracking-[0.2em] uppercase truncate">
              {event.textoBotao || 'Participar'}
            </span>
            <span className="w-9 h-9 shrink-0 rounded-xl bg-white/5 group-hover/btn:bg-black/5 flex items-center justify-center transition-transform group-hover/btn:translate-x-1">
              <ArrowRight size={18} aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

function Meta({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="p-2 rounded-lg bg-white/10 border border-white/10 text-yellow-400 shrink-0">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="flex flex-col min-w-0 pt-0.5">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">
          {label}
        </span>
        <span className="text-[13px] font-bold tracking-wide leading-snug break-words first-letter:uppercase">
          {value}
        </span>
        {detail ? (
          <span className="text-[11px] font-medium text-white/60 leading-snug mt-0.5 first-letter:uppercase">
            {detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}
