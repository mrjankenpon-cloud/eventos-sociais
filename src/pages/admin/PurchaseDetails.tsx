import { useCallback, useEffect, useState } from 'react';
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
  RefreshCw,
  ArrowUpCircle,
} from 'lucide-react';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { eventService } from '../../services/event.service';
import { Purchase, Ticket, Event } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { Badge, Button, PageLoader, EmptyState, Toast, AppImage } from '../../components/ui';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { UpgradePixModal, type UpgradePixPayload } from '../../components/admin/UpgradePixModal';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { formatCurrency, formatEventDate } from '../../lib/utils';
import {
  donationDate,
  donationStatusBadgeVariant,
  donationStatusLabel,
  formatDonorDocument,
  donorDocumentLabel,
} from '../../lib/donations';

function isMeiaTicket(t: Ticket): boolean {
  const key = String(t.ingressoKey || '').toLowerCase();
  const nome = String(t.ingressoNome || '').toLowerCase();
  return key === 'meia' || nome.includes('meia');
}

function unitForTicket(purchase: Purchase, ticket: Ticket): number {
  if (Array.isArray(purchase.itens) && ticket.ingressoId) {
    const line = purchase.itens.find((i) => i.ingressoId === ticket.ingressoId);
    if (line && typeof line.valorUnitario === 'number' && line.valorUnitario > 0) {
      return line.valorUnitario;
    }
  }
  if (typeof purchase.valorUnitario === 'number' && purchase.valorUnitario > 0) {
    return purchase.valorUnitario;
  }
  const qty = Math.max(1, purchase.quantidadeIngressos || 1);
  return purchase.valorTotal / qty;
}

