import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  CheckCircle,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { Event } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { DataTable, type DataTableColumn } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Button, Badge, Alert, PageLoader, AppImage } from '../../components/ui';
import { formatEventDate } from '../../lib/utils';

type StatusFilter = 'all' | 'published' | 'draft';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventService.getAll();
      setEvents(data);
    } catch {
      setError('Não foi possível carregar os eventos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await eventService.delete(deleteId);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === deleteId
            ? {
                ...ev,
                status: 'arquivado',
                arquivado: true,
                publicado: false,
              }
            : ev
        )
      );
      setDeleteId(null);
    } catch {
      setError('Erro ao arquivar evento.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.local.toLowerCase().includes(searchTerm.toLowerCase());
      const archived = e.status === 'arquivado' || Boolean(e.arquivado);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && e.publicado && !archived) ||
        (statusFilter === 'draft' && !e.publicado && !archived);
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  const columns: DataTableColumn<Event>[] = [
    {
      key: 'evento',
      header: 'Evento',
      render: (event) => (
        <div className="flex items-center gap-3 min-w-0">
          <AppImage
            src={event.banner}
            alt=""
            loading="lazy"
            className="w-11 h-11 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-gray-900 line-clamp-1">{event.titulo}</p>
            <a
              href={`/evento/${event.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-brand font-bold hover:underline inline-flex items-center gap-1"
            >
              Ver página <ExternalLink size={10} aria-hidden="true" />
            </a>
          </div>
        </div>
      ),
    },
    {
      key: 'data',
      header: 'Data e Local',
      hideOnMobile: true,
      render: (event) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Calendar size={14} className="text-gray-400" aria-hidden="true" />
            <span>{formatEventDate(event.data)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <MapPin size={14} aria-hidden="true" />
            <span className="truncate max-w-[180px]">{event.local}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => {
        const archived = event.status === 'arquivado' || Boolean(event.arquivado);
        return (
          <Badge
            variant={
              archived ? 'danger' : event.publicado ? 'published' : 'draft'
            }
          >
            {archived ? 'Arquivado' : event.publicado ? 'Publicado' : 'Rascunho'}
          </Badge>
        );
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      className: 'text-right',
      render: (event) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to={ROUTES.ADMIN.EVENT_EDIT.replace(':id', event.id)}
            className="p-2 text-gray-400 hover:text-brand hover:bg-brand-muted rounded-lg transition-colors"
            title="Editar"
            aria-label="Editar"
          >
            <Edit2 size={17} />
          </Link>
          <Link
            to={ROUTES.ADMIN.EVENT_CHECKIN.replace(':id', event.id)}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Check-in"
            aria-label="Check-in"
          >
            <CheckCircle size={17} />
          </Link>
          <Link
            to={ROUTES.ADMIN.EVENT_REPORTS.replace(':id', event.id)}
            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Relatório"
            aria-label="Relatório"
          >
            <FileText size={17} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteId(event.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
            aria-label="Excluir"
          >
            <Trash2 size={17} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto min-w-0">
      <PageHeader
        title="Eventos"
        subtitle="Gerencie a listagem e os detalhes dos seus eventos."
        actions={
          <Link to={ROUTES.ADMIN.EVENT_NEW}>
            <Button className="rounded-2xl">
              <Plus size={18} aria-hidden="true" />
              Novo Evento
            </Button>
          </Link>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Pesquisar por título ou local..."
          className="flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'published', label: 'Publicados' },
              { id: 'draft', label: 'Rascunhos' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                statusFilter === chip.id
                  ? 'bg-brand text-white'
                  : 'bg-white text-gray-500 border border-gray-100 hover:border-brand/30'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PageLoader label="Carregando eventos..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredEvents}
          rowKey={(e) => e.id}
          onRowClick={(e) =>
            navigate(ROUTES.ADMIN.EVENT_EDIT.replace(':id', e.id))
          }
          emptyTitle="Nenhum evento encontrado"
          emptyDescription="Ajuste a busca ou crie um novo evento."
          emptyIcon={Calendar}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Arquivar evento"
        description="O evento será arquivado (soft-delete). Pedidos, pagamentos, ingressos e o histórico financeiro são preservados. Novas vendas serão bloqueadas."
        confirmLabel="Arquivar"
        isLoading={deleting}
      />
    </div>
  );
}
