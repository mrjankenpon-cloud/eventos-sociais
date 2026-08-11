import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar,
  Ticket as TicketIcon,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { eventService } from '../../services/event.service';
import { Purchase, Ticket, Event } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { Badge, Button, PageLoader, EmptyState, Toast, AppImage } from '../../components/ui';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { formatCurrency, formatEventDate } from '../../lib/utils';

export default function PurchaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const { message, show, clear } = useFlashMessage();

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const p = await purchaseService.getById(id);
        if (p) {
          setPurchase(p);
          const [tks, evt] = await Promise.all([
            ticketService.getByPurchaseId(p.id),
            eventService.getById(p.eventId),
          ]);
          setTickets(tks.sort((a, b) => a.ordem - b.ordem));
          if (evt) setEvent(evt);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleCheckin = async (ticketId: string) => {
    try {
      await ticketService.performCheckin(ticketId, 'Operador Admin');
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: 'Utilizado',
                checkinRealizado: true,
                checkinEm: new Date().toISOString(),
              }
            : t
        )
      );
      show('success', 'Check-in realizado com sucesso!');
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao realizar check-in.';
      show('error', msg);
    }
  };

  if (loading) return <PageLoader label="Carregando detalhes..." />;
  if (!purchase) {
    return (
      <EmptyState
        title="Compra não encontrada"
        description="O registro pode ter sido removido."
        action={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        }
      />
    );
  }

  const horario = event
    ? [event.horaInicio, event.horaFim].filter(Boolean).join(' – ')
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 min-w-0">
      <PageHeader
        title={`Compra ${purchase.id}`}
        subtitle={`Realizada em ${new Date(purchase.createdAt).toLocaleString('pt-BR')}`}
        onBack={() => navigate(-1)}
        backLabel="Voltar"
        actions={
          event ? (
            <Link to={ROUTES.ADMIN.EVENT_CHECKIN.replace(':id', event.id)}>
              <Button variant="secondary" className="rounded-2xl">
                Ir para check-in
                <ExternalLink size={16} aria-hidden="true" />
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* 1. Dados do evento — horizontal no topo */}
      {event && (
        <section className="card-surface p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
            {event.banner ? (
              <AppImage
                src={event.banner}
                alt=""
                className="w-full sm:w-28 h-36 sm:h-20 rounded-2xl object-cover shrink-0"
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight truncate">
                {event.titulo}
              </h2>
              {event.subtitulo?.trim() ? (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{event.subtitulo}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-3 sm:gap-4 shrink-0">
              <EventMeta
                icon={Calendar}
                label="Data"
                value={formatEventDate(event.data)}
              />
              {horario ? (
                <EventMeta icon={Clock} label="Horário" value={horario} />
              ) : null}
              {event.local?.trim() ? (
                <EventMeta icon={MapPin} label="Local" value={event.local} />
              ) : null}
            </div>
          </div>
        </section>
      )}

      {/* 2. Comprador + valor pago ao lado */}
      <section className="card-surface overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Badge variant="info">Compra: {purchase.id}</Badge>
              <h3 className="text-xl font-black text-gray-900 leading-tight">
                {purchase.compradorNome}
              </h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500 font-medium">
                {purchase.compradorCPF ? <span>{purchase.compradorCPF}</span> : null}
                {purchase.compradorTelefone ? (
                  <>
                    <span className="text-gray-300 hidden sm:inline">•</span>
                    <span>{purchase.compradorTelefone}</span>
                  </>
                ) : null}
                {purchase.compradorEmail ? (
                  <>
                    <span className="text-gray-300 hidden sm:inline">•</span>
                    <span className="break-all">{purchase.compradorEmail}</span>
                  </>
                ) : null}
              </div>
              {purchase.ticketTypeNome?.trim() ? (
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-1">
                  {purchase.ticketTypeNome}
                  {purchase.quantidadeIngressos > 0
                    ? ` · ${purchase.quantidadeIngressos} ${
                        purchase.quantidadeIngressos === 1 ? 'ingresso' : 'ingressos'
                      }`
                    : ''}
                </p>
              ) : purchase.quantidadeIngressos > 0 ? (
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-1">
                  {purchase.quantidadeIngressos}{' '}
                  {purchase.quantidadeIngressos === 1 ? 'ingresso' : 'ingressos'}
                </p>
              ) : null}
            </div>

            <div className="sm:text-right shrink-0 sm:pl-4 sm:border-l sm:border-gray-100">
              <p className="label-micro mb-1">Valor pago</p>
              <p className="text-2xl font-black text-brand tabular-nums">
                {purchase.valorTotal === 0
                  ? 'Gratuito'
                  : formatCurrency(purchase.valorTotal)}
              </p>
              <Badge
                variant={
                  purchase.statusPagamento === 'confirmado'
                    ? 'success'
                    : purchase.statusPagamento === 'cancelado'
                      ? 'danger'
                      : 'warning'
                }
                className="mt-2"
              >
                {purchase.statusPagamento === 'confirmado'
                  ? 'Confirmado'
                  : purchase.statusPagamento === 'cancelado'
                    ? 'Cancelado'
                    : 'Pendente'}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Ingressos comprados */}
      <section className="card-surface overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="label-micro flex items-center gap-2">
              <TicketIcon size={14} aria-hidden="true" />
              Ingressos ({tickets.length})
            </p>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              title="Nenhum ingresso"
              description="Esta compra ainda não possui tickets gerados."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tickets.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 min-w-0 ${
                    t.status === 'Utilizado'
                      ? 'bg-green-50 border-green-100'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        t.status === 'Utilizado'
                          ? 'bg-green-200 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {t.status === 'Utilizado' ? (
                        <UserCheck size={18} aria-hidden="true" />
                      ) : (
                        <TicketIcon size={18} aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="label-micro">
                        Ticket {t.ordem.toString().padStart(3, '0')}
                      </p>
                      <p className="text-xs font-black text-gray-900 font-mono truncate">
                        {t.codigo}
                      </p>
                      {t.status === 'Utilizado' && t.checkinEm ? (
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(t.checkinEm).toLocaleString('pt-BR')}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {t.status === 'Disponível' ? (
                    <Button
                      size="sm"
                      onClick={() => handleCheckin(t.id)}
                      className="rounded-xl shrink-0"
                    >
                      Confirmar
                    </Button>
                  ) : t.status === 'Utilizado' ? (
                    <div className="text-green-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-1 shrink-0">
                      <CheckCircle size={14} aria-hidden="true" />
                      OK
                    </div>
                  ) : (
                    <Badge variant="danger">{t.status}</Badge>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Toast message={message} onClose={clear} />
    </div>
  );
}

function EventMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 sm:min-w-[7.5rem] px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
      <div className="shrink-0 p-2 rounded-lg bg-white text-brand border border-gray-100">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="label-micro">{label}</p>
        <p className="text-xs font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
