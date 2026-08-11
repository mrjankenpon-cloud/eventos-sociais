import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Edit2,
  ExternalLink,
  Plus,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { sponsorService } from '../../services/sponsor.service';
import { eventService } from '../../services/event.service';
import type { Sponsor, SponsorFormData } from '../../types';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import {
  ImageUploadZone,
  readFileAsDataUrl,
} from '../../components/admin/event-form/ImageUploadZone';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  PageLoader,
  Textarea,
  AppImage,
} from '../../components/ui';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'nome-asc' | 'nome-desc' | 'recent' | 'events';

const EMPTY_FORM: SponsorFormData = {
  nome: '',
  logo: '',
  site: '',
  instagram: '',
  facebook: '',
  email: '',
  telefone: '',
  descricao: '',
  ativo: true,
};

export default function Sponsors() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('nome-asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SponsorFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sponsorService.getAll();
      setItems(data);
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (s) => {
          counts[s.id] = await eventService.countBySponsor(s.id);
        })
      );
      setEventCounts(counts);
    } catch {
      setError('Não foi possível carregar os patrocinadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = items.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.nome.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.descricao?.toLowerCase().includes(q) ?? false);
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && s.ativo) ||
        (status === 'inactive' && !s.ativo);
      return matchesSearch && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'nome-asc') return a.nome.localeCompare(b.nome, 'pt-BR');
      if (sort === 'nome-desc') return b.nome.localeCompare(a.nome, 'pt-BR');
      if (sort === 'events') {
        return (eventCounts[b.id] ?? 0) - (eventCounts[a.id] ?? 0);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [items, search, status, sort, eventCounts]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (s: Sponsor) => {
    setForm({
      nome: s.nome,
      logo: s.logo,
      site: s.site || '',
      instagram: s.instagram || '',
      facebook: s.facebook || '',
      email: s.email || '',
      telefone: s.telefone || '',
      descricao: s.descricao || '',
      ativo: s.ativo,
    });
    setFormError(null);
    setEditing(s);
    setCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
    setFormError(null);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      setFormError('Informe o nome da empresa.');
      return;
    }
    if (!form.logo) {
      setFormError('Envie o logotipo.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await sponsorService.update(editing.id, form);
      } else {
        await sponsorService.create(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error && err.message
          ? err.message.replace(/^\[[^\]]+\]\s*/, '')
          : 'Erro ao salvar patrocinador.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await eventService.unlinkSponsor(deleteId);
      await sponsorService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch {
      setError('Erro ao excluir patrocinador.');
    } finally {
      setDeleting(false);
    }
  };

  const modalOpen = creating || Boolean(editing);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto min-w-0">
      <PageHeader
        title="Patrocinadores"
        subtitle="Cadastro reutilizável de empresas parceiras."
        actions={
          <Button className="rounded-2xl" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" />
            Novo patrocinador
          </Button>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por nome, e-mail ou descrição..."
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'inactive', label: 'Inativos' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatus(chip.id)}
              className={cn(
                'px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors',
                status === chip.id
                  ? 'bg-brand text-white'
                  : 'bg-white text-gray-500 border border-gray-100 hover:border-brand/30'
              )}
            >
              {chip.label}
            </button>
          ))}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-100 text-xs font-bold text-gray-500">
            <ArrowUpDown size={14} aria-hidden="true" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent outline-none cursor-pointer"
              aria-label="Ordenar"
            >
              <option value="nome-asc">Nome A–Z</option>
              <option value="nome-desc">Nome Z–A</option>
              <option value="recent">Mais recentes</option>
              <option value="events">Mais eventos</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Carregando patrocinadores..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum patrocinador encontrado"
          description="Ajuste a busca ou cadastre um novo parceiro."
          action={
            <Button className="rounded-2xl" onClick={openCreate}>
              <Plus size={16} /> Novo patrocinador
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((sponsor, index) => (
            <motion.article
              key={sponsor.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: Math.min(index * 0.03, 0.2),
                duration: THEME.motion.duration,
                ease: THEME.motion.ease,
              }}
              className="card-surface p-5 flex flex-col gap-4 h-full"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  <AppImage
                    src={sponsor.logo}
                    alt=""
                    className="max-w-full max-h-full object-contain p-2"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-gray-900 leading-snug line-clamp-2">
                      {sponsor.nome}
                    </h3>
                    <Badge variant={sponsor.ativo ? 'published' : 'draft'}>
                      {sponsor.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wider">
                    {eventCounts[sponsor.id] ?? 0}{' '}
                    {(eventCounts[sponsor.id] ?? 0) === 1
                      ? 'evento vinculado'
                      : 'eventos vinculados'}
                  </p>
                </div>
              </div>

              {sponsor.descricao && (
                <p className="text-sm text-gray-500 line-clamp-2">{sponsor.descricao}</p>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
                {sponsor.site ? (
                  <a
                    href={sponsor.site}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-brand inline-flex items-center gap-1 hover:underline"
                  >
                    Site <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-xs text-gray-300">Sem site</span>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(sponsor)}
                    className="p-2 text-gray-400 hover:text-brand hover:bg-brand-muted rounded-lg transition-colors"
                    aria-label="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(sponsor.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar patrocinador' : 'Novo patrocinador'}
        maxWidth="2xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Nome da empresa *"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-700">Logotipo *</p>
            {form.logo ? (
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50">
                <AppImage
                  src={form.logo}
                  alt="Preview"
                  className="w-16 h-16 object-contain rounded-xl bg-white border border-gray-100"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <ImageUploadZone
                label="Arraste o logotipo ou clique"
                imageKind="logo"
                onFiles={async (files) => {
                  const url = await readFileAsDataUrl(files[0], 'logo');
                  setForm((f) => ({ ...f, logo: url }));
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Site"
              type="url"
              value={form.site || ''}
              onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
              placeholder="https://"
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Instagram"
              value={form.instagram || ''}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="https://instagram.com/..."
            />
            <Input
              label="Facebook"
              value={form.facebook || ''}
              onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
              placeholder="https://facebook.com/..."
            />
            <Input
              label="Telefone"
              value={form.telefone || ''}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
            <label className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer">
              <span className="text-sm font-bold text-gray-700">Ativo</span>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="w-5 h-5 accent-brand"
              />
            </label>
          </div>

          <Textarea
            label="Descrição"
            value={form.descricao || ''}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            rows={3}
          />

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl flex-1"
              onClick={closeModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-2xl flex-[2]"
              isLoading={saving}
              onClick={() => void save()}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir patrocinador"
        description="O vínculo será removido dos eventos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleting}
      />
    </div>
  );
}
