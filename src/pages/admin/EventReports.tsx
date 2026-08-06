import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Ticket, Wallet, FileText } from 'lucide-react';
import { eventService } from '../../services/event.service';
import { participantService } from '../../services/participant.service';
import { Event, Participant } from '../../types';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [eventData, participantsData] = await Promise.all([
          eventService.getById(id),
          participantService.getByEventId(id),
        ]);
        if (eventData) setEvent(eventData);
        setParticipants(participantsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const totalInscritos = participants.length;
  const totalIngressos = participants.reduce(
    (acc, p) => acc + p.quantidadeIngressos,
    0
  );
  const totalArrecadado =
    event && !event.gratuito ? totalIngressos * event.valor : 0;
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
        <StatCard title="Ingressos" value={totalIngressos} icon={Ticket} />
        <StatCard
          title="Arrecadação"
          value={event.gratuito ? 'Gratuito' : formatCurrency(totalArrecadado)}
          icon={Wallet}
        />
        <StatCard
          title="Check-in"
          value={`${totalCheckin} / ${totalInscritos}`}
          icon={FileText}
        />
      </div>

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
