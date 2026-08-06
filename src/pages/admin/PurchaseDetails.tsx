import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  User,
  CreditCard,
  Calendar,
  Ticket as TicketIcon,
  Clock,
  FileText,
  UserCheck,
} from 'lucide-react';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { eventService } from '../../services/event.service';
import { Purchase, Ticket, Event } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { Badge, Button, PageLoader, EmptyState, Toast } from '../../components/ui';
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
          setTickets(tks);
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

  const usedCount = tickets.filter((t) => t.status === 'Utilizado').length;
  const progress =
    tickets.length === 0 ? 0 : (usedCount / tickets.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6 min-w-0">
      <PageHeader
        title={`#${purchase.id}`}
        subtitle={`Realizada em ${new Date(purchase.createdAt).toLocaleString('pt-BR')}`}
        onBack={() => navigate(-1)}
        backLabel="Voltar"
        actions={
          <Badge
            variant={
              purchase.statusPagamento === 'confirmado' ? 'success' : 'warning'
            }
          >
            {purchase.statusPagamento === 'confirmado'
              ? 'Pagamento Confirmado'
              : 'Aguardando Pagamento'}
          </Badge>
        }
      />

      <p className="label-micro flex items-center gap-2 text-brand -mt-2">
        <FileText size={12} aria-hidden="true" /> Relatório da compra
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <section className="card-surface p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-black flex items-center gap-2">
              <User className="text-brand" size={20} aria-hidden="true" />
              Dados do Comprador
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Nome Completo" value={purchase.compradorNome} />
              <Field label="CPF" value={purchase.compradorCPF} />
              <Field label="E-mail" value={purchase.compradorEmail} />
              <Field label="Telefone" value={purchase.compradorTelefone} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black flex items-center gap-2">
                <TicketIcon className="text-brand" size={20} aria-hidden="true" />
                Ingressos
              </h3>
              <span className="label-micro">{tickets.length} tickets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tickets.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  className={`card-surface p-5 ${
                    t.status === 'Utilizado' ? 'bg-green-50/40 border-green-100' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="label-micro mb-1">
                        Ticket {t.ordem.toString().padStart(3, '0')}
                      </p>
                      <p className="text-sm font-black font-mono truncate">
                        {t.codigo}
                      </p>
                    </div>
                    <Badge
                      variant={
                        t.status === 'Utilizado'
                          ? 'used'
                          : t.status === 'Disponível'
                            ? 'available'
                            : 'danger'
                      }
                    >
                      {t.status}
                    </Badge>
                  </div>

                  {t.status === 'Utilizado' ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl">
                      <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center shrink-0">
                        <UserCheck size={16} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="label-micro">Utilizado em</p>
                        <p className="text-xs font-black text-gray-900">
                          {t.checkinEm
                            ? new Date(t.checkinEm).toLocaleString('pt-BR')
                            : '—'}
                        </p>
                      </div>
                    </div>
                  ) : t.status === 'Disponível' ? (
                    <Button
                      onClick={() => handleCheckin(t.id)}
                      className="w-full rounded-2xl"
                      size="sm"
                    >
                      Confirmar Entrada
                    </Button>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 min-w-0">
          <section className="bg-brand text-white rounded-[32px] p-6 sm:p-7 space-y-5 shadow-lg shadow-brand/20">
            <div>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">
                Evento
              </p>
              <h4 className="text-xl font-black leading-tight">
                {event?.titulo || '---'}
              </h4>
            </div>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <Calendar size={16} aria-hidden="true" />
                <span>{event ? formatEventDate(event.data) : '---'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} aria-hidden="true" />
                <span>
                  {event?.horaInicio || '---'} às {event?.horaFim || '---'}
                </span>
              </div>
            </div>
            {event && (
              <Link
                to={ROUTES.ADMIN.EVENT_CHECKIN.replace(':id', event.id)}
                className="inline-flex text-xs font-black uppercase tracking-wider underline underline-offset-4 opacity-80 hover:opacity-100"
              >
                Ir para check-in
              </Link>
            )}
          </section>

          <section className="card-surface p-6 space-y-4">
            <h4 className="font-black flex items-center gap-2">
              <CreditCard className="text-brand" size={18} aria-hidden="true" />
              Pagamento
            </h4>
            <div className="flex justify-between items-end border-b border-gray-50 pb-4">
              <p className="label-micro">Valor Total</p>
              <p className="text-2xl font-black tabular-nums">
                {formatCurrency(purchase.valorTotal)}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="label-micro">Quantidade</p>
              <p className="font-black">
                {purchase.quantidadeIngressos} ingressos
              </p>
            </div>
          </section>

          <section className="bg-brand-deeper text-white rounded-[32px] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-xs uppercase tracking-widest">
                Utilização
              </h4>
              <span className="text-2xl font-black text-blue-300 tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-brand"
              />
            </div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest text-center">
              {usedCount} de {tickets.length} ingressos utilizados
            </p>
          </section>
        </aside>
      </div>

      <Toast message={message} onClose={clear} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="label-micro mb-1">{label}</p>
      <p className="font-bold text-gray-900 break-words">{value}</p>
    </div>
  );
}
