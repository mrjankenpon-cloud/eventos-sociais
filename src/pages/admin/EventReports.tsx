import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  Ticket,
  Wallet,
  FileText,
  Download,
  PieChart,
  Clock,
  UserCheck,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import { ticketService } from '../../services/ticket.service';
import { Event, Purchase, Ticket as TicketType } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { StatCard } from '../../components/admin/StatCard';
import { DataTable, type DataTableColumn } from '../../components/admin/DataTable';
import { Badge, Button, PageLoader, EmptyState, Toast } from '../../components/ui';
import { formatCurrency } from '../../lib/utils';
import { exportEventReportCsv } from '../../lib/exportEventReportCsv';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { useAuth } from '../../contexts/AuthContext';

type InscritoRow = {
  id: string;
  ticketId: string | null;
  codigo: string;
  ingressoNome: string;
  nome: string;
  email: string;
  telefone: string;
  pago: boolean;
  statusLabel: 'Pago' | 'Pendente';
  cancelado: boolean;
  retirada: boolean;
  done: boolean;
  canCheckin: boolean;
  checkinEm: string;
  actionLabel: string;
};

function isRetiradaTicket(t: TicketType): boolean {
  return (
    t.natureza === 'retirada' ||
    String((t as { checkinModo?: string }).checkinModo || '') === 'retirada'
  );
}

function isCancelledTicket(t: TicketType): boolean {
  return (
    t.status === 'Cancelado' ||
    t.status === 'Reembolsado' ||
    t.status === 'Bloqueado'
  );
}

function buildInscritos(
  purchases: Purchase[],
  tickets: TicketType[]
): InscritoRow[] {
  const ticketsByPurchase = new Map<string, TicketType[]>();
  for (const t of tickets) {
    const key = t.compraId || t.pedidoId || '';
    if (!key) continue;
    const list = ticketsByPurchase.get(key) || [];
    list.push(t);
    ticketsByPurchase.set(key, list);
  }

  const rows: InscritoRow[] = [];

  for (const p of purchases) {
    if (p.statusPagamento !== 'confirmado' && p.statusPagamento !== 'pendente') {
      continue;
    }

    const pts = (ticketsByPurchase.get(p.id) || [])
      .slice()
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const pago = p.statusPagamento === 'confirmado';

    if (pts.length > 0) {
      for (const t of pts) {
        const retirada = isRetiradaTicket(t);
        const cancelado = isCancelledTicket(t);
        const done = retirada
          ? Boolean(t.retiradaRealizada)
          : t.checkinRealizado === true || t.status === 'Utilizado';
        rows.push({
          id: t.id,
          ticketId: t.id,
          codigo: t.codigo || '—',
          ingressoNome: t.ingressoNome || p.ticketTypeNome || '',
          nome: p.compradorNome,
          email: p.compradorEmail,
          telefone: p.compradorTelefone,
          pago,
          statusLabel: pago ? 'Pago' : 'Pendente',
          cancelado,
          retirada,
          done,
          canCheckin:
            pago &&
            !cancelado &&
            !done &&
            (retirada || t.status === 'Disponível'),
          checkinEm: retirada
            ? t.retiradaEm || ''
            : t.checkinEm || '',
          actionLabel: retirada ? 'Retirar' : 'Check-in',
        });
      }
      continue;
    }

    const total = Math.max(1, p.quantidadeIngressos || 1);
    for (let i = 0; i < total; i += 1) {
      rows.push({
        id: `${p.id}-${i}`,
        ticketId: null,
        codigo: '—',
        ingressoNome: p.ticketTypeNome || '',
        nome: p.compradorNome,
        email: p.compradorEmail,
        telefone: p.compradorTelefone,
        pago,
        statusLabel: pago ? 'Pago' : 'Pendente',
        cancelado: false,
        retirada: false,
        done: false,
        canCheckin: false,
        checkinEm: '',
        actionLabel: 'Check-in',
      });
    }
  }

  return rows.sort((a, b) => {
    const byName = a.nome.localeCompare(b.nome, 'pt-BR');
    if (byName !== 0) return byName;
    return a.codigo.localeCompare(b.codigo, 'pt-BR');
  });
}

