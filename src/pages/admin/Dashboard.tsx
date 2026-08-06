import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  XCircle,
  Wallet,
  Ticket,
  PieChart,
  UserCheck,
  CheckCircle,
  Calendar,
  FileText,
  LayoutDashboard,
  Star,
  Eye,
  Printer,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { Event, Purchase, Ticket as TicketType } from '../../types';
import { ROUTES } from '../../config';
import { THEME } from '../../theme';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { StatCard } from '../../components/admin/StatCard';
import { DataTable, type DataTableColumn } from '../../components/admin/DataTable';
import { Badge, Button, PageLoader, Alert } from '../../components/ui';
import { formatEventDate, formatCurrency } from '../../lib/utils';

type ViewMode = 'general' | 'event' | 'report';
type ReportType =
  | 'pendentes'
  | 'confirmados'
  | 'checkin'
  | 'ausentes'
  | 'cancelados'
  | 'total'
  | 'vagas'
  | 'publicados'
  | 'encerrados'
  | 'proximo';

const REPORT_TITLES: Record<ReportType, string> = {
  pendentes: 'Pagamentos Pendentes',
  confirmados: 'Ingressos Confirmados',
  checkin: 'Check-ins Realizados',
  ausentes: 'Ingressos Disponíveis',
  cancelados: 'Ingressos Cancelados',
  total: 'Todos os Ingressos',
  vagas: 'Vagas Disponíveis',
  publicados: 'Eventos Publicados',
  encerrados: 'Eventos Encerrados',
  proximo: 'Próximo Evento',
};

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('general');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // --- Lookup maps (pre-aggregated, avoid O(n*m) filters inside renders) ---

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

  const eventAggregates = useMemo(() => {
    const map = new Map<string, { purchases: number; tickets: number }>();
    events.forEach((e) => map.set(e.id, { purchases: 0, tickets: 0 }));
    purchases.forEach((p) => {
      const agg = map.get(p.eventId);
      if (agg) agg.purchases += 1;
    });
    tickets.forEach((t) => {
      const agg = map.get(t.eventoId);
      if (agg) agg.tickets += 1;
    });
    return map;
  }, [events, purchases, tickets]);

  const pendingPurchaseIds = useMemo(
    () => new Set(purchases.filter((p) => p.statusPagamento === 'pendente').map((p) => p.id)),
    [purchases]
  );

  const publishedEventIds = useMemo(
    () => new Set(events.filter((e) => e.publicado).map((e) => e.id)),
    [events]
  );

  const closedEventIds = useMemo(
    () => new Set(events.filter((e) => !e.publicado).map((e) => e.id)),
    [events]
  );

  // --- Calculations ---

  const generalStats = useMemo(() => {
    const published = events.filter((e) => e.publicado).length;
    const closed = events.filter((e) => !e.publicado).length;

    const totalPurchases = purchases.length;
    const totalTickets = tickets.length;
    const totalVagas = events.reduce((acc, e) => acc + (e.vagas || 0), 0);
    const vagasDisponiveis = Math.max(0, totalVagas - totalTickets);

    const cancelados = tickets.filter((t) => t.status === 'Cancelado').length;
    const utilizados = tickets.filter((t) => t.status === 'Utilizado').length;
    const disponiveis = tickets.filter((t) => t.status === 'Disponível').length;
    const pendentes = purchases.filter((p) => p.statusPagamento === 'pendente').length;

    return {
      published,
      closed,
      totalPurchases,
      totalTickets,
      vagasDisponiveis,
      pendentes,
      utilizados,
      disponiveis,
      cancelados,
    };
  }, [events, purchases, tickets]);

  const eventStats = useMemo(() => {
    if (!selectedEvent) return null;
    const eventTickets = tickets.filter((t) => t.eventoId === selectedEvent.id);
    const eventPurchases = purchases.filter((p) => p.eventId === selectedEvent.id);

    const totalTickets = eventTickets.length;
    const utilizados = eventTickets.filter((t) => t.status === 'Utilizado').length;
    const disponiveis = eventTickets.filter((t) => t.status === 'Disponível').length;
    const cancelados = eventTickets.filter((t) => t.status === 'Cancelado').length;

    const vagasRestantes = Math.max(0, selectedEvent.vagas - totalTickets);
    const arrecadado = eventPurchases
      .filter((p) => p.statusPagamento === 'confirmado')
      .reduce((acc, p) => acc + p.valorTotal, 0);

    return {
      totalPurchases: eventPurchases.length,
      totalTickets,
      utilizados,
      disponiveis,
      cancelados,
      vagasRestantes,
      arrecadado,
    };
  }, [selectedEvent, purchases, tickets]);

  const filteredTickets = useMemo(() => {
    let list = tickets;

    if (selectedEvent) {
      list = list.filter((t) => t.eventoId === selectedEvent.id);
    }

    switch (activeReport) {
      case 'checkin':
      case 'confirmados':
        list = list.filter((t) => t.status === 'Utilizado');
        break;
      case 'ausentes':
        list = list.filter((t) => t.status === 'Disponível');
        break;
      case 'cancelados':
        list = list.filter((t) => t.status === 'Cancelado');
        break;
      case 'pendentes':
        list = list.filter((t) => pendingPurchaseIds.has(t.compraId));
        break;
      case 'vagas':
        list = list.filter((t) => t.status === 'Disponível');
        break;
      case 'publicados':
        list = list.filter((t) => publishedEventIds.has(t.eventoId));
        break;
      case 'encerrados':
        list = list.filter((t) => closedEventIds.has(t.eventoId));
        break;
      default:
        break;
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
    tickets,
    selectedEvent,
    activeReport,
    searchTerm,
    pendingPurchaseIds,
    publishedEventIds,
    closedEventIds,
    purchasesById,
  ]);

  // --- Handlers ---

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

  // --- Table columns ---

  const eventColumns: DataTableColumn<Event>[] = [
    {
      key: 'evento',
      header: 'Evento',
      render: (event) => (
        <div className="flex items-center gap-4 min-w-0">
          <img
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
        <span className="text-sm font-bold text-gray-600">{formatEventDate(event.data)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => (
        <Badge variant={event.publicado ? 'published' : 'draft'}>
          {event.publicado ? 'Publicado' : 'Rascunho'}
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
      key: 'vagas',
      header: 'Vagas',
      className: 'text-center',
      render: (event) => {
        const sold = eventAggregates.get(event.id)?.tickets ?? 0;
        const remaining = Math.max(0, event.vagas - sold);
        return (
          <span className={`font-black ${remaining < 10 ? 'text-red-500' : 'text-gray-900'}`}>
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
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleOpenEventDashboard(event)}
            className="p-2.5 bg-brand/5 text-brand hover:bg-brand hover:text-white rounded-xl transition-all"
            title="Dashboard do Evento"
            aria-label="Dashboard do Evento"
          >
            <LayoutDashboard size={16} />
          </button>
          <Link
            to={ROUTES.ADMIN.EVENT_CHECKIN.replace(':id', event.id)}
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Check-in"
            aria-label="Check-in"
          >
            <CheckCircle size={16} />
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
              <p className="text-xs text-gray-400 truncate">{purchase?.compradorEmail || '---'}</p>
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
              t.status === 'Utilizado' ? 'used' : t.status === 'Cancelado' ? 'danger' : 'available'
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
        key: 'emissao',
        header: 'Emissão',
        hideOnMobile: true,
        render: (t) => (
          <span className="text-xs font-bold text-gray-400">{formatEventDate(t.createdAt)}</span>
        ),
      },
      {
        key: 'checkin',
        header: 'Check-in',
        render: (t) => (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={t.checkinRealizado ? 'success' : 'neutral'}>
              {t.checkinRealizado ? 'Confirmado' : 'Pendente'}
            </Badge>
            {t.checkinEm && (
              <span className="text-[10px] text-gray-400 font-medium">
                {new Date(t.checkinEm).toLocaleTimeString('pt-BR')}
              </span>
            )}
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

  if (loading) return <PageLoader label="Carregando dashboard..." />;

  const generalCards: Array<{
    title: string;
    value: string | number;
    icon: LucideIcon;
    accent: string;
    type: ReportType;
  }> = [
    {
      title: 'Eventos Publicados',
      value: generalStats.published,
      icon: Globe,
      accent: THEME.colors.status.active,
      type: 'publicados',
    },
    {
      title: 'Eventos Encerrados',
      value: generalStats.closed,
      icon: XCircle,
      accent: THEME.colors.text.muted,
      type: 'encerrados',
    },
    {
      title: 'Total de Compras',
      value: generalStats.totalPurchases,
      icon: Wallet,
      accent: THEME.colors.primary,
      type: 'total',
    },
    {
      title: 'Total de Ingressos',
      value: generalStats.totalTickets,
      icon: Ticket,
      accent: '#9333ea',
      type: 'total',
    },
    {
      title: 'Vagas Disponíveis',
      value: generalStats.vagasDisponiveis,
      icon: PieChart,
      accent: THEME.colors.primary,
      type: 'vagas',
    },
    {
      title: 'Ingressos Utilizados',
      value: generalStats.utilizados,
      icon: UserCheck,
      accent: '#4f46e5',
      type: 'checkin',
    },
    {
      title: 'Ingressos Disponíveis',
      value: generalStats.disponiveis,
      icon: CheckCircle,
      accent: THEME.colors.status.active,
      type: 'ausentes',
    },
    {
      title: 'Ingressos Cancelados',
      value: generalStats.cancelados,
      icon: XCircle,
      accent: THEME.colors.status.inactive,
      type: 'cancelados',
    },
  ];

  const eventCards = eventStats
    ? [
        {
          title: 'Compras Realizadas',
          value: eventStats.totalPurchases,
          icon: Wallet,
          accent: THEME.colors.primary,
          type: 'total' as ReportType,
        },
        {
          title: 'Ingressos Vendidos',
          value: eventStats.totalTickets,
          icon: Ticket,
          accent: '#9333ea',
          type: 'total' as ReportType,
        },
        {
          title: 'Check-ins Realizados',
          value: eventStats.utilizados,
          icon: UserCheck,
          accent: '#4f46e5',
          type: 'checkin' as ReportType,
        },
        {
          title: 'Disponíveis',
          value: eventStats.disponiveis,
          icon: CheckCircle,
          accent: THEME.colors.status.active,
          type: 'ausentes' as ReportType,
        },
        {
          title: 'Cancelados',
          value: eventStats.cancelados,
          icon: XCircle,
          accent: THEME.colors.status.inactive,
          type: 'cancelados' as ReportType,
        },
        {
          title: 'Vagas Restantes',
          value: eventStats.vagasRestantes,
          icon: PieChart,
          accent: THEME.colors.primary,
          type: 'vagas' as ReportType,
        },
        {
          title: 'Receita Total',
          value: formatCurrency(eventStats.arrecadado),
          icon: Wallet,
          accent: THEME.colors.status.active,
          type: 'confirmados' as ReportType,
        },
      ]
    : [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 min-w-0">
      <AnimatePresence mode="wait">
        {/* Nível 1: Dashboard Geral */}
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
              subtitle="Visão executiva consolidada da ONG."
            />

            {loadError && (
              <Alert variant="error" onClose={() => setLoadError(null)}>
                {loadError}
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {generalCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  accent={card.accent}
                  onClick={() => handleOpenReport(card.type)}
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
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-black text-gray-900">Eventos</h2>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-4 py-1.5 rounded-full whitespace-nowrap">
                    {events.length} {events.length === 1 ? 'Evento' : 'Eventos'}
                  </span>
                </div>
              }
            />
          </motion.div>
        )}

        {/* Nível 2: Dashboard do Evento */}
        {viewMode === 'event' && selectedEvent && eventStats && (
          <motion.div
            key="event-dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <img
                src={selectedEvent.banner}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0"
              />
              <div className="flex items-center gap-2">
                <Badge variant="info">Dashboard do Evento</Badge>
                {selectedEvent.eventoDestaque && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" />
                )}
              </div>
            </div>

            <PageHeader
              title={selectedEvent.titulo}
              subtitle={`${formatEventDate(selectedEvent.data)} • ${selectedEvent.local}`}
              onBack={handleBack}
              backLabel="Voltar ao Dashboard Geral"
              actions={
                <Link to={ROUTES.ADMIN.EVENT_CHECKIN.replace(':id', selectedEvent.id)}>
                  <Button className="rounded-2xl">Realizar Check-in</Button>
                </Link>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {eventCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  accent={card.accent}
                  onClick={() => handleOpenReport(card.type)}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 card-surface p-8 sm:p-10">
                <h3 className="text-lg font-black text-gray-900 mb-4">Informações Detalhadas</h3>
                <div className="prose prose-sm max-w-none text-gray-500 whitespace-pre-line">
                  {selectedEvent.descricaoCompleta}
                </div>
              </div>
              <div className="card-surface bg-gray-50 p-8 sm:p-10 flex flex-col justify-center text-center gap-6">
                <PieChart size={40} className="mx-auto text-brand opacity-20" aria-hidden="true" />
                <h4 className="font-black text-gray-900">Capacidade do Evento</h4>
                <div className="w-full bg-white h-4 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width:
                        selectedEvent.vagas > 0
                          ? `${Math.min(100, (eventStats.totalTickets / selectedEvent.vagas) * 100)}%`
                          : '0%',
                    }}
                    className="bg-brand h-full"
                  />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {selectedEvent.vagas > 0
                    ? `${eventStats.totalTickets} de ${selectedEvent.vagas} vagas ocupadas`
                    : 'Sem limite de vagas definido'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nível 3: Relatório Filtrado */}
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
                <Button variant="outline" className="rounded-2xl" onClick={() => window.print()}>
                  <Printer size={18} aria-hidden="true" />
                  Imprimir
                </Button>
              }
            />

            <div className="sticky top-16 sm:top-20 z-10 bg-surface-admin/95 backdrop-blur-sm py-3 -mx-1 px-1">
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar por nome, CPF ou e-mail..."
              />
            </div>

            <DataTable
              columns={reportColumns}
              data={filteredTickets}
              rowKey={(t) => t.id}
              emptyTitle="Nenhum registro encontrado"
              emptyDescription="Ajuste os critérios de busca ou selecione outro relatório."
              emptyIcon={FileText}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
