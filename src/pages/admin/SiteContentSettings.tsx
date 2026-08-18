import { useCallback, useEffect, useState } from 'react';
import { Eye, RotateCcw, Save } from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { RichTextEditor } from '../../components/admin/RichTextEditor';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Alert, Button, PageLoader } from '../../components/ui';
import { siteContentService } from '../../services/firebase/siteContent';
import type { SiteContent, SiteContentPageKey } from '../../types';
import { DEFAULT_SITE_CONTENT } from '../../lib/siteContentDefaults';
import { cn } from '../../lib/utils';
import { ROUTES } from '../../config';

const TABS: { id: SiteContentPageKey; label: string; publicPath: string }[] = [
  { id: 'about', label: 'Sobre', publicPath: ROUTES.PUBLIC.ABOUT },
  { id: 'terms', label: 'Termo de Uso', publicPath: ROUTES.PUBLIC.TERMS },
  { id: 'privacy', label: 'Privacidade', publicPath: ROUTES.PUBLIC.PRIVACY },
  { id: 'donations', label: 'Doações', publicPath: ROUTES.PUBLIC.DONATIONS },
];

export default function SiteContentSettings() {
  const [tab, setTab] = useState<SiteContentPageKey>('about');
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDraft(await siteContentService.get());
      setDirty(false);
    } catch (err) {
      console.error('[SiteContentSettings.load]', err);
      setError('Não foi possível carregar o conteúdo das páginas.');
      setDraft(structuredClone(DEFAULT_SITE_CONTENT));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await siteContentService.save(draft);
      setDraft(saved);
      setDirty(false);
      setSuccess('Conteúdo publicado. As páginas do site já mostram o novo texto.');
    } catch (err) {
      console.error('[SiteContentSettings.save]', err);
      const detail = err instanceof Error ? err.message : '';
      setError(
        detail.toLowerCase().includes('permission')
          ? 'Sem permissão para salvar. Sua conta precisa ser administradora.'
          : `Não foi possível salvar.${detail ? ` (${detail})` : ''}`
      );
    } finally {
      setSaving(false);
    }
  };

  const resetCurrentTab = () => {
    setDraft((prev) => ({
      ...prev,
      [tab]: { html: DEFAULT_SITE_CONTENT[tab].html },
    }));
    setDirty(true);
    setConfirmReset(false);
  };

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conteúdo do site"
          subtitle="Edite as páginas Sobre, Termo de Uso, Privacidade e Doações."
        />
        <PageLoader label="Carregando conteúdo..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <PageHeader
        title="Conteúdo do site"
        subtitle="Escreva livremente, como em um editor de texto: formatação, links e imagens."
        actions={
          <div className="flex items-center gap-2">
            <a
              href={activeTab.publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border border-gray-200 text-gray-600 text-sm font-bold hover:border-brand hover:text-brand transition-colors"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              Ver página
            </a>
            <Button
              type="button"
              onClick={() => void handleSave()}
              isLoading={saving}
              className="rounded-2xl"
            >
              <Save className="w-4 h-4 mr-2" aria-hidden="true" />
              Publicar
            </Button>
          </div>
        }
      />

      {error ? (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Páginas" className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors',
                tab === item.id
                  ? 'bg-brand text-white'
                  : 'bg-gray-50 text-gray-500 hover:text-brand hover:bg-brand-muted'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {dirty ? (
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-600">
              Alterações não publicadas
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-brand transition-colors"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Restaurar texto original
          </button>
        </div>
      </div>

      {tab === 'donations' ? (
        <Alert variant="info">
          Os valores sugeridos, o mínimo da doação e o formulário PIX
          não são editáveis aqui. Este texto aparece acima do formulário.
        </Alert>
      ) : null}

      <RichTextEditor
        key={tab}
        label={`Conteúdo da página ${activeTab.label}`}
        value={draft[tab].html}
        onChange={(html) => {
          setDraft((prev) => ({ ...prev, [tab]: { html } }));
          setDirty(true);
        }}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void handleSave()}
          isLoading={saving}
          className="rounded-2xl"
        >
          <Save className="w-4 h-4 mr-2" aria-hidden="true" />
          Publicar alterações
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetCurrentTab}
        title={`Restaurar “${activeTab.label}”?`}
        description="O texto desta página volta ao conteúdo original do sistema. Você ainda precisa publicar para valer no site."
        confirmLabel="Restaurar"
        variant="primary"
      />
    </div>
  );
}