export default function EventReports() {
  const { id } = useParams();
  const { user } = useAuth();
  const { message, show, clear } = useFlashMessage();
  const [event, setEvent] = useState<Event | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);

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

  const inscritos = useMemo(
    () => buildInscritos(purchases, tickets),
    [purchases, tickets]
  );

  const stats = useMemo(() => {
    const active = purchases.filter(
      (p) =>
        p.statusPagamento === 'confirmado' || p.statusPagamento === 'pendente'
    );
    const pagos = purchases.filter((p) => p.statusPagamento === 'confirmado');
    const pendentes = purchases.filter((p) => p.statusPagamento === 'pendente');
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
      vagas: event?.vagas ?? 0,
      inscritos: active.length,
      ingressosPagos,
      ingressosPendentes,
      arrecadado,
    };
  }, [purchases, event]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return inscritos;
    return inscritos.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.telefone.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.ingressoNome.toLowerCase().includes(q)
    );
  }, [inscritos, searchTerm]);

  const handleCheckin = async (row: InscritoRow) => {
    if (!row.ticketId || !id || !row.canCheckin) return;
    setBusyTicketId(row.ticketId);
    try {
      await ticketService.performCheckin(
        row.ticketId,
        user?.name || 'Operador Admin',
        id
      );
      const now = new Date().toISOString();
      setTickets((prev) =>
        prev.map((t) =>
          t.id === row.ticketId
            ? row.retirada
              ? { ...t, retiradaRealizada: true, retiradaEm: now }
              : {
                  ...t,
                  status: 'Utilizado',
                  checkinRealizado: true,
                  checkinEm: now,
                }
            : t
        )
      );
      show(
        'success',
        row.retirada
          ? `Retirada confirmada: ${row.codigo}.`
          : `Check-in confirmado: ${row.codigo}.`
      );
    } catch (error: unknown) {
      show(
        'error',
        error instanceof Error ? error.message : 'Erro ao realizar check-in.'
      );
    } finally {
      setBusyTicketId(null);
    }
  };

  const columns: DataTableColumn<InscritoRow>[] = [
    {
      key: 'nome',
      header: 'Nome',
      render: (p) => <span className="font-bold text-gray-900">{p.nome}</span>,
    },
    {
      key: 'email',
      header: 'E-mail',
      hideOnMobile: true,
      render: (p) => (
        <span className="text-sm text-gray-700 break-all">{p.email || '—'}</span>
      ),
    },
    {
      key: 'telefone',
      header: 'Telefone',
      hideOnMobile: true,
      render: (p) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {p.telefone || '—'}
        </span>
      ),
    },
    {
      key: 'ingresso',
      header: 'Ingresso',
      render: (p) => (
        <div className="min-w-0">
          <p className="text-[10px] font-black text-brand uppercase tracking-widest">
            {p.codigo}
          </p>
          <p className="text-xs font-bold text-gray-700 truncate">
            {p.ingressoNome || 'Ingresso'}
          </p>
        </div>
      ),
    },
    {
      key: 'pagamento',
      header: 'Pagamento',
      render: (p) => (
        <Badge variant={p.pago ? 'success' : 'warning'}>{p.statusLabel}</Badge>
      ),
    },
    {
      key: 'checkin',
      header: 'Realizar check-in',
      className: 'text-right',
      render: (p) => {
        if (p.cancelado) {
          return <Badge variant="danger">Cancelado</Badge>;
        }
        if (p.done) {
          return (
            <div className="flex flex-col items-end gap-0.5">
              <Badge variant="success">{p.retirada ? 'Retirado' : 'Feito'}</Badge>
              {p.checkinEm ? (
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(p.checkinEm).toLocaleString('pt-BR')}
                </span>
              ) : null}
            </div>
          );
        }
        if (p.canCheckin && p.ticketId) {
          return (
            <Button
              size="sm"
              className="rounded-xl"
              isLoading={busyTicketId === p.ticketId}
              onClick={() => void handleCheckin(p)}
            >
              <UserCheck size={14} aria-hidden="true" />
              {p.actionLabel}
            </Button>
          );
        }
        if (!p.pago) {
          return <Badge variant="warning">Aguardando</Badge>;
        }
        return <span className="text-xs text-gray-400">—</span>;
      },
    },
  ];

  if (loading) return <PageLoader label="Carregando lista de inscritos..." />;
  if (!event) {
    return (
      <EmptyState
        title="Evento não encontrado"
        description="Não foi possível carregar a lista."
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 min-w-0">
      {message ? (
        <Toast message={message} onClose={clear} />
      ) : null}

      <PageHeader
        title={event.titulo}
        subtitle="Inscritos e indicadores do evento"
        backTo={ROUTES.ADMIN.EVENTS}
        backLabel="Voltar para eventos"
        actions={
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={() =>
              exportEventReportCsv({
                event,
                purchases,
                tickets,
              })
            }
          >
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Vagas do evento"
          value={stats.vagas}
          icon={PieChart}
        />
        <StatCard title="Inscritos" value={stats.inscritos} icon={Users} />
        <StatCard
          title="Ingressos Pagos"
          value={stats.ingressosPagos}
          icon={Ticket}
        />
        <StatCard
          title="Ingressos Pendentes"
          value={stats.ingressosPendentes}
          icon={Clock}
        />
        <StatCard
          title="Valor Arrecadado"
          value={formatCurrency(stats.arrecadado)}
          icon={Wallet}
          sensitive
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(p) => p.id}
        emptyTitle="Nenhum inscrito"
        emptyDescription="Ainda não há inscrições neste evento."
        emptyIcon={FileText}
        toolbar={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Lista de inscritos
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                {filtered.length}{' '}
                {filtered.length === 1 ? 'ingresso' : 'ingressos'}
              </p>
            </div>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar nome, e-mail, telefone ou código..."
              className="sm:max-w-xs"
            />
          </div>
        }
      />
    </div>
  );
}
