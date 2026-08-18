import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  HeartHandshake,
  Edit2,
  ExternalLink,
  Plus,
  Trash2,
  ArrowUpDown,
  MapPin,
} from 'lucide-react';
import { institutionService } from '../../services/institution.service';
import { eventService } from '../../services/event.service';
import type { Institution, InstitutionFormData } from '../../types';
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
import { BRAZIL_STATES } from '../../lib/eventForm';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'nome-asc' | 'nome-desc' | 'recent' | 'events' | 'cidade';

const EMPTY_FORM: InstitutionFormData = {
  nome: '',
  logo: '',
  imagemDestaque: '',
  descricaoCurta: '',
  historia: '',
  site: '',
  instagram: '',
  facebook: '',
  email: '',
  telefone: '',
  endereco: '',
  cidade: '',
  estado: 'SP',
  chavePix: '',
  ativo: true,
};

export default function Institutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('nome-asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<InstitutionFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await institutionService.getAll();
      setItems(data);
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (i) => {
          counts[i.id] = await eventService.countByInstitution(i.id);
        })
      );
      setEventCounts(counts);
    } catch {
      setError('Não foi possível carregar as instituições.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        i.nome.toLowerCase().includes(q) ||
        (i.cidade?.toLowerCase().includes(q) ?? false) ||
        i.descricaoCurta.toLowerCase().includes(q);
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && i.ativo) ||
        (status === 'inactive' && !i.ativo);
      return matchesSearch && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'nome-asc') return a.nome.localeCompare(b.nome, 'pt-BR');
      if (sort === 'nome-desc') return b.nome.localeCompare(a.nome, 'pt-BR');
      if (sort === 'cidade') {
        return (a.cidade || '').localeCompare(b.cidade || '', 'pt-BR');
      }
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

  const openEdit = (i: Institution) => {
    setForm({
      nome: i.nome,
      logo: i.logo,
      imagemDestaque: i.imagemDestaque || '',
      descricaoCurta: i.descricaoCurta,
      historia: i.historia,
      site: i.site || '',
      instagram: i.instagram || '',
      facebook: i.facebook || '',
      email: i.email || '',
      telefone: i.telefone || '',
      endereco: i.endereco || '',
      cidade: i.cidade || '',
      estado: i.estado || 'SP',
      chavePix: i.chavePix || '',
      ativo: i.ativo,
    });
    setFormError(null);
    setEditing(i);
    setCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
    setFormError(null);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      setFormError('Informe o nome da instituição.');
      return;
    }
    if (!form.logo) {
      setFormError('Envie o logotipo.');
      return;
    }
    if (!form.descricaoCurta.trim()) {
      setFormError('Informe a descrição curta.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await institutionService.update(editing.id, form);
      } else {
        await institutionService.create(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error && err.message
          ? err.message.replace(/^\[[^\]]+\]\s*/, '')
          : 'Erro ao salvar instituição.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await eventService.unlinkInstitution(deleteId);
      await institutionService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch {
      setError('Erro ao excluir instituição.');
    } finally {
      setDeleting(false);
    }
  };

  const modalOpen = creating || Boolean(editing);

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Instituições"
        subtitle="Cadastro de instituições beneficiadas pelos eventos."
        actions={
          <Button className="rounded-2xl" onClick={openCreate}>
            <Plus size={18} aria-hidden="true" />
            Nova instituição
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
          placeholder="Pesquisar por nome, cidade ou descrição..."
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'active', label: 'Ativas' },
              { id: 'inactive', label: 'Inativas' },
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
              <option value="cidade">Cidade</option>
              <option value="recent">Mais recentes</option>
              <option value="events">Mais eventos</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Carregando instituições..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="Nenhuma instituição encontrada"
          description="Ajuste a busca ou cadastre uma nova instituição."
          action={
            <Button className="rounded-2xl" onClick={openCreate}>
              <Plus size={16} /> Nova instituição
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((inst, index) => (
            <motion.article
              key={inst.id}
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
                    src={inst.logo}
                    alt=""
                    className="max-w-full max-h-full object-contain p-2"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-gray-900 leading-snug line-clamp-2">
                      {inst.nome}
                    </h3>
                    <Badge variant={inst.ativo ? 'published' : 'draft'}>
                      {inst.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  {(inst.cidade || inst.estado) && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <MapPin size={12} aria-hidden="true" />
                      {[inst.cidade, inst.estado].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wider">
                    {eventCounts[inst.id] ?? 0}{' '}
                    {(eventCounts[inst.id] ?? 0) === 1
                      ? 'evento realizado'
                      : 'eventos realizados'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 line-clamp-2">{inst.descricaoCurta}</p>

              <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
                {inst.site ? (
                  <a
                    href={inst.site}
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
                    onClick={() => openEdit(inst)}
                    className="p-2 text-gray-400 hover:text-brand hover:bg-brand-muted rounded-lg transition-colors"
                    aria-label="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(inst.id)}
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
        title={editing ? 'Editar instituição' : 'Nova instituição'}
        maxWidth="4xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Input
            label="Nome *"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-700">Logotipo *</p>
              {form.logo ? (
                <div className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50">
                  <AppImage
                    src={form.logo}
                    alt=""
                    className="w-16 h-16 object-contain rounded-xl bg-white border"
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
                  label="Arraste o logotipo"
                  imageKind="logo"
                  onFiles={async (files) => {
                    const url = await readFileAsDataUrl(files[0], 'logo');
                    setForm((f) => ({ ...f, logo: url }));
                  }}
                />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-700">Imagem de destaque</p>
              {form.imagemDestaque ? (
                <div className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50">
                  <AppImage
                    src={form.imagemDestaque}
                    alt=""
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => setForm((f) => ({ ...f, imagemDestaque: '' }))}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <ImageUploadZone
                  label="Arraste a imagem de destaque"
                  imageKind="destaque"
                  onFiles={async (files) => {
                    const url = await readFileAsDataUrl(files[0], 'destaque');
                    setForm((f) => ({ ...f, imagemDestaque: url }));
                  }}
                />
              )}
            </div>
          </div>

          <Textarea
            label="Descrição curta *"
            value={form.descricaoCurta}
            onChange={(e) => setForm((f) => ({ ...f, descricaoCurta: e.target.value }))}
            rows={2}
          />
          <Textarea
            label="História completa"
            value={form.historia}
            onChange={(e) => setForm((f) => ({ ...f, historia: e.target.value }))}
            rows={4}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Site"
              type="url"
              value={form.site || ''}
              onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
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
            />
            <Input
              label="Facebook"
              value={form.facebook || ''}
              onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
            />
            <Input
              label="Telefone"
              value={form.telefone || ''}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
            <Input
              label="Chave PIX"
              value={form.chavePix || ''}
              onChange={(e) => setForm((f) => ({ ...f, chavePix: e.target.value }))}
            />
            <Input
              label="Endereço"
              value={form.endereco || ''}
              onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
              className="sm:col-span-2"
            />
            <Input
              label="Cidade"
              value={form.cidade || ''}
              onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Estado</label>
              <select
                value={form.estado || 'SP'}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer sm:col-span-2">
              <span className="text-sm font-bold text-gray-700">Ativa</span>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="w-5 h-5 accent-brand"
              />
            </label>
          </div>

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
        title="Excluir instituição"
        description="O vínculo será removido dos eventos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleting}
      />
    </div>
  );
}
