import { useEffect, useState, useCallback, type ElementType, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Share2, Check } from 'lucide-react';
import { eventService } from '../../services/event.service';
import { Event } from '../../types';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatEventDate } from '../../lib/utils';
import { THEME } from '../../theme';

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      try {
        const data = await eventService.getById(id);
        if (data) setEvent(data);
      } catch (error) {
        console.error('Erro ao carregar evento:', error);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    const url = window.location.href;
    const shareData = {
      title: event.titulo,
      text: event.descricaoCurta,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      /* user cancelled share */
    }
  }, [event]);

  if (loading) {
    return (
      <div className="py-20">
        <PageLoader label="Carregando evento..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-container py-20">
        <EmptyState
          icon={Calendar}
          title="Evento não encontrado"
          description="O evento pode ter sido removido ou o link está incorreto."
          action={
            <Link to="/">
              <Button variant="primary">Voltar aos eventos</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-32 min-h-screen bg-white">
      <div className="relative h-[50vh] min-h-[320px] sm:min-h-[400px] w-full -mt-[115px] pt-[115px]">
        <img
          src={event.banner}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 md:p-12">
          <div className="page-container">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 transition-colors text-sm font-semibold"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              Voltar para eventos
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 max-w-4xl leading-tight"
            >
              {event.titulo}
            </motion.h1>
            <p className="text-white/70 text-sm sm:text-base max-w-2xl line-clamp-2">
              {event.descricaoCurta}
            </p>
          </div>
        </div>
      </div>

      <div className="page-container -mt-8 sm:-mt-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 min-w-0">
            <div className="card-surface p-6 sm:p-8 md:p-10">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-5">
                Sobre o Evento
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-[15px]">
                {event.descricaoCompleta.split('\n').map((paragraph, idx) =>
                  paragraph.trim() ? (
                    <p key={idx}>{paragraph}</p>
                  ) : null
                )}
              </div>

              {event.galeria && event.galeria.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-lg font-black text-gray-900 mb-5">Galeria</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {event.galeria.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Foto ${idx + 1} do evento`}
                        loading="lazy"
                        className="w-full h-36 sm:h-40 object-cover rounded-2xl"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0">
            <div className="card-surface p-6 sm:p-8 sticky top-24 lg:top-28">
              <div className="space-y-5 mb-8">
                <InfoRow
                  icon={Calendar}
                  label="Data"
                  value={formatEventDate(event.data, { dateStyle: 'long' })}
                />
                <InfoRow
                  icon={Clock}
                  label="Horário"
                  value={`${event.horaInicio} às ${event.horaFim}`}
                />
                <InfoRow
                  icon={MapPin}
                  label="Local"
                  value={event.local}
                  detail={event.endereco}
                  action={
                    event.googleMaps ? (
                      <a
                        href={event.googleMaps}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand text-sm font-bold hover:underline mt-1 inline-block"
                      >
                        Ver no mapa
                      </a>
                    ) : null
                  }
                />
                {event.mostrarVagas && (
                  <InfoRow
                    icon={Users}
                    label="Vagas"
                    value={`${event.vagas} lugares`}
                  />
                )}
              </div>

              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <p className="label-micro">Investimento</p>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">
                    {event.gratuito ? 'Gratuito' : formatCurrency(event.valor)}
                  </p>
                </div>

                <Link
                  to={`/evento/${event.id}/inscricao`}
                  className="w-full h-14 sm:h-16 bg-brand text-white rounded-2xl font-black text-lg flex items-center justify-center hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  {event.textoBotao}
                </Link>

                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-gray-500 font-bold hover:text-brand transition-colors py-3"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-5 h-5" aria-hidden="true" />
                      Link copiado
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" aria-hidden="true" />
                      Compartilhar
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  detail,
  action,
}: {
  icon: ElementType;
  label: string;
  value: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 min-w-0">
      <div className="bg-brand-muted p-3 rounded-xl shrink-0 text-brand">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="label-micro mb-0.5">{label}</p>
        <p className="text-base font-bold text-gray-900 break-words">{value}</p>
        {detail && <p className="text-sm text-gray-500 mt-0.5 break-words">{detail}</p>}
        {action}
      </div>
    </div>
  );
}
