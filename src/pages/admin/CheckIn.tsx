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
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { Event, Purchase, Ticket as TicketType } from '../../types';
import { ROUTES } from '../../config';
import { QRScanner } from '../../components/admin/QRScanner';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { Modal, Button, Badge, PageLoader, EmptyState, Toast } from '../../components/ui';
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
      if (scannedTicket?.id === ticketId) {
        setScannedTicket((prev) =>
          prev
            ? {
                ...prev,
                status: 'Utilizado',
                checkinRealizado: true,
                checkinEm: new Date().toISOString(),
              }
            : null
        );
      }
      show('success', 'Entrada confirmada!');
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao realizar check-in.';
      show('error', msg);
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
          show('error', 'Ticket não localizado.');
          return;
        }
        if (ticket.eventoId !== id) {
          show('error', 'Este ticket pertence a outro evento.');
          return;
        }
        const purchase = await purchaseService.getById(ticket.compraId);
        setScannedTicket(ticket);
        if (purchase) setScannedPurchase(purchase);
        setShowScanner(false);
      } catch {
        show('error', 'Erro ao processar QR Code.');
      }
    },
    [id, show]
  );

  const closeScannerModal = () => {
    setScannedTicket(null);
    setScannedPurchase(null);
  };

  const confirmScanned = async () => {
    if (!scannedTicket) return;
    await handleCheckin(scannedTicket.id);
    window.setTimeout(() => {
      setScannedTicket(null);
      setScannedPurchase(null);
      setShowScanner(true);
    }, 1500);
  };

  const ticketsByPurchase = useMemo(() => {
    const map = new Map<string, TicketType[]>();
    for (const t of tickets) {
      const list = map.get(t.compraId) || [];
      list.push(t);
      map.set(t.compraId, list);
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

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 min-w-0">
        <PageHeader
          title="Check-in"
          subtitle="Realize o check-in dos participantes na entrada do evento."
          backTo={ROUTES.ADMIN.EVENTS}
          backLabel="Voltar para eventos"
        />

        {/* Dados do evento — faixa horizontal */}
        <section className="card-surface p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
            {event.banner ? (
              <img
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

                {/* Ingressos comprados */}
                <div className="p-4 sm:p-5 space-y-3">
                  <p className="label-micro px-1">
                    Ingressos ({purchaseTickets.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {purchaseTickets.map((t) => (
                      <div
                        key={t.id}
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
                        ) : (
                          <div className="text-green-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-1 shrink-0">
                            <CheckCircle size={14} aria-hidden="true" />
                            {t.checkinEm
                              ? new Date(t.checkinEm).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'OK'}
                          </div>
                        )}
                      </div>
                    ))}
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
          scannedTicket?.status === 'Disponível'
            ? 'Ticket válido'
            : 'Ticket utilizado'
        }
        maxWidth="md"
      >
        {scannedTicket && (
          <div className="space-y-6">
            <div
              className={`rounded-2xl p-5 text-center ${
                scannedTicket.status === 'Disponível'
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${
                  scannedTicket.status === 'Disponível'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {scannedTicket.status === 'Disponível' ? (
                  <UserCheck size={32} aria-hidden="true" />
                ) : (
                  <AlertCircle size={32} aria-hidden="true" />
                )}
              </div>
              {scannedTicket.status !== 'Disponível' && (
                <p className="text-red-600/70 text-xs font-bold uppercase tracking-wider">
                  Este ingresso já realizou check-in
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-micro mb-1">Comprador</p>
                  <p className="text-xl font-black text-gray-900">
                    {scannedPurchase?.compradorNome || '---'}
                  </p>
                </div>
                {scannedPurchase && (
                  <div className="text-right shrink-0">
                    <p className="label-micro mb-1">Valor pago</p>
                    <p className="text-lg font-black text-brand tabular-nums">
                      {scannedPurchase.valorTotal === 0
                        ? 'Gratuito'
                        : formatCurrency(scannedPurchase.valorTotal)}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="label-micro mb-1">Código</p>
                  <p className="font-black font-mono text-sm">{scannedTicket.codigo}</p>
                </div>
                <div>
                  <p className="label-micro mb-1">Status</p>
                  <Badge
                    variant={
                      scannedTicket.status === 'Disponível' ? 'available' : 'used'
                    }
                  >
                    {scannedTicket.status}
                  </Badge>
                </div>
              </div>
            </div>

            {scannedTicket.status === 'Utilizado' && scannedTicket.checkinEm && (
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
              <Button variant="secondary" onClick={closeScannerModal} className="flex-1">
                Fechar
              </Button>
              {scannedTicket.status === 'Disponível' && (
                <Button onClick={confirmScanned} className="flex-[2]">
                  Confirmar Entrada
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

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
