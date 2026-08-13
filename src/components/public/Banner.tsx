import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Users, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { Event } from '../../types';
import { parseEventDate } from '../../lib/utils';
import { getEventPriceLabel } from '../../lib/eventData';
import { THEME } from '../../theme';
import { AppImage } from '../ui/AppImage';

interface BannerProps {
  event: Event;
}

export const Banner: React.FC<BannerProps> = ({ event }) => {
  const dateObj = parseEventDate(event.data);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = dateObj
    .toLocaleDateString('pt-BR', { month: 'long' })
    .toUpperCase();
  const year = dateObj.getFullYear();
  const primaryColor = THEME.colors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: THEME.motion.ease }}
      className="group relative mb-10 w-full max-w-6xl mx-auto"
    >
      <div
        className="absolute -inset-px rounded-[34px] opacity-10 blur-[2px] transition-opacity duration-500 group-hover:opacity-25"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col md:flex-row h-auto md:h-[400px] rounded-[32px] overflow-hidden shadow-xl bg-[#030712] border border-white/5">
        <div className="w-full md:w-2/3 h-[320px] sm:h-[400px] md:h-full relative overflow-hidden">
          <AppImage
            src={event.banner}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute bottom-5 left-5 right-5 md:bottom-10 md:left-10 text-white z-10">
            <div className="bg-black/25 backdrop-blur-[14px] border border-white/10 rounded-[24px] p-5 md:p-7 w-full md:max-w-[500px] shadow-2xl">
              <h3 className="text-2xl sm:text-[32px] md:text-[38px] font-bold mb-2 tracking-tighter leading-tight drop-shadow-lg">
                {event.titulo}
              </h3>
              {(event.subtitulo || event.descricaoCurta)?.trim() ? (
                <p className="text-white/90 line-clamp-2 mb-5 text-sm font-medium leading-relaxed">
                  {event.subtitulo?.trim() || event.descricaoCurta}
                </p>
              ) : (
                <div className="mb-5" />
              )}

              <div className="flex flex-wrap gap-x-5 gap-y-3 items-center">
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
            </div>
          </div>
        </div>

        <div
          className="w-full md:w-1/3 flex flex-col items-center justify-center p-8 sm:p-10 text-white relative overflow-hidden"
          style={{ backgroundColor: primaryColor }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32"
            aria-hidden="true"
          />

          <div className="text-center relative z-10 w-full flex flex-col items-center">
            <div className="mb-8">
              <span className="block text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-none">
                {day}
              </span>
              <span className="block text-[11px] font-black tracking-[0.5em] uppercase opacity-70 mt-3">
                {month}
              </span>
              <div className="flex items-center justify-center gap-4 my-5">
                <div className="h-px w-6 bg-white/20" />
                <span className="text-sm font-black tracking-[0.4em] opacity-30">
                  {year}
                </span>
                <div className="h-px w-6 bg-white/20" />
              </div>
              <div className="flex items-center justify-center gap-2.5 text-lg font-bold tracking-widest">
                <CalendarIcon size={20} className="opacity-40" aria-hidden="true" />
                <span>{event.horaInicio}</span>
              </div>
            </div>

            <Link
              to={`/evento/${event.id}`}
              className="w-full group/btn bg-white/10 hover:bg-white text-white hover:text-black border border-white/10 hover:border-transparent px-5 py-4 rounded-2xl transition-all duration-400 flex items-center justify-between shadow-xl backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <span className="font-black text-[10px] tracking-[0.35em] uppercase ml-2">
                {event.textoBotao || 'Participar'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-white/5 group-hover/btn:bg-black/5 flex items-center justify-center transition-transform group-hover/btn:translate-x-1">
                <ArrowRight size={18} aria-hidden="true" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="p-2 rounded-lg bg-white/10 border border-white/10 text-yellow-400 shrink-0">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">
          {label}
        </span>
        <span className="text-[11px] font-bold tracking-wide truncate">{value}</span>
      </div>
    </div>
  );
}
