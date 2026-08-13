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
  Users,
  Clock,
  List,
  HeartHandshake,
  TrendingUp,
  Download,
  ChevronDown,
  EyeOff,
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
import { Badge, Button, PageLoader, Alert, AppImage } from '../../components/ui';
import { formatEventDate, formatCurrency } from '../../lib/utils';
import { getEventSalonRemaining } from '../../lib/eventData';
import {
  computeDonationStats,
  donationDate,
  donationStatusBadgeVariant,
  donationStatusLabel,
  exportDonationsCsv,
  formatDonorDocument,
  donorDocumentLabel,
  isDonationPurchase,
  isTicketPurchase,
} from '../../lib/donations';

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
  | 'proximo'
  | 'doacoes'
  | 'doacoes_confirmadas'
  | 'doacoes_pendentes';

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
  doacoes: 'Todas as Doações',
  doacoes_confirmadas: 'Doações Confirmadas',
  doacoes_pendentes: 'Doações Pendentes',
};

function isDonationReport(type: ReportType | null): boolean {
  return (
    type === 'doacoes' ||
    type === 'doacoes_confirmadas' ||
    type === 'doacoes_pendentes'
  );
}

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
  const [donationsOpen, setDonationsOpen] = useState(false);
  const [showDonationAmounts, setShowDonationAmounts] = useState(false);

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

  const donations = useMemo(
    () => purchases.filter(isDonationPurchase),
    [purchases]
  );

  const ticketPurchases = useMemo(
    () => purchases.filter(isTicketPurchase),
    [purchases]
  );

  const donationStats = useMemo(
    () => computeDonationStats(donations),
    [donations]
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

  const pendingPurchaseIds = useMemo(
    () =>
      new Set(
        ticketPurchases
          .filter((p) => p.statusPagamento === 'pendente')
          .map((p) => p.id)
      ),
    [ticketPurchases]
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

    const totalPurchases = ticketPurchases.length;
    const totalTickets = tickets.length;
    const vagasDisponiveis = events.reduce(
      (acc, e) => acc + getEventSalonRemaining(e),
      0
    );

    const cancelados = tickets.filter((t) => t.status === 'Cancelado').length;
    const utilizados = tickets.filter((t) => t.status === 'Utilizado').length;
    const disponiveis = tickets.filter((t) => t.status === 'Disponível').length;
    const pendentes = ticketPurchases.filter(
      (p) => p.statusPagamento === 'pendente'
    );
    const confirmadas = ticketPurchases.filter(
      (p) => p.statusPagamento === 'confirmado'
    );
    const arrecadado = confirmadas.reduce(
      (acc, p) => acc + (p.valorTotal || 0),
      0
    );
    const valorPendente = pendentes.reduce(
      (acc, p) => acc + (p.valorTotal || 0),
      0
    );
    const ticketMedio =
      confirmadas.length > 0 ? arrecadado / confirmadas.length : 0;

    return {
      published,
      closed,
      totalPurchases,
      totalTickets,
      vagasDisponiveis,
      pendentes: pendentes.length,
      utilizados,
      disponiveis,
      cancelados,
      arrecadado,
      valorPendente,
      comprasConfirmadas: confirmadas.length,
      ticketMedio,
    };
  }, [events, ticketPurchases, tickets]);

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

  const filteredDonations = useMemo(() => {
    let list = [...donations].sort(
      (a, b) => donationDate(b).getTime() - donationDate(a).getTime()
    );

    switch (activeReport) {
      case 'doacoes_confirmadas':
        list = list.filter((d) => d.statusPagamento === 'confirmado');
        break;
      case 'doacoes_pendentes':
        list = list.filter((d) => d.statusPagamento === 'pendente');
        break;
      default:
        break;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (d) =>
          d.compradorNome.toLowerCase().includes(q) ||
          d.compradorCPF.includes(q.replace(/\D/g, '')) ||
          d.compradorEmail.toLowerCase().includes(q) ||
          (d.certificadoNumero || '').toLowerCase().includes(q) ||
          (d.mensagemDoador || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [donations, activeReport, searchTerm]);

  const recentDonations = useMemo(
    () =>
      [...donations]
        .sort((a, b) => donationDate(b).getTime() - donationDate(a).getTime())
        .slice(0, 12),
    [donations]
  );

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
            to={ROUTES.ADMIN.EVENT_REPORTS.replace(':id', event.id)}
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
            title="Abrir lista"
            aria-label="Abrir lista de inscritos"
          >
            <List size={16} />
          </Link>
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

  const donationColumns: DataTableColumn<Purchase>[] = useMemo(
    () => [
      {
        key: 'doador',
        header: 'Doador / Certificado',
        render: (d) => (
          <div className="min-w-0">
            <p className="font-black text-gray-900 truncate">{d.compradorNome}</p>
            <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1 truncate">
              {d.certificadoNumero || '—'}
            </p>
          </div>
        ),
      },
      {
        key: 'contato',
        header: 'Documento / Contato',
        hideOnMobile: true,
        render: (d) => (
          <div className="min-w-0">
            <p className="text-xs font-black text-gray-700 uppercase tracking-widest tabular-nums">
              {donorDocumentLabel(d)} {formatDonorDocument(d)}
            </p>
            <p className="text-xs text-gray-400 truncate">{d.compradorEmail}</p>
            {d.compradorTelefone ? (
              <p className="text-xs text-gray-400">{d.compradorTelefone}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'valor',
        header: 'Valor',
        className: 'text-right',
        render: (d) => (
          <span className="font-black text-brand tabular-nums">
            {showDonationAmounts ? formatCurrency(d.valorTotal) : '••••'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        className: 'text-center',
        render: (d) => (
          <Badge variant={donationStatusBadgeVariant(d.statusPagamento)}>
            {donationStatusLabel(d.statusPagamento)}
          </Badge>
        ),
      },
      {
        key: 'data',
        header: 'Data',
        hideOnMobile: true,
        render: (d) => (
          <span className="text-xs font-bold text-gray-400">
            {donationDate(d).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'mensagem',
        header: 'Mensagem',
        hideOnMobile: true,
        render: (d) => (
          <span className="text-xs text-gray-500 line-clamp-2">
            {d.mensagemDoador?.trim() || '—'}
          </span>
        ),
      },
      {
        key: 'acoes',
        header: 'Ações',
        className: 'text-right',
        render: (d) => (
          <Link
            to={ROUTES.ADMIN.PURCHASE_DETAILS.replace(':id', d.id)}
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand-muted rounded-xl transition-all inline-flex"
            title="Ver detalhes da doação"
            aria-label="Ver detalhes da doação"
          >
            <Eye size={16} />
          </Link>
        ),
      },
    ],
    [showDonationAmounts]
  );

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
      title: 'Compras de Ingressos',
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

  const eventRevenueCards: Array<{
    title: string;
    value: string | number;
    icon: LucideIcon;
    accent: string;
    type: ReportType;
    hint?: string;
  }> = [
    {
      title: 'Valor recebido',
      value: formatCurrency(generalStats.arrecadado),
      icon: Wallet,
      accent: THEME.colors.status.active,
      type: 'total',
      hint: 'Ingressos pagos em todos os eventos',
    },
    {
      title: 'Valor pendente',
      value: formatCurrency(generalStats.valorPendente),
      icon: Clock,
      accent: '#d97706',
      type: 'pendentes',
      hint: 'Compras aguardando pagamento',
    },
    {
      title: 'Compras confirmadas',
      value: generalStats.comprasConfirmadas,
      icon: CheckCircle,
      accent: THEME.colors.primary,
      type: 'total',
    },
    {
      title: 'Ticket médio',
      value:
        generalStats.comprasConfirmadas > 0
          ? formatCurrency(generalStats.ticketMedio)
          : '—',
      icon: TrendingUp,
      accent: '#0d9488',
      type: 'total',
      hint: 'Por compra confirmada',
    },
  ];

  const donationCards: Array<{
    title: string;
    value: string | number;
    icon: LucideIcon;
    accent: string;
    type: ReportType;
    sensitive?: boolean;
  }> = [
    {
      title: 'Doações Confirmadas',
      value: donationStats.confirmadas,
      icon: HeartHandshake,
      accent: '#be185d',
      type: 'doacoes_confirmadas',
    },
    {
      title: 'Valor em Doações',
      value: formatCurrency(donationStats.valorConfirmado),
      icon: Wallet,
      accent: THEME.colors.status.active,
      type: 'doacoes_confirmadas',
      sensitive: true,
    },
    {
      title: 'Doações Pendentes',
      value: donationStats.pendentes,
      icon: Clock,
      accent: '#d97706',
      type: 'doacoes_pendentes',
    },
    {
      title: 'Doadores Únicos',
      value: donationStats.doadoresUnicos,
      icon: Users,
      accent: '#7c3aed',
      type: 'doacoes_confirmadas',
    },
    {
      title: 'Doações no Mês',
      value: formatCurrency(donationStats.valorMesAtual),
      icon: TrendingUp,
      accent: THEME.colors.primary,
      type: 'doacoes_confirmadas',
      sensitive: true,
    },
    {
      title: 'Ticket Médio',
      value:
        donationStats.confirmadas > 0
          ? formatCurrency(donationStats.ticketMedio)
          : '—',
      icon: PieChart,
      accent: '#0d9488',
      type: 'doacoes_confirmadas',
      sensitive: true,
    },
  ];

  const eventCards = eventStats
    ? [
        {
          title: 'Quantidade de vagas',
          value: eventStats.vagas,
          icon: PieChart,
          accent: THEME.colors.primary,
          sensitive: false,
        },
        {
          title: 'Inscritos',
          value: eventStats.inscritos,
          icon: Users,
          accent: THEME.colors.primary,
          sensitive: false,
        },
        {
          title: 'Ingressos Pagos',
          value: eventStats.ingressosPagos,
          icon: Ticket,
          accent: THEME.colors.status.active,
          sensitive: false,
        },
        {
          title: 'Ingressos Pendentes',
          value: eventStats.ingressosPendentes,
          icon: Clock,
          accent: '#d97706',
          sensitive: false,
        },
        {
          title: 'Valor Arrecadado',
          value: formatCurrency(eventStats.arrecadado),
          icon: Wallet,
          accent: THEME.colors.status.active,
          sensitive: true,
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-stretch">
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

            <section className="space-y-3">
              <div className="min-w-0">
                <p className="label-micro text-brand mb-1">Eventos</p>
                <h2 className="text-lg font-black text-gray-900">
                  Valores recebidos
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Soma consolidada das compras de ingressos em todos os eventos.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                {eventRevenueCards.map((card) => (
                  <StatCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    icon={card.icon}
                    accent={card.accent}
                    hint={card.hint}
                    onClick={() => handleOpenReport(card.type)}
                  />
                ))}
              </div>
            </section>

            <section className="card-surface p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="label-micro text-brand mb-1">Solidariedade</p>
                  <h2 className="text-lg font-black text-gray-900">Doações</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {donationsOpen
                      ? 'Detalhes visíveis só nesta sessão, até você ocultar de novo.'
                      : 'Valores e doadores ficam ocultos até você abrir as informações.'}
                  </p>
                </div>
                <Button
                  variant={donationsOpen ? 'secondary' : 'primary'}
                  className="rounded-2xl shrink-0"
                  onClick={() => setDonationsOpen((open) => !open)}
                >
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={donationsOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                  />
                  {donationsOpen ? 'Ocultar informações' : 'Ver informações'}
                </Button>
              </div>

              {donationsOpen ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      {donationStats.ultimaDoacao
                        ? `Última confirmada: ${donationStats.ultimaDoacao.compradorNome} · ${donationDate(donationStats.ultimaDoacao).toLocaleDateString('pt-BR')}`
                        : 'Nenhuma doação confirmada ainda.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => setShowDonationAmounts((v) => !v)}
                      >
                        {showDonationAmounts ? (
                          <EyeOff size={16} aria-hidden="true" />
                        ) : (
                          <Eye size={16} aria-hidden="true" />
                        )}
                        {showDonationAmounts ? 'Ocultar valores' : 'Mostrar valores'}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => exportDonationsCsv(donations)}
                        disabled={donations.length === 0}
                      >
                        <Download size={16} aria-hidden="true" />
                        Exportar CSV
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => handleOpenReport('doacoes')}
                      >
                        Ver todas
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 items-stretch">
                    {donationCards.map((card) => (
                      <StatCard
                        key={card.title}
                        title={card.title}
                        value={card.value}
                        icon={card.icon}
                        accent={card.accent}
                        sensitive={card.sensitive}
                        onClick={() => handleOpenReport(card.type)}
                      />
                    ))}
                  </div>

                  <DataTable
                    columns={donationColumns}
                    data={recentDonations}
                    rowKey={(d) => d.id}
                    emptyTitle="Nenhuma doação registrada"
                    emptyDescription="As contribuições feitas pela página pública aparecerão aqui."
                    emptyIcon={HeartHandshake}
                    toolbar={
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-sm font-black text-gray-900">
                          Doações recentes
                        </h3>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-4 py-1.5 rounded-full whitespace-nowrap">
                          {donations.length}{' '}
                          {donations.length === 1 ? 'registro' : 'registros'}
                        </span>
                      </div>
                    }
                  />
                </>
              ) : null}
            </section>

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
              <AppImage
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
                    <Button className="rounded-2xl">Realizar Check-in</Button>
                  </Link>
                </div>
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 items-stretch">
              {eventCards.map((card) => (
                <StatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  accent={card.accent}
                  sensitive={card.sensitive}
                />
              ))}
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
                <div className="flex flex-wrap gap-2">
                  {isDonationReport(activeReport) ? (
                    <>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => setShowDonationAmounts((v) => !v)}
                      >
                        {showDonationAmounts ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                        {showDonationAmounts ? 'Ocultar valores' : 'Mostrar valores'}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => exportDonationsCsv(filteredDonations)}
                        disabled={filteredDonations.length === 0}
                      >
                        <Download size={18} aria-hidden="true" />
                        Exportar CSV
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => window.print()}
                  >
                    <Printer size={18} aria-hidden="true" />
                    Imprimir
                  </Button>
                </div>
              }
            />

            <div className="sticky top-14 sm:top-20 z-10 bg-surface-admin/95 backdrop-blur-sm py-3 -mx-1 px-1">
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={
                  isDonationReport(activeReport)
                    ? 'Pesquisar doador, documento, e-mail ou certificado...'
                    : 'Pesquisar por nome, CPF ou e-mail...'
                }
              />
            </div>

            {isDonationReport(activeReport) ? (
              <DataTable
                columns={donationColumns}
                data={filteredDonations}
                rowKey={(d) => d.id}
                emptyTitle="Nenhuma doação encontrada"
                emptyDescription="Ajuste os critérios de busca ou aguarde novas contribuições."
                emptyIcon={HeartHandshake}
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
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
