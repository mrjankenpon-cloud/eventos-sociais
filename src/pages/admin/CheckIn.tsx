import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  UserCheck,
  AlertCircle,
  Ticket as TicketIcon,
  QrCode,
  Clock,
  Search,
  Calendar,
  MapPin,
  ArrowUpCircle,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { Event, Purchase, Ticket as TicketType } from '../../types';
import { ROUTES } from '../../config';
import { QRScanner } from '../../components/admin/QRScanner';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { Modal, Button, Badge, PageLoader, EmptyState, Toast, AppImage } from '../../components/ui';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { UpgradePixModal, type UpgradePixPayload } from '../../components/admin/UpgradePixModal';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { formatCurrency, formatEventDate } from '../../lib/utils';

export default function CheckIn() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { message, show, clear } = useFlashMessage();

  const [showScanner, setShowScanner] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<TicketType | null>(null);
  const [scannedPurchase, setScannedPurchase] = useState<Purchase | null>(null);
  const [siblingTickets, setSiblingTickets] = useState<TicketType[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [undoTicket, setUndoTicket] = useState<TicketType | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixPayload, setPixPayload] = useState<UpgradePixPayload | null>(null);
  const [pixError, setPixError] = useState<string | null>(null);
  const scanLock = useRef(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [eventData, purchasesData, ticketsData] = await Promise.all([
          eventService.getById(id),
          purchaseService.getByEventId(id),
          ticketService.getByEventId(id),
        ]);
        if (eventData) setEvent(eventData);
        setPurchases(purchasesData);
        setTickets(ticketsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const purchaseKeyOf = (t: TicketType) =>
    String(t.compraId || t.pedidoId || '').trim();

  const handleCheckin = async (ticketId: string) => {
    try {
      const before =
        tickets.find((x) => x.id === ticketId) ||
        siblingTickets.find((x) => x.id === ticketId) ||
        (scannedTicket?.id === ticketId ? scannedTicket : null);
      const isRetirada = before?.natureza === 'retirada';
      await ticketService.performCheckin(ticketId, 'Operador Admin', id);
      const patch = isRetirada
        ? {
            retiradaRealizada: true as const,
            retiradaEm: new Date().toISOString(),
          }
        : {
            status: 'Utilizado' as const,
            checkinRealizado: true,
            checkinEm: new Date().toISOString(),
          };
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...patch } : t))
      );
      setSiblingTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...patch } : t))
      );
      if (scannedTicket?.id === ticketId) {
        setScannedTicket((prev) => (prev ? { ...prev, ...patch } : null));
      }
      show(
        'success',
        isRetirada
          ? `Retirada confirmada no ingresso ${before?.codigo || ''}.`
          : `Check-in individual confirmado: ${before?.codigo || ticketId}.`
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao realizar check-in.';
      show('error', msg);
      throw error;
    }
  };

  const handleUndo = async () => {
    if (!undoTicket || !id) return;
    setUndoing(true);
    try {
      const isRetirada = undoTicket.natureza === 'retirada';
      await ticketService.undoCheckin(undoTicket.id, 'Operador Admin', id);
      const patch = isRetirada
        ? { retiradaRealizada: false, retiradaEm: undefined }
        : {
            status: 'Disponível' as const,
            checkinRealizado: false,
            checkinEm: undefined,
          };
      setTickets((prev) =>
        prev.map((t) => (t.id === undoTicket.id ? { ...t, ...patch } : t))
      );
      setSiblingTickets((prev) =>
        prev.map((t) => (t.id === undoTicket.id ? { ...t, ...patch } : t))
      );
      if (scannedTicket?.id === undoTicket.id) {
        setScannedTicket((prev) => (prev ? { ...prev, ...patch } : null));
      }
      setUndoTicket(null);
      show(
        'success',
        isRetirada
          ? `Retirada desfeita no ingresso ${undoTicket.codigo}.`
          : `Check-in desfeito: ${undoTicket.codigo}.`
      );
    } catch (error: unknown) {
      show(
        'error',
        error instanceof Error ? error.message : 'Erro ao desfazer o check-in.'
      );
    } finally {
      setUndoing(false);
    }
  };

  const handleScan = useCallback(
    async (code: string) => {
      if (scanLock.current) return;
      scanLock.current = true;
      window.setTimeout(() => {
        scanLock.current = false;
      }, 2000);

      try {
        const ticket = await ticketService.getByCode(code);
        if (!ticket) {
          show('error', 'Ticket não localizado neste QR.');
          return;
        }
        if (ticket.eventoId !== id) {
          show('error', 'Este ticket pertence a outro evento.');
          return;
        }
        const purchaseId = purchaseKeyOf(ticket);
        const purchase = purchaseId
          ? await purchaseService.getById(purchaseId)
          : null;
        const siblings = purchaseId
          ? (await ticketService.getByPurchaseId(purchaseId)).sort(
              (a, b) => a.ordem - b.ordem
            )
          : [ticket];

        setScannedTicket(ticket);
        setScannedPurchase(purchase);
        setSiblingTickets(siblings.length ? siblings : [ticket]);
        setShowScanner(false);
      } catch (err) {
        show(
          'error',
          err instanceof Error ? err.message : 'Erro ao processar QR Code.'
        );
      }
    },
    [id, show]
  );

  const closeScannerModal = () => {
    setScannedTicket(null);
    setScannedPurchase(null);
    setSiblingTickets([]);
    setConfirming(false);
  };

  const openUpgradePix = async (ticket: TicketType) => {
    setPixOpen(true);
    setPixError(null);
    setPixPayload(null);
    setPixLoading(true);
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
    }
  };

  const patchTicketToInteira = (ticketId: string, nome?: string) => {
    const apply = (t: TicketType): TicketType =>
      t.id === ticketId
        ? {
            ...t,
            ingressoKey: 'inteira',
            ingressoNome: nome || 'Inteira',
            upgradedToInteira: true,
            upgradeStatus: 'confirmado',
          }
        : t;
    setTickets((prev) => prev.map(apply));
    setScannedTicket((prev) => (prev ? apply(prev) : prev));
    setSiblingTickets((prev) => prev.map(apply));
  };

  const handlePixConfirmed = useCallback(() => {
    if (!scannedTicket) return;
    patchTicketToInteira(
      scannedTicket.id,
      pixPayload?.toIngressoNome
    );
    show('success', 'PIX confirmado. O ingresso agora é inteira.');
  }, [scannedTicket, pixPayload?.toIngressoNome, show]);

  const confirmScanned = async () => {
    if (!scannedTicket || confirming) return;
    setConfirming(true);
    try {
      await handleCheckin(scannedTicket.id);
      window.setTimeout(() => {
        closeScannerModal();
        setShowScanner(true);
      }, 1200);
    } catch {
      setConfirming(false);
    }
  };

  const ticketsByPurchase = useMemo(() => {
    const map = new Map<string, TicketType[]>();
    for (const t of tickets) {
      const key = purchaseKeyOf(t);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [tickets]);

  const filteredPurchases = useMemo(() => {
    if (!searchTerm) return [];
    const q = searchTerm.toLowerCase();
    return purchases.filter(
      (p) =>
        p.compradorNome.toLowerCase().includes(q) ||
        p.compradorCPF.includes(q) ||
        p.compradorEmail.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (ticketsByPurchase.get(p.id) || []).some((t) =>
          t.codigo.toLowerCase().includes(q)
        )
    );
  }, [purchases, ticketsByPurchase, searchTerm]);

  if (loading) return <PageLoader label="Carregando participantes..." />;
  if (!event) {
    return (
      <EmptyState
        title="Evento não encontrado"
        description="Não foi possível abrir o check-in."
      />
    );
  }

  const horario = [event.horaInicio, event.horaFim].filter(Boolean).join(' – ');
  const scannedPending = scannedTicket
    ? isTicketPending(scannedTicket)
    : false;
  const canUpgradePix = Boolean(
    scannedTicket &&
      scannedPurchase?.statusPagamento === 'confirmado' &&
      scannedTicket.status === 'Disponível' &&
      isMeiaTicket(scannedTicket) &&
      !scannedTicket.upgradedToInteira
  );
  const siblingTotal = Math.max(siblingTickets.length, 1);
  const siblingsRemaining = siblingTickets.filter(
    (t) =>
      scannedTicket &&
      t.id !== scannedTicket.id &&
      isTicketPending(t)
  ).length;

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 min-w-0">
        <PageHeader
          title="Check-in"
          subtitle="Cada QR Code libera um ingresso. Escaneie um por um na entrada."
          backTo={ROUTES.ADMIN.EVENTS}
          backLabel="Voltar para eventos"
        />

        {/* Dados do evento — faixa horizontal */}
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

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchField
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Nome, CPF, E-mail ou Código..."
            className="flex-1"
          />
          <Button
            onClick={() => setShowScanner(true)}
            className="rounded-2xl h-12 shrink-0"
          >
            <QrCode size={18} aria-hidden="true" />
            Ler QR Code
          </Button>
        </div>

        <div className="space-y-4">
          {searchTerm && filteredPurchases.length === 0 && (
            <div className="card-surface">
              <EmptyState
                icon={Search}
                title="Nenhuma inscrição encontrada"
                description="Tente outro nome, CPF, e-mail ou código."
              />
            </div>
          )}

          {filteredPurchases.map((p) => {
            const purchaseTickets = (ticketsByPurchase.get(p.id) || []).sort(
              (a, b) => a.ordem - b.ordem
            );

            return (
              <motion.div
                layout
                key={p.id}
                className="card-surface overflow-hidden"
              >
                {/* Comprador + valor pago */}
                <div className="p-5 sm:p-6 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <Badge variant="info">Compra: {p.id}</Badge>
                      <h3 className="text-xl font-black text-gray-900 leading-tight">
                        {p.compradorNome}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500 font-medium">
                        {p.compradorCPF ? <span>{p.compradorCPF}</span> : null}
                        {p.compradorTelefone ? (
                          <>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <span>{p.compradorTelefone}</span>
                          </>
                        ) : null}
                        {p.compradorEmail ? (
                          <>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <span className="break-all">{p.compradorEmail}</span>
                          </>
                        ) : null}
                      </div>
                      {p.ticketTypeNome?.trim() ? (
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-1">
                          {p.ticketTypeNome}
                        </p>
                      ) : null}
                    </div>

                    <div className="sm:text-right shrink-0 sm:pl-4 sm:border-l sm:border-gray-100">
                      <p className="label-micro mb-1">Valor pago</p>
                      <p className="text-2xl font-black text-brand tabular-nums">
                        {p.valorTotal === 0
                          ? 'Gratuito'
                          : formatCurrency(p.valorTotal)}
                      </p>
                      <Badge
                        variant={
                          p.statusPagamento === 'confirmado'
                            ? 'success'
                            : p.statusPagamento === 'cancelado'
                              ? 'danger'
                              : 'neutral'
                        }
                        className="mt-2"
                      >
                        {p.statusPagamento === 'confirmado'
                          ? 'Confirmado'
                          : p.statusPagamento === 'cancelado'
                            ? 'Cancelado'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">
                  <p className="label-micro px-1">
                    Ingressos individuais ({purchaseTickets.length}) — check-in
                    um a um
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {purchaseTickets.map((t) => {
                      const done = isTicketDone(t);
                      const pending = isTicketPending(t);
                      return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 min-w-0 ${
                          done
                            ? 'bg-green-50 border-green-100'
                            : 'bg-white border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              done
                                ? 'bg-green-200 text-green-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {done ? (
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
                          </div>
                        </div>

                        {pending ? (
                          <Button
                            size="sm"
                            onClick={() => void handleCheckin(t.id).catch(() => undefined)}
                            className="rounded-xl shrink-0"
                          >
                            Confirmar
                          </Button>
                        ) : canUndoTicket(t) ? (
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="text-green-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-1">
                              <CheckCircle size={14} aria-hidden="true" />
                              {t.checkinEm || t.retiradaEm
                                ? new Date(
                                    t.checkinEm || t.retiradaEm || ''
                                  ).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'OK'}
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
                          <div className="text-green-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-1 shrink-0">
                            <CheckCircle size={14} aria-hidden="true" />
                            {t.checkinEm || t.retiradaEm
                              ? new Date(
                                  t.checkinEm || t.retiradaEm || ''
                                ).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'OK'}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {!searchTerm && (
            <EmptyState
              icon={Search}
              title="Busque uma inscrição"
              description="Digite nome, CPF, e-mail ou código do ticket para começar."
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showScanner && (
          <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      <Modal
        isOpen={Boolean(scannedTicket)}
        onClose={closeScannerModal}
        title={
          scannedPending ? 'Ingresso individual' : 'Ingresso já utilizado'
        }
        maxWidth="md"
      >
        {scannedTicket && (
          <div className="space-y-6">
            <div
              className={`rounded-2xl p-5 text-center ${
                scannedPending ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${
                  scannedPending
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {scannedPending ? (
                  <UserCheck size={32} aria-hidden="true" />
                ) : (
                  <AlertCircle size={32} aria-hidden="true" />
                )}
              </div>
              <p className="text-2xl font-black text-gray-900">
                Ticket {String(scannedTicket.ordem || 1).padStart(3, '0')}
                {siblingTotal > 1
                  ? ` de ${String(siblingTotal).padStart(3, '0')}`
                  : ''}
              </p>
              <p className="font-mono font-black text-sm text-gray-800 mt-2 break-all">
                {scannedTicket.codigo}
              </p>
              {scannedTicket.ingressoNome ? (
                <p className="text-sm font-bold text-gray-600 mt-2">
                  {scannedTicket.ingressoNome}
                </p>
              ) : null}
              {!scannedPending && (
                <p className="text-red-600/70 text-xs font-bold uppercase tracking-wider mt-3">
                  Este QR já foi usado no check-in
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-micro mb-1">Comprador (referência)</p>
                  <p className="text-lg font-black text-gray-900">
                    {scannedPurchase?.compradorNome || '---'}
                  </p>
                </div>
                {scannedPurchase && (
                  <div className="text-right shrink-0">
                    <p className="label-micro mb-1">Valor da compra</p>
                    <p className="text-lg font-black text-brand tabular-nums">
                      {scannedPurchase.valorTotal === 0
                        ? 'Gratuito'
                        : formatCurrency(scannedPurchase.valorTotal)}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                O check-in vale só para este ingresso. Os demais QR Codes da
                mesma compra precisam ser lidos separadamente.
              </p>
            </div>

            {siblingTickets.length > 1 ? (
              <div className="space-y-2">
                <p className="label-micro">
                  Demais ingressos desta compra
                  {siblingsRemaining > 0
                    ? ` · ${siblingsRemaining} ainda pendente${
                        siblingsRemaining > 1 ? 's' : ''
                      }`
                    : ' · todos ok'}
                </p>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {siblingTickets.map((t) => {
                    const isCurrent = t.id === scannedTicket.id;
                    const done = isTicketDone(t);
                    return (
                      <li
                        key={t.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                          isCurrent
                            ? 'border-brand/40 bg-brand/5'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium text-gray-800">
                          {String(t.ordem).padStart(3, '0')} ·{' '}
                          <span className="font-mono text-xs">{t.codigo}</span>
                          {t.ingressoNome ? ` · ${t.ingressoNome}` : ''}
                          {isCurrent ? ' (lido agora)' : ''}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] font-black uppercase tracking-wider ${
                            done ? 'text-green-600' : 'text-amber-600'
                          }`}
                        >
                          {done ? 'OK' : 'Pendente'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {!scannedPending && scannedTicket.checkinEm && (
              <div className="p-5 bg-gray-50 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} aria-hidden="true" />
                  <span className="label-micro">Detalhes do acesso</span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(scannedTicket.checkinEm).toLocaleString('pt-BR')}
                  {scannedTicket.operador ? ` · ${scannedTicket.operador}` : ''}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={closeScannerModal}
                className="flex-1"
              >
                Fechar
              </Button>
              {canUpgradePix ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    scannedTicket && void openUpgradePix(scannedTicket)
                  }
                  className="flex-1"
                >
                  <ArrowUpCircle size={16} aria-hidden="true" />
                  {scannedTicket?.upgradeStatus === 'pendente'
                    ? 'Ver PIX da diferença'
                    : 'Pagar diferença (PIX)'}
                </Button>
              ) : null}
              {scannedPending && (
                <Button
                  onClick={() => void confirmScanned()}
                  disabled={confirming}
                  className="flex-[2]"
                >
                  {confirming
                    ? 'Confirmando…'
                    : 'Confirmar só este ingresso'}
                </Button>
              )}
              {!scannedPending && canUndoTicket(scannedTicket) ? (
                <Button
                  variant="outline"
                  onClick={() => setUndoTicket(scannedTicket)}
                  className="flex-[2]"
                >
                  Desfazer check-in
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      <UpgradePixModal
        open={pixOpen}
        payload={pixPayload}
        loading={pixLoading}
        error={pixError}
        onClose={() => setPixOpen(false)}
        onConfirmed={handlePixConfirmed}
        onRetry={
          scannedTicket ? () => void openUpgradePix(scannedTicket) : undefined
        }
      />

      <ConfirmDialog
        isOpen={Boolean(undoTicket)}
        onClose={() => setUndoTicket(null)}
        onConfirm={() => void handleUndo()}
        title={
          undoTicket?.natureza === 'retirada'
            ? 'Desfazer retirada?'
            : 'Desfazer check-in?'
        }
        description={
          undoTicket
            ? `Quer realmente desfazer ${
                undoTicket.natureza === 'retirada' ? 'a retirada' : 'o check-in'
              } do ingresso ${undoTicket.codigo}? O ingresso volta a ficar disponível para conferência.`
            : ''
        }
        confirmLabel="Desfazer"
        cancelLabel="Manter"
        variant="danger"
        isLoading={undoing}
      />

      <Toast message={message} onClose={clear} />
    </>
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

function isMeiaTicket(t: TicketType): boolean {
  const key = String(t.ingressoKey || '').toLowerCase();
  const nome = String(t.ingressoNome || '').toLowerCase();
  return key === 'meia' || nome.includes('meia');
}

function canUndoTicket(t: TicketType): boolean {
  if (
    t.status === 'Cancelado' ||
    t.status === 'Reembolsado' ||
    t.status === 'Bloqueado'
  ) {
    return false;
  }
  if (t.natureza === 'retirada') return Boolean(t.retiradaRealizada);
  return t.checkinRealizado === true || t.status === 'Utilizado';
}

function isTicketDone(t: TicketType): boolean {
  if (t.natureza === 'retirada') return Boolean(t.retiradaRealizada);
  return (
    t.checkinRealizado === true ||
    t.status === 'Utilizado' ||
    t.status === 'Cancelado' ||
    t.status === 'Reembolsado'
  );
}

function isTicketPending(t: TicketType): boolean {
  if (
    t.status === 'Cancelado' ||
    t.status === 'Reembolsado' ||
    t.status === 'Bloqueado'
  ) {
    return false;
  }
  if (t.natureza === 'retirada') return !t.retiradaRealizada;
  return t.status === 'Disponível' && !t.checkinRealizado;
}
