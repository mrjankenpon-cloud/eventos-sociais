import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { videosService } from '../../services/firebase/videos';
import type { SiteVideo, SiteVideoFormData } from '../../types';
import { PageHeader } from '../../components/admin/PageHeader';
import { SearchField } from '../../components/admin/SearchField';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  PageLoader,
} from '../../components/ui';
import { THEME } from '../../theme';
import { cn } from '../../lib/utils';
import {
  isValidVideoUrl,
  parseVideoLink,
  resolveVideoThumbnail,
} from '../../lib/videoLink';

type StatusFilter = 'all' | 'active' | 'inactive';

const EMPTY_FORM: SiteVideoFormData = {
  titulo: '',
  url: '',
  thumbnailUrl: '',
  ordem: 0,
  ativo: true,
};

export default function Videos() {
  const [items, setItems] = useState<SiteVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<SiteVideo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SiteVideoFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await videosService.getAll());
    } catch {
      setError('Não foi possível carregar os vídeos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return items
      .filter((v) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          v.titulo.toLowerCase().includes(q) ||
          v.url.toLowerCase().includes(q);
        const matchesStatus =
          status === 'all' ||
          (status === 'active' && v.ativo) ||
          (status === 'inactive' && !v.ativo);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }, [items, search, status]);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      ordem: items.length > 0 ? Math.max(...items.map((v) => v.ordem)) + 1 : 0,
    });
    setFormError(null);
  };

  const openEdit = (video: SiteVideo) => {
    setEditing(video);
    setCreating(false);
    setForm({
      titulo: video.titulo,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl ?? '',
      ordem: video.ordem,
      ativo: video.ativo,
    });
    setFormError(null);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    const titulo = form.titulo.trim();
    const url = form.url.trim();
    if (!titulo) {
      setFormError('Informe um título.');
      return;
    }
    if (!isValidVideoUrl(url)) {
      setFormError('Informe um link de vídeo válido (YouTube, Vimeo ou URL http/https).');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload: SiteVideoFormData = {
        titulo,
        url: parseVideoLink(url)?.url ?? url,
        thumbnailUrl: form.thumbnailUrl?.trim() || undefined,
        ordem: Number.isFinite(form.ordem) ? form.ordem : 0,
        ativo: form.ativo,
      };
      if (editing) {
        await videosService.update(editing.id, payload);
      } else {
        await videosService.create(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error('[Videos.save]', err);
      const detail = err instanceof Error ? err.message : '';
      setFormError(
        detail.toLowerCase().includes('permission')
          ? 'Sem permissão para salvar. Sua conta precisa ser admin ou editor.'
          : `Não foi possível salvar o vídeo.${detail ? ` (${detail})` : ''}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await videosService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch {
      setError('Não foi possível remover o vídeo.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (video: SiteVideo) => {
    try {
      await videosService.update(video.id, { ativo: !video.ativo });
      await load();
    } catch {
      setError('Não foi possível alterar a visibilidade.');
    }
  };

  const previewThumb = resolveVideoThumbnail({
    url: form.url,
    thumbnailUrl: form.thumbnailUrl,
  });
  const previewParsed = parseVideoLink(form.url);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vídeos"
          subtitle="Links exibidos no carrossel da página inicial."
        />
        <PageLoader label="Carregando vídeos..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Vídeos"
        subtitle="Adicione links do YouTube, Vimeo ou qualquer URL de vídeo. Só os ativos aparecem na home."
        actions={
          <Button type="button" onClick={openCreate} className="rounded-2xl">
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Novo vídeo
          </Button>
        }
      />

      {error ? (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por título ou link..."
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Todos'],
              ['active', 'Visíveis'],
              ['inactive', 'Ocultos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors',
                status === id
                  ? 'bg-brand text-white'
                  : 'bg-gray-50 text-gray-500 hover:text-brand'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Nenhum vídeo cadastrado"
          description="Cadastre links para exibir miniaturas no carrossel da página inicial."
          action={
            <Button type="button" onClick={openCreate}>
              Adicionar vídeo
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((video, index) => {
            const thumb = resolveVideoThumbnail(video);
            return (
              <motion.li
                key={video.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: THEME.motion.duration,
                  ease: THEME.motion.ease,
                  delay: Math.min(index * 0.03, 0.2),
                }}
                className="card-surface overflow-hidden flex items-stretch gap-3 p-2.5 sm:p-3"
              >
                <div className="relative w-24 sm:w-28 aspect-video shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <Video size={20} aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-0.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-gray-900 text-sm leading-snug truncate">
                        {video.titulo}
                      </p>
                      <Badge variant={video.ativo ? 'success' : 'neutral'}>
                        {video.ativo ? 'Visível' : 'Oculto'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{video.url}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-1">
                      Ordem {video.ordem}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void toggleActive(video)}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-brand hover:bg-brand-muted transition-colors"
                      aria-label={video.ativo ? 'Ocultar vídeo' : 'Tornar visível'}
                      title={video.ativo ? 'Ocultar' : 'Tornar visível'}
                    >
                      {video.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-brand hover:bg-brand-muted transition-colors"
                      aria-label="Abrir link"
                    >
                      <ExternalLink size={16} aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(video)}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-brand hover:bg-brand-muted transition-colors"
                      aria-label="Editar vídeo"
                    >
                      <Edit2 size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(video.id)}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Excluir vídeo"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={creating || Boolean(editing)}
        onClose={closeModal}
        title={editing ? 'Editar vídeo' : 'Novo vídeo'}
      >
        <div className="space-y-4">
          {formError ? (
            <Alert variant="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          ) : null}

          <Input
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            placeholder="Ex.: Bastidores do jantar beneficente"
          />
          <Input
            label="Link do vídeo"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://www.youtube.com/watch?v=..."
            hint={
              previewParsed
                ? `Detectado: ${
                    previewParsed.provider === 'youtube'
                      ? 'YouTube'
                      : previewParsed.provider === 'vimeo'
                        ? 'Vimeo'
                        : 'Link genérico'
                  }`
                : 'YouTube, Vimeo ou qualquer URL http/https'
            }
          />
          <Input
            label="Miniatura personalizada (opcional)"
            value={form.thumbnailUrl ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))
            }
            placeholder="https://..."
            hint="Se vazio, usamos a capa automática do YouTube/Vimeo."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ordem"
              type="number"
              value={String(form.ordem)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  ordem: Number(e.target.value) || 0,
                }))
              }
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="accent-brand w-4 h-4"
                checked={form.ativo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ativo: e.target.checked }))
                }
              />
              Visível na home
            </label>
          </div>

          {previewThumb ? (
            <div className="w-36 sm:w-44 rounded-xl overflow-hidden border border-gray-100 aspect-video bg-gray-50">
              <img
                src={previewThumb}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              isLoading={saving}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
        isLoading={deleting}
        title="Excluir vídeo?"
        description="O link será removido do carrossel da página inicial."
        confirmLabel="Excluir"
      />
    </div>
  );
}