export default function PurchaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundingAll, setRefundingAll] = useState(false);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [pixOpen, setPixOpen] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixPayload, setPixPayload] = useState<UpgradePixPayload | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const [pixTicket, setPixTicket] = useState<Ticket | null>(null);
  const [undoTicket, setUndoTicket] = useState<Ticket | null>(null);
  const { message, show, clear } = useFlashMessage();

  const reload = async (purchaseId: string) => {
    const p = await purchaseService.getById(purchaseId);
    if (p) {
      setPurchase(p);
      const tks = await ticketService.getByPurchaseId(p.id);
      setTickets(tks.sort((a, b) => a.ordem - b.ordem));
    }
  };

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
    void loadData();
  }, [id]);

  const refundedAmount = Number(purchase?.refundedAmount) || 0;

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

  const handleUndo = async () => {
    if (!undoTicket) return;
    setBusyTicketId(undoTicket.id);
    try {
      const isRetirada = undoTicket.natureza === 'retirada';
      await ticketService.undoCheckin(undoTicket.id, 'Operador Admin');
      setTickets((prev) =>
        prev.map((t) =>
          t.id === undoTicket.id
            ? isRetirada
              ? { ...t, retiradaRealizada: false, retiradaEm: undefined }
              : {
                  ...t,
                  status: 'Disponível',
                  checkinRealizado: false,
                  checkinEm: undefined,
                }
            : t
        )
      );
      setUndoTicket(null);
      show(
        'success',
        isRetirada
          ? 'Retirada desfeita. O ingresso voltou a ficar disponível.'
          : 'Check-in desfeito. O ingresso voltou a ficar disponível.'
      );
    } catch (error: unknown) {
      show(
        'error',
        error instanceof Error ? error.message : 'Erro ao desfazer o check-in.'
      );
    } finally {
      setBusyTicketId(null);
    }
  };

  const handleRefundAll = async () => {
    if (!purchase) return;
    const ok = window.confirm(
      'Confirmar reembolso integral via Mercado Pago? Cancela todos os ingressos restantes e devolve o valor restante.'
    );
    if (!ok) return;
    setRefundingAll(true);
    try {
      await purchaseService.refund(purchase.id);
      await reload(purchase.id);
      show('success', 'Reembolso integral processado.');
    } catch (error: unknown) {
      show(
        'error',
        error instanceof Error ? error.message : 'Falha no reembolso.'
      );
    } finally {
      setRefundingAll(false);
    }
  };

  const handleRefundTicket = async (ticket: Ticket) => {
    if (!purchase) return;
    const unit = unitForTicket(purchase, ticket);
    const ok = window.confirm(
      `Reembolsar apenas o ticket ${ticket.codigo}?\nValor estimado: ${formatCurrency(unit)}\nO ingresso será cancelado e o estoque devolvido.`
    );
    if (!ok) return;
    setBusyTicketId(ticket.id);
    try {
      const res = await purchaseService.refund(purchase.id, {
        ticketId: ticket.id,
        amount: unit,
      });
      await reload(purchase.id);
      show(
        'success',
        res.fullyRefunded
          ? 'Ticket reembolsado. Pedido totalmente reembolsado.'
          : `Ticket reembolsado (${formatCurrency(res.amount || unit)}).`
      );
    } catch (error: unknown) {
      show(
        'error',
        error instanceof Error ? error.message : 'Falha no reembolso parcial.'
      );
    } finally {
      setBusyTicketId(null);
    }
  };

  const handleUpgradeMeia = async (ticket: Ticket) => {
    if (!purchase) return;
    setPixTicket(ticket);
    setPixOpen(true);
    setPixError(null);
    setPixPayload(null);
    setPixLoading(true);
    setBusyTicketId(ticket.id);
    try {
      const res = await purchaseService.createTicketUpgrade(ticket.id);
      setPixPayload({
        pedidoId: res.pedidoId,
        ticketId: res.ticketId || ticket.id,
        diff: res.diff,
        fromValor: res.fromValor,
        toValor: res.toValor,
        toIngressoNome: res.toIngressoNome,
        qrCode: res.qrCode,
        qrCodeBase64: res.qrCodeBase64,
        ticketUrl: res.ticketUrl,
        expiresAt: res.expiresAt,
        confirmed: Boolean(res.confirmed),
      });
    } catch (error: unknown) {
      setPixError(
        error instanceof Error ? error.message : 'Falha ao gerar o PIX da diferença.'
      );
    } finally {
      setPixLoading(false);
      setBusyTicketId(null);
    }
  };

  const handlePixConfirmed = useCallback(() => {
    if (!purchase) return;
    void reload(purchase.id);
    show('success', 'PIX confirmado. O ingresso agora é inteira.');
  }, [purchase, show]);

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

  if (purchase.tipo === 'doacao') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 min-w-0">
        <PageHeader
          title="Doação"
          subtitle={
            purchase.certificadoNumero ||
            `Registro ${purchase.id.slice(0, 8)}…`
          }
          onBack={() => navigate(-1)}
          backLabel="Voltar"
        />

        <section className="card-surface p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={donationStatusBadgeVariant(purchase.statusPagamento)}>
              {donationStatusLabel(purchase.statusPagamento)}
            </Badge>
            {purchase.certificadoNumero ? (
              <Badge variant="neutral">{purchase.certificadoNumero}</Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Doador" value={purchase.compradorNome} />
            <Detail
              label={donorDocumentLabel(purchase)}
              value={formatDonorDocument(purchase)}
            />
            <Detail label="E-mail" value={purchase.compradorEmail} />
            <Detail label="Telefone" value={purchase.compradorTelefone || '—'} />
            <Detail
              label="Valor"
              value={formatCurrency(purchase.valorTotal)}
              highlight
            />
            <Detail
              label="Data"
              value={donationDate(purchase).toLocaleString('pt-BR')}
            />
          </div>

          {purchase.mensagemDoador?.trim() ? (
            <blockquote className="text-sm text-gray-600 italic border-l-4 border-brand/30 pl-4">
              “{purchase.mensagemDoador.trim()}”
            </blockquote>
          ) : null}

          {purchase.mpPaymentId ? (
            <p className="text-xs text-gray-400">
              Pagamento MP: {purchase.mpPaymentId}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const horario = event
    ? [event.horaInicio, event.horaFim].filter(Boolean).join(' – ')
    : '';
  const canRefundMoney =
    purchase.statusPagamento === 'confirmado' &&
    Boolean(purchase.mpPaymentId) &&
    purchase.valorTotal > 0 &&
    refundedAmount < purchase.valorTotal - 0.001;

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
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {event.subtitulo}
                </p>
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
            </div>

            <div className="sm:text-right shrink-0 sm:pl-4 sm:border-l sm:border-gray-100">
              <p className="label-micro mb-1">Valor pago</p>
              <p className="text-2xl font-black text-brand tabular-nums">
                {purchase.valorTotal === 0
                  ? 'Gratuito'
                  : formatCurrency(purchase.valorTotal)}
              </p>
              {refundedAmount > 0 ? (
                <p className="text-xs text-amber-700 font-bold mt-1">
                  Já reembolsado: {formatCurrency(refundedAmount)}
                </p>
              ) : null}
              <Badge
                variant={
                  purchase.statusPagamento === 'confirmado'
                    ? 'success'
                    : purchase.statusPagamento === 'cancelado' ||
                        purchase.statusPagamento === 'expirado' ||
                        purchase.statusPagamento === 'reembolsado'
                      ? 'danger'
                      : 'warning'
                }
                className="mt-2"
              >
                {purchase.statusPagamento}
              </Badge>
              {purchase.mpPaymentId ? (
                <p className="text-[10px] font-mono text-gray-400 mt-2 break-all">
                  MP: {purchase.mpPaymentId}
                </p>
              ) : null}
              {canRefundMoney ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 rounded-xl"
                  isLoading={refundingAll}
                  onClick={() => void handleRefundAll()}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Reembolsar tudo
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

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
            <div className="grid grid-cols-1 gap-3">
              {tickets.map((t) => {
                const refundable =
                  canRefundMoney &&
                  (t.status === 'Disponível' || t.status === 'Utilizado');
                const canUpgrade =
                  purchase.statusPagamento === 'confirmado' &&
                  t.status === 'Disponível' &&
                  isMeiaTicket(t) &&
                  !t.upgradedToInteira;
                const pixPending = canUpgrade && t.upgradeStatus === 'pendente';

                return (
                  <motion.div
                    key={t.id}
                    layout
                    className={`p-4 rounded-2xl border min-w-0 ${
                      t.status === 'Utilizado'
                        ? 'bg-green-50 border-green-100'
                        : t.status === 'Reembolsado' || t.status === 'Cancelado'
                          ? 'bg-red-50/50 border-red-100'
                          : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                            {t.ingressoNome ? ` · ${t.ingressoNome}` : ''}
                          </p>
                          <p className="text-xs font-black text-gray-900 font-mono truncate">
                            {t.codigo}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatCurrency(unitForTicket(purchase, t))}
                            {t.upgradedToInteira
                              ? ' · Meia convertida em inteira'
                              : pixPending
                                ? ' · aguardando PIX da diferença'
                                : ''}
                            {t.status === 'Utilizado' && t.checkinEm
                              ? ` · check-in ${new Date(t.checkinEm).toLocaleString('pt-BR')}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {t.status === 'Disponível' ? (
                          <Button
                            size="sm"
                            onClick={() => void handleCheckin(t.id)}
                            className="rounded-xl"
                            disabled={busyTicketId === t.id}
                          >
                            Check-in
                          </Button>
                        ) : t.status === 'Utilizado' ? (
                          <div className="flex items-center gap-2">
                            <div className="text-green-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-1">
                              <CheckCircle size={14} aria-hidden="true" />
                              OK
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setUndoTicket(t)}
                            >
                              Desfazer
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="danger">{t.status}</Badge>
                        )}

                        {canUpgrade ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-xl"
                            isLoading={busyTicketId === t.id}
                            onClick={() => void handleUpgradeMeia(t)}
                          >
                            <ArrowUpCircle size={14} aria-hidden="true" />
                            {pixPending
                              ? 'Ver PIX da diferença'
                              : 'Pagar diferença (PIX)'}
                          </Button>
                        ) : null}

                        {refundable ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-red-600"
                            isLoading={busyTicketId === t.id}
                            onClick={() => void handleRefundTicket(t)}
                          >
                            <RefreshCw size={14} aria-hidden="true" />
                            Reembolsar ticket
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(undoTicket)}
        onClose={() => setUndoTicket(null)}
        onConfirm={() => void handleUndo()}
        title="Desfazer check-in?"
        description={
          undoTicket
            ? `Quer realmente desfazer o check-in do ingresso ${undoTicket.codigo}? O ingresso volta a ficar disponível para conferência.`
            : ''
        }
        confirmLabel="Desfazer"
        cancelLabel="Manter"
        variant="danger"
        isLoading={Boolean(undoTicket && busyTicketId === undoTicket.id)}
      />
      <Toast message={message} onClose={clear} />
      <UpgradePixModal
        open={pixOpen}
        payload={pixPayload}
        loading={pixLoading}
        error={pixError}
        onClose={() => {
          setPixOpen(false);
          setPixTicket(null);
        }}
        onConfirmed={handlePixConfirmed}
        onRetry={
          pixTicket ? () => void handleUpgradeMeia(pixTicket) : undefined
        }
      />
    </div>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="label-micro">{label}</p>
      <p
        className={`mt-1 font-bold break-words ${
          highlight ? 'text-brand text-lg tabular-nums' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
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
