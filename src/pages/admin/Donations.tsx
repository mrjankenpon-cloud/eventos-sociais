import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Download,
  Eye,
  HeartHandshake,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { purchaseService } from '../../services/purchase.service';
import type { Purchase } from '../../types';
import { ROUTES } from '../../config';
import { THEME } from '../../theme';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { StatCard } from '../../components/admin/StatCard';
import { DataTable, type DataTableColumn } from '../../components/admin/DataTable';
import { Alert, Badge, Button, PageLoader } from '../../components/ui';
import { formatCurrency } from '../../lib/utils';
import {
  computeDonationStats,
  donationDate,
  donationStatusBadgeVariant,
  donationStatusLabel,
  exportDonationsCsv,
  formatDonorDocument,
  donorDocumentLabel,
  isDonationPurchase,
} from '../../lib/donations';

type StatusFilter = 'all' | 'confirmado' | 'pendente' | 'outros';

export default function Donations() {
  const [donations, setDonations] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function load() {
      try {
        const purchases = await purchaseService.getAll();
        setDonations(purchases.filter(isDonationPurchase));
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar as doações.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const stats = useMemo(() => computeDonationStats(donations), [donations]);

  const filtered = useMemo(() => {
    let list = [...donations].sort(
      (a, b) => donationDate(b).getTime() - donationDate(a).getTime()
    );

    if (statusFilter === 'confirmado') {
      list = list.filter((d) => d.statusPagamento === 'confirmado');
    } else if (statusFilter === 'pendente') {
      list = list.filter((d) => d.statusPagamento === 'pendente');
    } else if (statusFilter === 'outros') {
      list = list.filter((d) =>
        ['cancelado', 'expirado', 'reembolsado'].includes(d.statusPagamento)
      );
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const digits = q.replace(/\D/g, '');
      list = list.filter(
        (d) =>
          d.compradorNome.toLowerCase().includes(q) ||
          d.compradorEmail.toLowerCase().includes(q) ||
          (digits && d.compradorCPF.includes(digits)) ||
          (d.certificadoNumero || '').toLowerCase().includes(q) ||
          (d.mensagemDoador || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [donations, statusFilter, searchTerm]);

  const columns: DataTableColumn<Purchase>[] = useMemo(
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
            {formatCurrency(d.valorTotal)}
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
    []
  );

  if (loading) return <PageLoader label="Carregando doações..." />;

  return (
    <div className="space-y-8 min-w-0">
      <PageHeader
        title="Doações"
        actions={
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => exportDonationsCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </Button>
        }
      />

      {error ? (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        <StatCard
          title="Doações confirmadas"
          value={stats.confirmadas}
          icon={HeartHandshake}
          accent="#be185d"
          onClick={() => setStatusFilter('confirmado')}
        />
        <StatCard
          title="Valor confirmado"
          value={formatCurrency(stats.valorConfirmado)}
          icon={Wallet}
          accent={THEME.colors.status.active}
          sensitive
          onClick={() => setStatusFilter('confirmado')}
        />
        <StatCard
          title="Doações pendentes"
          value={stats.pendentes}
          icon={Clock}
          accent="#d97706"
          onClick={() => setStatusFilter('pendente')}
        />
        <StatCard
          title="Valor pendente"
          value={formatCurrency(stats.valorPendente)}
          icon={Clock}
          accent="#d97706"
          sensitive
          onClick={() => setStatusFilter('pendente')}
        />
        <StatCard
          title="Doadores únicos"
          value={stats.doadoresUnicos}
          icon={Users}
          accent="#7c3aed"
          onClick={() => setStatusFilter('confirmado')}
        />
        <StatCard
          title="Doações no mês"
          value={formatCurrency(stats.valorMesAtual)}
          icon={TrendingUp}
          accent={THEME.colors.primary}
          hint={`${stats.qtdMesAtual} ${stats.qtdMesAtual === 1 ? 'doação' : 'doações'}`}
          sensitive
          onClick={() => setStatusFilter('confirmado')}
        />
        <StatCard
          title="Ticket médio"
          value={
            stats.confirmadas > 0 ? formatCurrency(stats.ticketMedio) : '—'
          }
          icon={PieChart}
          accent="#0d9488"
          sensitive
          onClick={() => setStatusFilter('confirmado')}
        />
        <StatCard
          title="Canceladas / expiradas"
          value={stats.canceladas}
          icon={HeartHandshake}
          accent={THEME.colors.status.inactive}
          onClick={() => setStatusFilter('outros')}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(d) => d.id}
        emptyTitle="Nenhuma doação encontrada"
        emptyDescription="As contribuições feitas pela página pública aparecerão aqui."
        emptyIcon={HeartHandshake}
        toolbar={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Lista de doações
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  {filtered.length}{' '}
                  {filtered.length === 1 ? 'registro' : 'registros'}
                </p>
              </div>
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar doador, documento, e-mail ou certificado..."
                className="sm:max-w-xs"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'confirmado', label: 'Confirmadas' },
                  { id: 'pendente', label: 'Pendentes' },
                  { id: 'outros', label: 'Canceladas' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                    statusFilter === chip.id
                      ? 'bg-brand text-white'
                      : 'bg-gray-50 text-gray-500 border border-gray-100 hover:border-brand/30'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
