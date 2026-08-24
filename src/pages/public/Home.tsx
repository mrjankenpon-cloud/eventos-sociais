import { useCallback, useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { EventCard } from '../../components/public/EventCard';
import BannerList from '../../components/public/BannerList';
import { InstitutionsStrip } from '../../components/public/InstitutionsStrip';
import { InstituteIntroBanner } from '../../components/public/InstituteIntroBanner';
import { VideosCarousel } from '../../components/public/VideosCarousel';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Spinner';
import { eventService } from '../../services/event.service';
import { Event } from '../../types';
import {
  peekPublicQuery,
  refreshPublicQuery,
} from '../../lib/publicDataCache';
import { prefetchPurchaseFunnel } from '../../lib/prefetchPublic';

const EVENTS_CACHE_KEY = 'events.published';

export default function Home() {
  const [events, setEvents] = useState<Event[]>(
    () => peekPublicQuery<Event[]>(EVENTS_CACHE_KEY) ?? []
  );
  const [loading, setLoading] = useState(
    () => peekPublicQuery<Event[]>(EVENTS_CACHE_KEY) === undefined
  );
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const hadCache = peekPublicQuery<Event[]>(EVENTS_CACHE_KEY) !== undefined;
    if (!hadCache) setLoading(true);

    try {
      // Sempre atualiza em rede; se já havia cache, a lista já está na tela.
      const data = await refreshPublicQuery(EVENTS_CACHE_KEY, () =>
        eventService.getPublished()
      );
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      if (!hadCache) {
        setError(
          'Não foi possível carregar os eventos. Tente novamente em instantes.'
        );
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback.bind(window)
        : (cb: () => void) => window.setTimeout(cb, 400);
    const id = idle(() => {
      void prefetchPurchaseFunnel();
    });
    return () => {
      if (typeof window === 'undefined') return;
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id as number);
      } else {
        clearTimeout(id as ReturnType<typeof setTimeout>);
      }
    };
  }, []);

  const featured = events.filter((e) => e.eventoDestaque);
  const list = featured.length > 0 ? events.filter((e) => !e.eventoDestaque) : events;

  return (
    <div className="pb-8 sm:pb-12 lg:pb-16 min-h-[50vh] bg-surface-muted">
      <InstitutionsStrip />

      <div className="page-container pt-5 sm:pt-8 lg:pt-12 space-y-8 sm:space-y-12 lg:space-y-16">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <InstituteIntroBanner />

        <section className="max-w-3xl space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Eventos beneficentes do Instituto Delphos
          </h1>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Programação, ingressos e ações solidárias em Barueri e região.
            Participe de um evento ou apoie as instituições parceiras com uma
            doação.
          </p>
        </section>

        {!loading && featured.length > 0 && (
          <section aria-label="Eventos em destaque">
            <BannerList events={featured} />
          </section>
        )}

        <section aria-label="Lista de eventos">
          {loading ? (
            <div className="public-events-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-3xl" />
              ))}
            </div>
          ) : list.length === 0 && featured.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhum evento publicado"
              description="Volte em breve para conferir as próximas ações."
            />
          ) : list.length > 0 ? (
            <div className="public-events-grid">
              {list.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : null}
        </section>

        <VideosCarousel />
      </div>
    </div>
  );
}
