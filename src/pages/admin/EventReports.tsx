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
import { Badge, Button, PageLoader, EmptyState } from '../../components/ui';
import { formatCurrency } from '../../lib/utils';
import { exportEventReportCsv } from '../../lib/exportEventReportCsv';
import { participantService } from '../../services/participant.service';

type InscritoRow = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  quantidadeIngressos: number;
  pago: boolean;
  statusLabel: 'Pago' | 'Pendente';
  checkinFeito: boolean;
  checkinLabel: string;
  checkinDetail: string;
};

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

  return purchases
    .filter(
      (p) =>
        p.statusPagamento === 'confirmado' || p.statusPagamento === 'pendente'
    )
    .map((p) => {
      const pts = ticketsByPurchase.get(p.id) || [];
      const checked = pts.filter(
        (t) => t.checkinRealizado || t.status === 'Utilizado'
      ).length;
      const total = Math.max(pts.length, p.quantidadeIngressos || 0);
      const pago = p.statusPagamento === 'confirmado';
      const checkinFeito = checked > 0;
      let checkinLabel = 'Não';
      let checkinDetail = '';
      if (total > 0 && checked >= total) {
        checkinLabel = 'Sim';
        checkinDetail = total > 1 ? `${checked}/${total}` : '';
      } else if (checked > 0) {
        checkinLabel = 'Parcial';
        checkinDetail = `${checked}/${total}`;
      }

      const row: InscritoRow = {
        id: p.id,
        nome: p.compradorNome,
        email: p.compradorEmail,
        telefone: p.compradorTelefone,
        quantidadeIngressos: p.quantidadeIngressos,
        pago,
        statusLabel: pago ? 'Pago' : 'Pendente',
        checkinFeito,
        checkinLabel,
        checkinDetail,
      };
      return row;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export default function EventReports() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
        p.telefone.toLowerCase().includes(q)
    );
  }, [inscritos, searchTerm]);

  const columns: DataTableColumn<InscritoRow>[] = [
    {
      key: 'nome',
      header: 'Nome',
      render: (p) => <span className="font-bold text-gray-900">{p.nome}</span>,
    },
    {
      key: 'email',
      header: 'E-mail',
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
      key: 'ingressos',
      header: 'Ingressos',
      className: 'text-center',
      render: (p) => (
        <span className="font-black tabular-nums">{p.quantidadeIngressos}</span>
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
      header: 'Check-in',
      render: (p) => (
        <div className="flex flex-col items-start gap-0.5">
          <Badge
            variant={
              p.checkinLabel === 'Sim'
                ? 'success'
                : p.checkinLabel === 'Parcial'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {p.checkinLabel}
          </Badge>
          {p.checkinDetail ? (
            <span className="text-[10px] text-gray-400 font-medium tabular-nums">
              {p.checkinDetail} ingressos
            </span>
          ) : null}
        </div>
      ),
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
      <PageHeader
        title={event.titulo}
        subtitle="Inscritos e indicadores do evento"
        backTo={ROUTES.ADMIN.EVENTS}
        backLabel="Voltar para eventos"
        actions={
          <Button
            variant="secondary"
            className="rounded-2xl"
            onClick={async () => {
              const participants = await participantService.getByEventId(
                event.id
              );
              exportEventReportCsv({
                event,
                participants,
                purchases,
              });
            }}
          >
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                {filtered.length === 1 ? 'registro' : 'registros'}
              </p>
            </div>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar nome, e-mail ou telefone..."
              className="sm:max-w-xs"
            />
          </div>
        }
      />
    </div>
  );
}
