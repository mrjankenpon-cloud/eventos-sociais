import { useCallback, useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { EventCard } from '../../components/public/EventCard';
import BannerList from '../../components/public/BannerList';
import { InstitutionsStrip } from '../../components/public/InstitutionsStrip';
import { VideosCarousel } from '../../components/public/VideosCarousel';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Spinner';
import { eventService } from '../../services/event.service';
import { Event } from '../../types';
import { prefetchPurchaseFunnel } from '../../lib/prefetchPublic';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await eventService.getPublished();
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setError('Não foi possível carregar os eventos. Tente novamente em instantes.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
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
    <div className="pb-16 sm:pb-20 min-h-[60vh] bg-surface-muted">
      <InstitutionsStrip />

      <div className="page-container pt-6 sm:pt-10 space-y-10 sm:space-y-14">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!loading && featured.length > 0 && (
          <section aria-label="Eventos em destaque">
            <BannerList events={featured} />
          </section>
        )}

        <section aria-label="Lista de eventos">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
