import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { EventCard } from '../../components/public/EventCard';
import BannerList from '../../components/public/BannerList';
import { Collaborators } from '../../components/public/Collaborators';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Spinner';
import { eventService } from '../../services/event.service';
import { Event } from '../../types';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await eventService.getPublished();
        setEvents(data);
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
        setError('Não foi possível carregar os eventos. Tente novamente em instantes.');
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const featured = events.filter((e) => e.eventoDestaque);
  const list = featured.length > 0 ? events.filter((e) => !e.eventoDestaque) : events;

  return (
    <div className="pb-16 sm:pb-20 min-h-[60vh] bg-surface-muted">
      <div className="page-container pt-8 sm:pt-12 space-y-12 sm:space-y-16">
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

        {!loading && <Collaborators />}

        <section id="eventos" className="scroll-mt-28">
          <div className="mb-8 sm:mb-10">
            <p className="label-micro mb-2">Programação</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Eventos
            </h2>
            <p className="mt-2 text-sm text-gray-500 max-w-xl">
              Participe das próximas experiências sociais e institucionais.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {[1, 2, 3, 4].map((n) => (
                <Skeleton key={n} className="aspect-[4/5] rounded-[32px]" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 items-stretch">
              {(list.length > 0 ? list : events).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="card-surface">
              <EmptyState
                icon={Calendar}
                title="Nenhum evento disponível"
                description="No momento não há eventos publicados. Volte em breve."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
