import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Ticket, Wallet, FileText, Percent } from 'lucide-react';
import { eventService } from '../../services/event.service';
import { participantService } from '../../services/participant.service';
import { purchaseService } from '../../services/purchase.service';
import { Event, Participant, Purchase } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { StatCard } from '../../components/admin/StatCard';
import { DataTable, type DataTableColumn } from '../../components/admin/DataTable';
import { Badge, PageLoader, EmptyState } from '../../components/ui';
import { formatCurrency } from '../../lib/utils';

export default function EventReports() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [eventData, participantsData, purchasesData] = await Promise.all([
          eventService.getById(id),
          participantService.getByEventId(id),
          purchaseService.getByEventId(id),
        ]);
        if (eventData) setEvent(eventData);
        setParticipants(participantsData);
        setPurchases(purchasesData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const confirmed = useMemo(
    () => purchases.filter((p) => p.statusPagamento === 'confirmado'),
    [purchases]
  );

  const totalInscritos = participants.length;
  const totalIngressos = confirmed.reduce(
    (acc, p) => acc + p.quantidadeIngressos,
    0
  );

  /** Valores efetivos do MP quando disponíveis; senão bruto congelado do pedido. */
  const financeiro = useMemo(() => {
    let bruto = 0;
    let taxas = 0;
    let liquido = 0;
    let comDadosMp = 0;

    for (const p of confirmed) {
      if (
        typeof p.mpTransactionAmount === 'number' &&
        p.mpTransactionAmount >= 0
      ) {
        bruto += p.mpTransactionAmount;
        taxas += Number(p.mpFeeAmount) || 0;
        liquido +=
          typeof p.mpNetReceivedAmount === 'number'
            ? p.mpNetReceivedAmount
            : p.mpTransactionAmount - (Number(p.mpFeeAmount) || 0);
        comDadosMp += 1;
      } else {
        bruto += p.valorTotal;
        liquido += p.valorTotal;
      }
    }

    return { bruto, taxas, liquido, comDadosMp, totalConfirmados: confirmed.length };
  }, [confirmed]);

  const totalCheckin = participants.filter((p) => p.checkinRealizado).length;

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.cpf.includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [participants, searchTerm]);

  const columns: DataTableColumn<Participant>[] = [
    {
      key: 'nome',
      header: 'Nome',
      render: (p) => <span className="font-bold text-gray-900">{p.nome}</span>,
    },
    {
      key: 'cpf',
      header: 'CPF',
      hideOnMobile: true,
      render: (p) => <span className="text-gray-500">{p.cpf}</span>,
    },
    {
      key: 'contato',
      header: 'Contato',
      render: (p) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{p.email}</p>
          <p className="text-xs text-gray-400">{p.telefone}</p>
        </div>
      ),
    },
    {
      key: 'ingressos',
      header: 'Ingressos',
      render: (p) => (
        <span className="font-black tabular-nums">{p.quantidadeIngressos}</span>
      ),
    },
    {
      key: 'checkin',
      header: 'Check-in',
      render: (p) => (
        <Badge variant={p.checkinRealizado ? 'success' : 'danger'}>
          {p.checkinRealizado ? 'Confirmado' : 'Pendente'}
        </Badge>
      ),
    },
  ];

  if (loading) return <PageLoader label="Gerando relatório..." />;
  if (!event) {
    return (
      <EmptyState
        title="Evento não encontrado"
        description="Não foi possível carregar o relatório."
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 min-w-0">
      <PageHeader
        title={event.titulo}
        subtitle="Relatórios e estatísticas"
        backTo={ROUTES.ADMIN.EVENTS}
        backLabel="Voltar para eventos"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Inscritos" value={totalInscritos} icon={Users} />
        <StatCard title="Ingressos confirmados" value={totalIngressos} icon={Ticket} />
        <StatCard
          title="Bruto (MP / pedido)"
          value={formatCurrency(financeiro.bruto)}
          icon={Wallet}
        />
        <StatCard
          title="Check-in"
          value={`${totalCheckin} / ${totalInscritos}`}
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Taxas Mercado Pago"
          value={formatCurrency(financeiro.taxas)}
          icon={Percent}
        />
        <StatCard
          title="Líquido"
          value={formatCurrency(financeiro.liquido)}
          icon={Wallet}
        />
        <StatCard
          title="Pedidos com dados MP"
          value={`${financeiro.comDadosMp} / ${financeiro.totalConfirmados}`}
          icon={FileText}
        />
      </div>

      <p className="text-xs text-gray-400">
        Taxas e líquido usam valores efetivos retornados pela API do Mercado Pago
        quando disponíveis. Pedidos sem dados MP (ex.: gratuitos) entram pelo valor
        congelado do pedido, sem taxa estimada.
      </p>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(p) => p.id}
        emptyTitle="Nenhum participante"
        emptyDescription="Ainda não há inscritos neste evento."
        emptyIcon={Users}
        toolbar={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-gray-900">Participantes</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                {filtered.length} registros
              </p>
            </div>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar nome, CPF ou e-mail..."
              className="sm:max-w-xs"
            />
          </div>
        }
      />
    </div>
  );
}
