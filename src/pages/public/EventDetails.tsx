import { useEffect, useState, useCallback, type ElementType, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Share2, Check } from 'lucide-react';
import { eventService } from '../../services/event.service';
import { sponsorService } from '../../services/sponsor.service';
import { institutionService } from '../../services/institution.service';
import type { Event, Institution, Sponsor } from '../../types';
import { ProcessingOverlay } from '../../components/ui/ProcessingOverlay';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { AppImage } from '../../components/ui/AppImage';
import { EventPartnersSection } from '../../components/public/EventPartnersSection';
import { EventTicketTypes } from '../../components/public/EventTicketTypes';
import { formatCurrency, formatEventDate } from '../../lib/utils';
import { getActiveTicketTypes } from '../../lib/eventData';
import { prefetchEventRegistration } from '../../lib/prefetchPublic';
import { THEME } from '../../theme';

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) {
      setEvent(null);
      setLoading(false);
      return;
    }
    try {
      const data = await eventService.getById(id);
      if (!data) {
        setEvent(null);
        setSponsors([]);
        setInstitutions([]);
        return;
      }

      setEvent(data);

      try {
        const sponsorIds = [...(data.patrocinadoresVinculados ?? [])]
          .sort((a, b) => a.ordem - b.ordem)
          .map((l) => l.id);
        const institutionIds = [...(data.instituicoesVinculadas ?? [])]
          .sort((a, b) => a.ordem - b.ordem)
          .map((l) => l.id);

        const [spAll, instAll] = await Promise.all([
          sponsorIds.length ? sponsorService.getByIds(sponsorIds) : Promise.resolve([]),
          institutionIds.length
            ? institutionService.getByIds(institutionIds)
            : Promise.resolve([]),
        ]);

        const spMap = new Map(spAll.map((s) => [s.id, s]));
        const instMap = new Map(instAll.map((i) => [i.id, i]));

        setSponsors(
          sponsorIds
            .map((sid) => spMap.get(sid))
            .filter((s): s is Sponsor => Boolean(s?.ativo))
        );
        setInstitutions(
          institutionIds
            .map((iid) => instMap.get(iid))
            .filter((i): i is Institution => Boolean(i?.ativo))
        );
      } catch (partnersError) {
        // Evento já carregou; parceiros não devem bloquear a página pública.
        console.warn('Erro ao carregar parceiros do evento:', partnersError);
        setSponsors([]);
        setInstitutions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    void prefetchEventRegistration();
  }, []);

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
      <div className="min-h-[50vh] relative">
        <ProcessingOverlay
          open
          label="Processando"
          detail="Carregando detalhes do evento..."
        />
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
    <div className="pb-12 sm:pb-16 min-h-screen bg-white">
      <div className="relative h-[36vh] min-h-[240px] sm:min-h-[280px] max-h-[420px] w-full -mt-[115px] pt-[115px]">
        <AppImage
          src={event.banner}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6">
          <div className="page-container">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white mb-2.5 transition-colors text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Voltar para eventos
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
              className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 max-w-4xl leading-tight"
            >
              {event.titulo}
            </motion.h1>
            {(event.subtitulo || event.descricaoCurta) && (
              <p className="text-white/70 text-sm max-w-2xl line-clamp-2">
                {event.subtitulo || event.descricaoCurta}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="page-container -mt-5 sm:-mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          <div className="lg:col-span-2 min-w-0">
            <div className="card-surface p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-3">
                Sobre o Evento
              </h2>
              <div className="space-y-2.5 text-gray-600 leading-relaxed text-[15px]">
                {(event.descricaoCompleta || event.descricaoCurta || '')
                  .split('\n')
                  .map((paragraph, idx) =>
                    paragraph.trim() ? (
                      <p key={idx}>{paragraph}</p>
                    ) : null
                  )}
              </div>

              {event.regulamento?.trim() && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <h3 className="text-base font-black text-gray-900 mb-2">Regulamento</h3>
                  <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                    {event.regulamento}
                  </div>
                </div>
              )}

              {event.exibirGaleria !== false &&
                ((event.imagens?.filter((i) => !i.isCover).length ?? 0) > 0 ||
                  (event.galeria?.length ?? 0) > 0) && (
                <div className="mt-5">
                  <h3 className="text-base font-black text-gray-900 mb-3">Galeria</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {(event.imagens?.filter((i) => !i.isCover).map((i) => i.url) ??
                      event.galeria
                    ).map((img, idx) => (
                      <AppImage
                        key={idx}
                        src={img}
                        alt={`Foto ${idx + 1} do evento`}
                        loading="lazy"
                        className="w-full h-28 sm:h-32 object-cover rounded-xl"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0">
            <div className="card-surface p-4 sm:p-5 sticky top-24 lg:top-28">
              <div className="space-y-3 mb-4">
                {event.categoria && (
                  <p className="label-micro text-brand">{event.categoria}</p>
                )}
                <InfoRow
                  icon={Calendar}
                  label="Data"
                  value={formatEventDate(event.data, { dateStyle: 'long' })}
                />
                <InfoRow
                  icon={Clock}
                  label="Horário"
                  value={`${event.horaInicio}${event.horaFim ? ` às ${event.horaFim}` : ''}`}
                />
                <InfoRow
                  icon={MapPin}
                  label="Local"
                  value={event.local}
                  detail={[event.endereco, event.cidade].filter(Boolean).join(' · ')}
                  action={
                    event.exibirMapa !== false && event.googleMaps ? (
                      <a
                        href={event.googleMaps}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand text-sm font-bold hover:underline mt-0.5 inline-block"
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

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <EventTicketTypes event={event} />

                {event.mostrarValor && getActiveTicketTypes(event).length === 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="label-micro">Investimento</p>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                      {event.gratuito || event.valor === 0
                        ? 'Gratuito'
                        : formatCurrency(event.valor)}
                    </p>
                  </div>
                )}

                {event.permitirCompraOnline !== false && event.permitirInscricao !== false && (
                  <Link
                    to={`/evento/${event.id}/inscricao`}
                    className="w-full h-12 bg-brand text-white rounded-xl font-black text-base flex items-center justify-center hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand/40"
                    onMouseEnter={() => {
                      void prefetchEventRegistration();
                    }}
                    onFocus={() => {
                      void prefetchEventRegistration();
                    }}
                    onTouchStart={() => {
                      void prefetchEventRegistration();
                    }}
                  >
                    {event.textoBotao}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 font-bold hover:text-brand transition-colors py-2 text-sm"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Link copiado
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      Compartilhar
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>

        <EventPartnersSection
          institutions={institutions}
          sponsors={sponsors}
          showInstitutions={event.exibirInstituicoes !== false}
          showSponsors={event.exibirPatrocinadores !== false}
        />
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
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="bg-brand-muted p-2 rounded-lg shrink-0 text-brand">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="label-micro mb-0">{label}</p>
        <p className="text-sm font-bold text-gray-900 break-words leading-snug">{value}</p>
        {detail && <p className="text-xs text-gray-500 mt-0.5 break-words">{detail}</p>}
        {action}
      </div>
    </div>
  );
}
