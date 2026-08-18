import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  XCircle,
  Wallet,
  Ticket,
  UserCheck,
  CheckCircle,
  Calendar,
  FileText,
  LayoutDashboard,
  Star,
  Eye,
  Users,
  Clock,
  List,
  Smartphone,
  Printer,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { pwaInstallsService } from '../../services/firebase/pwaInstalls';
import { pushTokensService } from '../../services/firebase/pushTokens';
import { Event, Purchase, Ticket as TicketType } from '../../types';
import { ROUTES } from '../../config';
import { THEME } from '../../theme';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { StatCard } from '../../components/admin/StatCard';
import { DataTable, type DataTableColumn } from '../../components/admin/DataTable';
import { Badge, Button, PageLoader, Alert, AppImage } from '../../components/ui';
import { formatEventDate, formatCurrency } from '../../lib/utils';
import { getEventSalonRemaining, getEventTicketsOffered } from '../../lib/eventData';
import { isTicketPurchase, purchasePayerKey } from '../../lib/donations';

type ViewMode = 'general' | 'event' | 'report';
type ReportType = 'vendidos' | 'pagantes' | 'checkin' | 'arrecadacao' | 'apps';

const REPORT_TITLES: Record<ReportType, string> = {
  vendidos: 'Ingressos vendidos',
  pagantes: 'Pagantes nos eventos',
  checkin: 'Check-ins efetivados',
  arrecadacao: 'Arrecadação dos eventos',
  apps: 'Aplicativos e avisos',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('general');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appInstalls, setAppInstalls] = useState(0);
  const [pushActive, setPushActive] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsData, purchasesData, ticketsData] = await Promise.all([
          eventService.getAll(),
          purchaseService.getAll(),
          ticketService.getAll(),
        ]);
        setEvents(eventsData);
        setPurchases(purchasesData);
        setTickets(ticketsData);
      } catch (err) {
        console.error(err);
        setLoadError('Não foi possível carregar os dados do dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadAppStats() {
      try {
        const [installs, notifications] = await Promise.all([
          pwaInstallsService.count(),
          pushTokensService.count(),
        ]);
        setAppInstalls(installs);
        setPushActive(notifications);
      } catch (err) {
        console.warn('Não foi possível carregar as métricas do app.', err);
      }
    }
    void loadAppStats();
  }, []);

  const ticketPurchases = useMemo(
    () => purchases.filter(isTicketPurchase),
    [purchases]
  );

  const purchasesById = useMemo(() => {
    const map = new Map<string, Purchase>();
    purchases.forEach((p) => map.set(p.id, p));
    return map;
  }, [purchases]);

  const eventsById = useMemo(() => {
    const map = new Map<string, Event>();
    events.forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  const confirmedPurchases = useMemo(
    () => ticketPurchases.filter((p) => p.statusPagamento === 'confirmado'),
    [ticketPurchases]
  );

  const confirmedPurchaseIds = useMemo(
    () => new Set(confirmedPurchases.map((p) => p.id)),
    [confirmedPurchases]
  );

  const soldTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          confirmedPurchaseIds.has(t.compraId) &&
          t.status !== 'Cancelado' &&
          t.status !== 'Reembolsado'
      ),
    [tickets, confirmedPurchaseIds]
  );

  const checkedInTickets = useMemo(
    () =>
      tickets.filter(
        (t) => t.checkinRealizado === true || t.status === 'Utilizado'
      ),
    [tickets]
  );

  const eventAggregates = useMemo(() => {
    const map = new Map<
      string,
      { purchases: number; tickets: number; arrecadado: number }
    >();
    events.forEach((e) =>
      map.set(e.id, { purchases: 0, tickets: 0, arrecadado: 0 })
    );
    ticketPurchases.forEach((p) => {
      const agg = map.get(p.eventId);
      if (!agg) return;
      agg.purchases += 1;
      if (p.statusPagamento === 'confirmado') {
        agg.arrecadado += p.valorTotal || 0;
      }
    });
    tickets.forEach((t) => {
      const agg = map.get(t.eventoId);
      if (agg) agg.tickets += 1;
    });
    return map;
  }, [events, ticketPurchases, tickets]);

  const generalStats = useMemo(() => {
    const published = events.filter((e) => e.publicado).length;
    const closed = events.filter((e) => !e.publicado).length;
    const disponibilizados = events.reduce(
      (acc, e) => acc + getEventTicketsOffered(e),
      0
    );
    const pagantes = new Set(confirmedPurchases.map(purchasePayerKey)).size;
    const arrecadado = confirmedPurchases.reduce(
      (acc, p) => acc + (p.valorTotal || 0),
      0
    );

    return {
      published,
      closed,
      disponibilizados,
      vendidos: soldTickets.length,
      pagantes,
      checkins: checkedInTickets.length,
      arrecadado,
    };
  }, [events, confirmedPurchases, soldTickets, checkedInTickets]);

  const eventStats = useMemo(() => {
    if (!selectedEvent) return null;
    const eventPurchases = ticketPurchases.filter(
      (p) => p.eventId === selectedEvent.id
    );
    const ativos = eventPurchases.filter(
      (p) =>
        p.statusPagamento === 'confirmado' || p.statusPagamento === 'pendente'
    );
    const pagos = eventPurchases.filter((p) => p.statusPagamento === 'confirmado');
    const pendentes = eventPurchases.filter((p) => p.statusPagamento === 'pendente');
    const ingressosPagos = pagos.reduce(
      (acc, p) => acc + (p.quantidadeIngressos || 0),
      0
    );
    const ingressosPendentes = pendentes.reduce(
      (acc, p) => acc + (p.quantidadeIngressos || 0),
      0
    );
    const arrecadado = pagos.reduce((acc, p) => acc + (p.valorTotal || 0), 0);

    return {
      vagas: selectedEvent.vagas || 0,
      inscritos: ativos.length,
      ingressosPagos,
      ingressosPendentes,
      arrecadado,
    };
  }, [selectedEvent, ticketPurchases]);

  const filteredTickets = useMemo(() => {
    let list =
      activeReport === 'checkin'
        ? checkedInTickets
        : activeReport === 'vendidos'
          ? soldTickets
          : tickets;

    if (selectedEvent) {
      list = list.filter((t) => t.eventoId === selectedEvent.id);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((t) => {
        const purchase = purchasesById.get(t.compraId);
        return (
          t.codigo.toLowerCase().includes(q) ||
          purchase?.compradorNome.toLowerCase().includes(q) ||
          purchase?.compradorCPF.includes(q) ||
          purchase?.compradorEmail.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [
    activeReport,
    checkedInTickets,
    soldTickets,
    tickets,
    selectedEvent,
    searchTerm,
    purchasesById,
  ]);

  const filteredPayers = useMemo(() => {
    let list = [...confirmedPurchases].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
    if (selectedEvent) {
      list = list.filter((p) => p.eventId === selectedEvent.id);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.compradorNome.toLowerCase().includes(q) ||
          p.compradorCPF.includes(q.replace(/\D/g, '')) ||
          p.compradorEmail.toLowerCase().includes(q)
      );
    }
    return list;
  }, [confirmedPurchases, selectedEvent, searchTerm]);

  const handleOpenEventDashboard = (event: Event) => {
    setSelectedEvent(event);
    setViewMode('event');
    setSearchTerm('');
    window.scrollTo(0, 0);
  };

  const handleOpenReport = (type: ReportType) => {
    setActiveReport(type);
    setViewMode('report');
    setSearchTerm('');
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (viewMode === 'report') {
      setViewMode(selectedEvent ? 'event' : 'general');
      setActiveReport(null);
    } else if (viewMode === 'event') {
      setViewMode('general');
      setSelectedEvent(null);
    }
    setSearchTerm('');
  };

  const eventColumns: DataTableColumn<Event>[] = [
    {
      key: 'evento',
      header: 'Evento',
      render: (event) => (
        <div className="flex items-center gap-4 min-w-0">
          <AppImage
            src={event.banner}
            alt=""
            loading="lazy"
            className="w-12 h-12 rounded-2xl object-cover shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <p className="font-black text-gray-900 line-clamp-1">{event.titulo}</p>
            <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1">
              Ver Dashboard
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'data',
      header: 'Data',
      hideOnMobile: true,
      render: (event) => (
        <span className="text-sm font-bold text-gray-600">
          {formatEventDate(event.data)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => (
        <Badge variant={event.publicado ? 'published' : 'draft'}>
          {event.publicado ? 'Publicado' : 'Encerrado'}
        </Badge>
      ),
    },
    {
      key: 'compras',
      header: 'Compras',
      className: 'text-center',
      hideOnMobile: true,
      render: (event) => (
        <span className="font-black text-gray-900">
          {eventAggregates.get(event.id)?.purchases ?? 0}
        </span>
      ),
    },
    {
      key: 'ingressos',
      header: 'Ingressos',
      className: 'text-center',
      render: (event) => (
        <span className="font-black text-brand">
          {eventAggregates.get(event.id)?.tickets ?? 0}
        </span>
      ),
    },
    {
      key: 'arrecadado',
      header: 'Recebido',
      className: 'text-right',
      render: (event) => (
        <span className="font-black text-gray-900 tabular-nums whitespace-nowrap">
          {formatCurrency(eventAggregates.get(event.id)?.arrecadado ?? 0)}
        </span>
      ),
    },
    {
      key: 'vagas',
      header: 'Vagas',
      className: 'text-center',
      render: (event) => {
        const remaining = getEventSalonRemaining(event);
        return (
          <span
            className={`font-black ${remaining < 10 ? 'text-red-500' : 'text-gray-900'}`}
          >
            {remaining}
          </span>
        );
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      className: 'text-right',
      render: (event) => (
        <div
          className="flex items-center justify-end gap-1.5 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleOpenEventDashboard(event)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-brand/5 text-brand hover:bg-brand hover:text-white rounded-xl transition-all"
            title="Dashboard do evento"
            aria-label="Dashboard do evento"
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Dashboard
            </span>
          </button>
          <Link
            to={ROUTES.ADMIN.EVENT_REPORTS.replace(':id', event.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
            title="Lista de inscritos"
            aria-label="Lista de inscritos"
          >
            <List size={16} aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Lista
            </span>
          </Link>
          <Link
            to={ROUTES.ADMIN.EVENT_CHECKIN.replace(':id', event.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Check-in do evento"
            aria-label="Check-in do evento"
          >
            <CheckCircle size={16} aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Check-in
            </span>
          </Link>
        </div>
      ),
    },
  ];

  const reportColumns: DataTableColumn<TicketType>[] = useMemo(() => {
    const cols: DataTableColumn<TicketType>[] = [
      {
        key: 'codigo',
        header: 'Código / Comprador',
        render: (t) => {
          const purchase = purchasesById.get(t.compraId);
          return (
            <div className="min-w-0">
              <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">
                {t.codigo}
              </p>
              <p className="font-black text-gray-900 truncate">
                {purchase?.compradorNome || '---'}
              </p>
            </div>
          );
        },
      },
      {
        key: 'documento',
        header: 'Documento / Contato',
        hideOnMobile: true,
        render: (t) => {
          const purchase = purchasesById.get(t.compraId);
          return (
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-700 uppercase tracking-widest">
                {purchase?.compradorCPF || '---'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {purchase?.compradorEmail || '---'}
              </p>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        className: 'text-center',
        render: (t) => (
          <Badge
            variant={
              t.status === 'Utilizado'
                ? 'used'
                : t.status === 'Cancelado'
                  ? 'danger'
                  : 'available'
            }
          >
            {t.status}
          </Badge>
        ),
      },
    ];

    if (!selectedEvent) {
      cols.push({
        key: 'evento',
        header: 'Evento',
        hideOnMobile: true,
        render: (t) => (
          <span className="text-xs font-black text-brand uppercase tracking-widest line-clamp-1">
            {eventsById.get(t.eventoId)?.titulo || '---'}
          </span>
        ),
      });
    }

    cols.push(
      {
        key: 'checkin',
        header: 'Check-in',
        render: (t) => (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={t.checkinRealizado ? 'success' : 'neutral'}>
              {t.checkinRealizado ? 'Confirmado' : 'Pendente'}
            </Badge>
            {t.checkinEm ? (
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(t.checkinEm).toLocaleTimeString('pt-BR')}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'acoes',
        header: 'Ações',
        className: 'text-right',
        render: (t) => (
          <Link
            to={ROUTES.ADMIN.PURCHASE_DETAILS.replace(':id', t.compraId)}
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand-muted rounded-xl transition-all inline-flex"
            title="Ver Detalhes da Compra"
            aria-label="Ver Detalhes da Compra"
          >
            <Eye size={16} />
          </Link>
        ),
      }
    );

    return cols;
  }, [selectedEvent, purchasesById, eventsById]);

  const payerColumns: DataTableColumn<Purchase>[] = useMemo(
    () => [
      {
        key: 'pagante',
        header: 'Pagante',
        render: (p) => (
          <div className="min-w-0">
            <p className="font-black text-gray-900 truncate">{p.compradorNome}</p>
            <p className="text-xs text-gray-400 truncate">{p.compradorEmail}</p>
          </div>
        ),
      },
      {
        key: 'documento',
        header: 'Documento',
        hideOnMobile: true,
        render: (p) => (
          <span className="text-xs font-black text-gray-700 uppercase tracking-widest tabular-nums">
            {p.compradorCPF || '—'}
          </span>
        ),
      },
      {
        key: 'evento',
        header: 'Evento',
        hideOnMobile: true,
        render: (p) => (
          <span className="text-xs font-black text-brand uppercase tracking-widest line-clamp-1">
            {eventsById.get(p.eventId)?.titulo || '—'}
          </span>
        ),
      },
      {
        key: 'ingressos',
        header: 'Ingressos',
        className: 'text-center',
        render: (p) => (
          <span className="font-black tabular-nums">
            {p.quantidadeIngressos}
          </span>
        ),
      },
      {
        key: 'valor',
        header: 'Valor',
        className: 'text-right',
        render: (p) => (
          <span className="font-black text-gray-900 tabular-nums">
            {formatCurrency(p.valorTotal)}
          </span>
        ),
      },
      {
        key: 'acoes',
        header: 'Ações',
        className: 'text-right',
        render: (p) => (
          <Link
            to={ROUTES.ADMIN.PURCHASE_DETAILS.replace(':id', p.id)}
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand-muted rounded-xl transition-all inline-flex"
            title="Ver detalhes da compra"
            aria-label="Ver detalhes da compra"
          >
            <Eye size={16} />
          </Link>
        ),
      },
    ],
    [eventsById]
  );

  if (loading) return <PageLoader label="Carregando dashboard..." />;

  const generalCards: Array<{
    title: string;
    value: string | number;
    icon: LucideIcon;
    accent: string;
    hint?: string;
    sensitive?: boolean;
    href?: string;
    report?: ReportType;
  }> = [
    {
      title: 'Eventos publicados',
      value: generalStats.published,
      icon: Globe,
      accent: THEME.colors.status.active,
      href: `${ROUTES.ADMIN.EVENTS}?status=published`,
    },
    {
      title: 'Eventos encerrados',
      value: generalStats.closed,
      icon: XCircle,
      accent: THEME.colors.text.muted,
      href: `${ROUTES.ADMIN.EVENTS}?status=draft`,
    },
    {
      title: 'Ingressos disponibilizados',
      value: generalStats.disponibilizados,
      icon: Ticket,
      accent: THEME.colors.primary,
      hint: 'Vagas oferecidas nos eventos',
      href: ROUTES.ADMIN.EVENTS,
    },
    {
      title: 'Ingressos vendidos',
      value: generalStats.vendidos,
      icon: CheckCircle,
      accent: '#9333ea',
      report: 'vendidos',
    },
    {
      title: 'Pagantes nos eventos',
      value: generalStats.pagantes,
      icon: Users,
      accent: THEME.colors.primary,
      report: 'pagantes',
    },
    {
      title: 'Check-ins efetivados',
      value: generalStats.checkins,
      icon: UserCheck,
      accent: '#4f46e5',
      report: 'checkin',
    },
    {
      title: 'Arrecadação dos eventos',
      value: formatCurrency(generalStats.arrecadado),
      icon: Wallet,
      accent: THEME.colors.status.active,
      sensitive: true,
      report: 'arrecadacao',
    },
    {
      title: 'Ativos/Instalados',
      value: `${pushActive} / ${appInstalls}`,
      icon: Smartphone,
      accent: THEME.colors.primary,
      hint: 'Notificações ativas / app instalado',
      report: 'apps',
    },
  ];

  const eventCards =
    eventStats && selectedEvent
      ? [
          {
            title: 'Quantidade de vagas',
            value: eventStats.vagas,
            icon: Ticket,
            accent: THEME.colors.primary,
            sensitive: false,
            onClick: () =>
              navigate(ROUTES.ADMIN.EVENT_EDIT.replace(':id', selectedEvent.id)),
          },
          {
            title: 'Inscritos',
            value: eventStats.inscritos,
            icon: Users,
            accent: THEME.colors.primary,
            sensitive: false,
            onClick: () =>
              navigate(
                ROUTES.ADMIN.EVENT_REPORTS.replace(':id', selectedEvent.id)
              ),
          },
          {
            title: 'Ingressos pagos',
            value: eventStats.ingressosPagos,
            icon: CheckCircle,
            accent: THEME.colors.status.active,
            sensitive: false,
            onClick: () =>
              navigate(
                ROUTES.ADMIN.EVENT_REPORTS.replace(':id', selectedEvent.id)
              ),
          },
          {
            title: 'Ingressos pendentes',
            value: eventStats.ingressosPendentes,
            icon: Clock,
            accent: '#d97706',
            sensitive: false,
            onClick: () =>
              navigate(
                ROUTES.ADMIN.EVENT_REPORTS.replace(':id', selectedEvent.id)
              ),
          },
          {
            title: 'Valor arrecadado',
            value: formatCurrency(eventStats.arrecadado),
            icon: Wallet,
            accent: THEME.colors.status.active,
            sensitive: true,
            onClick: () => handleOpenReport('arrecadacao'),
          },
        ]
      : [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 min-w-0">
      <AnimatePresence mode="wait">
        {viewMode === 'general' && (
          <motion.div
            key="general-dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <PageHeader
              title="Dashboard Geral"
              subtitle="Indicadores dos eventos e do aplicativo."
            />

            {loadError && (
              <Alert variant="error" onClose={() => setLoadError(null)}>
                {loadError}
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {generalCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  accent={card.accent}
                  hint={card.hint}
                  sensitive={card.sensitive}
                  onClick={() => {
                    if (card.href) navigate(card.href);
                    else if (card.report) handleOpenReport(card.report);
                  }}
                />
              ))}
            </div>

            <DataTable
              columns={eventColumns}
              data={events}
              rowKey={(e) => e.id}
              onRowClick={handleOpenEventDashboard}
              emptyTitle="Nenhum evento cadastrado"
              emptyDescription="Cadastre eventos na aba Eventos para acompanhar as métricas."
              emptyIcon={Calendar}
              toolbar={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-gray-900">Eventos</h2>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-4 py-1.5 rounded-full whitespace-nowrap">
                    {events.length}{' '}
                    {events.length === 1 ? 'Evento' : 'Eventos'}
                  </span>
                </div>
              }
            />
          </motion.div>
        )}

        {viewMode === 'event' && selectedEvent && eventStats && (
          <motion.div
            key="event-dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <AppImage
                src={selectedEvent.banner}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0"
              />
              <div className="flex items-center gap-2">
                <Badge variant="info">Dashboard do Evento</Badge>
                {selectedEvent.eventoDestaque && (
                  <Star
                    className="w-4 h-4 text-amber-500 fill-amber-500"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>

            <PageHeader
              title={selectedEvent.titulo}
              subtitle={`${formatEventDate(selectedEvent.data)} • ${selectedEvent.local}`}
              onBack={handleBack}
              backLabel="Voltar ao Dashboard Geral"
              actions={
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={ROUTES.ADMIN.EVENT_REPORTS.replace(
                      ':id',
                      selectedEvent.id
                    )}
                  >
                    <Button variant="secondary" className="rounded-2xl">
                      <List size={16} aria-hidden="true" />
                      Abrir lista
                    </Button>
                  </Link>
                  <Link
                    to={ROUTES.ADMIN.EVENT_CHECKIN.replace(
                      ':id',
                      selectedEvent.id
                    )}
                  >
                    <Button className="rounded-2xl">
                      <CheckCircle size={16} aria-hidden="true" />
                      Realizar Check-in
                    </Button>
                  </Link>
                </div>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-stretch">
              {eventCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  accent={card.accent}
                  sensitive={card.sensitive}
                  onClick={card.onClick}
                />
              ))}
            </div>
          </motion.div>
        )}

        {viewMode === 'report' && (
          <motion.div
            key="report-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <PageHeader
              title={activeReport ? REPORT_TITLES[activeReport] : 'Relatório'}
              subtitle={selectedEvent ? selectedEvent.titulo : undefined}
              onBack={handleBack}
              backLabel={`Voltar ao ${selectedEvent ? 'Dashboard do Evento' : 'Dashboard Geral'}`}
              actions={
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => window.print()}
                >
                  <Printer size={18} aria-hidden="true" />
                  Imprimir
                </Button>
              }
            />

            {activeReport === 'apps' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch max-w-3xl">
                <StatCard
                  title="Notificações ativas"
                  value={pushActive}
                  icon={Smartphone}
                  accent="#7c3aed"
                  hint="Aparelhos que permitiram avisos"
                />
                <StatCard
                  title="App instalado"
                  value={appInstalls}
                  icon={Smartphone}
                  accent={THEME.colors.primary}
                  hint="Aparelhos que abriram o App Delphos"
                />
              </div>
            ) : (
              <>
                <div className="sticky top-14 sm:top-20 z-10 bg-surface-admin/95 backdrop-blur-sm py-3 -mx-1 px-1">
                  <SearchField
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Pesquisar por nome, CPF ou e-mail..."
                  />
                </div>

                {activeReport === 'pagantes' || activeReport === 'arrecadacao' ? (
                  <DataTable
                    columns={payerColumns}
                    data={filteredPayers}
                    rowKey={(p) => p.id}
                    emptyTitle="Nenhum pagante encontrado"
                    emptyDescription="Compras confirmadas de ingressos aparecerão aqui."
                    emptyIcon={Users}
                  />
                ) : (
                  <DataTable
                    columns={reportColumns}
                    data={filteredTickets}
                    rowKey={(t) => t.id}
                    emptyTitle="Nenhum registro encontrado"
                    emptyDescription="Ajuste os critérios de busca ou selecione outro relatório."
                    emptyIcon={FileText}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
