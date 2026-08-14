import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { Alert, Button, Input, PageLoader, Textarea } from '../../components/ui';
import { siteContentService } from '../../services/firebase/siteContent';
import type {
  AboutSiteContent,
  DonationsSiteContent,
  LegalSiteContent,
  SiteContent,
  SiteContentSection,
} from '../../types/models/siteContent';
import {
  bulletsFromTextarea,
  bulletsToTextarea,
  paragraphsFromTextarea,
  paragraphsToTextarea,
} from '../../lib/siteContent';
import { DEFAULT_SITE_CONTENT } from '../../lib/siteContentDefaults';
import { cn } from '../../lib/utils';

type TabId = 'about' | 'terms' | 'privacy' | 'donations';

const TABS: { id: TabId; label: string }[] = [
  { id: 'about', label: 'Sobre' },
  { id: 'terms', label: 'Termo de Uso' },
  { id: 'privacy', label: 'Privacidade' },
  { id: 'donations', label: 'Doações' },
];

export default function SiteContentSettings() {
  const [tab, setTab] = useState<TabId>('about');
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await siteContentService.get();
      setDraft(data);
    } catch {
      setError(
        'Não foi possível carregar o conteúdo. Verifique se sua conta é administradora.'
      );
      setDraft(structuredClone(DEFAULT_SITE_CONTENT));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await siteContentService.save(draft);
      setDraft(saved);
      setSuccess('Conteúdo salvo. As páginas públicas já refletem as alterações.');
    } catch {
      setError(
        'Não foi possível salvar. Apenas administradores podem alterar estas páginas.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conteúdo do site"
          subtitle="Textos das páginas Sobre, Termo de Uso, Privacidade e Doações."
        />
        <PageLoader label="Carregando conteúdo..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Conteúdo do site"
        subtitle="Altere os textos das páginas públicas. Dados institucionais (CNPJ, endereço) continuam fixos no sistema."
        actions={
          <Button
            type="button"
            onClick={() => void handleSave()}
            isLoading={saving}
            className="rounded-2xl"
          >
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            Salvar
          </Button>
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

      <div
        role="tablist"
        aria-label="Páginas"
        className="flex flex-wrap gap-2 border-b border-gray-100 pb-3"
      >
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

      <p className="text-xs text-gray-400 leading-relaxed">
        Dica: use <code className="font-mono text-gray-500">**texto**</code> para
        negrito. Placeholders disponíveis:{' '}
        <code className="font-mono text-gray-500">
          {'{{razaoSocial}} {{cnpj}} {{endereco}} {{email}} {{site}} {{dataAbertura}} {{shortBrand}}'}
        </code>
        .
      </p>

      {tab === 'about' ? (
        <AboutEditor
          value={draft.about}
          onChange={(about) => setDraft((prev) => ({ ...prev, about }))}
        />
      ) : null}
      {tab === 'terms' ? (
        <LegalEditor
          value={draft.terms}
          onChange={(terms) => setDraft((prev) => ({ ...prev, terms }))}
        />
      ) : null}
      {tab === 'privacy' ? (
        <LegalEditor
          value={draft.privacy}
          onChange={(privacy) => setDraft((prev) => ({ ...prev, privacy }))}
        />
      ) : null}
      {tab === 'donations' ? (
        <DonationsEditor
          value={draft.donations}
          onChange={(donations) => setDraft((prev) => ({ ...prev, donations }))}
        />
      ) : null}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={() => void handleSave()}
          isLoading={saving}
          className="rounded-2xl"
        >
          <Save className="w-4 h-4 mr-2" aria-hidden="true" />
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function AboutEditor({
  value,
  onChange,
}: {
  value: AboutSiteContent;
  onChange: (next: AboutSiteContent) => void;
}) {
  const patch = (partial: Partial<AboutSiteContent>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="space-y-5 card-surface p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Título da página"
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <Input
          label="Subtítulo"
          value={value.subtitle}
          onChange={(e) => patch({ subtitle: e.target.value })}
        />
      </div>

      <Input
        label="Título da introdução"
        value={value.introTitle}
        onChange={(e) => patch({ introTitle: e.target.value })}
      />
      <Textarea
        label="Parágrafos da introdução (separe com linha em branco)"
        value={paragraphsToTextarea(value.introParagraphs)}
        onChange={(e) =>
          patch({ introParagraphs: paragraphsFromTextarea(e.target.value) })
        }
        className="min-h-[160px]"
      />

      <Input
        label="Título “O que fazemos”"
        value={value.whatWeDoTitle}
        onChange={(e) => patch({ whatWeDoTitle: e.target.value })}
      />
      <Textarea
        label="Itens (um por linha)"
        value={bulletsToTextarea(value.whatWeDoBullets)}
        onChange={(e) =>
          patch({ whatWeDoBullets: bulletsFromTextarea(e.target.value) })
        }
        className="min-h-[140px]"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Título dos parceiros"
          value={value.partnersTitle}
          onChange={(e) => patch({ partnersTitle: e.target.value })}
        />
        <Input
          label="Texto do link de doações"
          value={value.ctaLinkText}
          onChange={(e) => patch({ ctaLinkText: e.target.value })}
        />
      </div>
      <Textarea
        label="Introdução dos parceiros"
        value={value.partnersIntro}
        onChange={(e) => patch({ partnersIntro: e.target.value })}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Texto antes do link de doações"
          value={value.ctaBeforeLink}
          onChange={(e) => patch({ ctaBeforeLink: e.target.value })}
        />
        <Input
          label="Texto depois do link"
          value={value.ctaAfterLink}
          onChange={(e) => patch({ ctaAfterLink: e.target.value })}
        />
      </div>
    </div>
  );
}

function LegalEditor({
  value,
  onChange,
}: {
  value: LegalSiteContent;
  onChange: (next: LegalSiteContent) => void;
}) {
  const patch = (partial: Partial<LegalSiteContent>) =>
    onChange({ ...value, ...partial });

  const updateSection = (index: number, next: SiteContentSection) => {
    const sections = value.sections.map((s, i) => (i === index ? next : s));
    patch({ sections });
  };

  const removeSection = (index: number) => {
    patch({ sections: value.sections.filter((_, i) => i !== index) });
  };

  const addSection = () => {
    patch({
      sections: [
        ...value.sections,
        { title: `${value.sections.length + 1}. Nova seção`, paragraphs: [''], bullets: [] },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="card-surface p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Título da página"
            value={value.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <Input
            label="Subtítulo"
            value={value.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
          />
        </div>
        <Textarea
          label="Introdução"
          value={value.intro}
          onChange={(e) => patch({ intro: e.target.value })}
        />
      </div>

      {value.sections.map((section, index) => (
        <div key={index} className="card-surface p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <Input
              label={`Seção ${index + 1} — título`}
              value={section.title}
              onChange={(e) =>
                updateSection(index, { ...section, title: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => removeSection(index)}
              className="mt-7 shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label={`Remover seção ${index + 1}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
          <Textarea
            label="Parágrafos (separe com linha em branco)"
            value={paragraphsToTextarea(section.paragraphs)}
            onChange={(e) =>
              updateSection(index, {
                ...section,
                paragraphs: paragraphsFromTextarea(e.target.value),
              })
            }
          />
          <Textarea
            label="Itens de lista (opcional, um por linha)"
            value={bulletsToTextarea(section.bullets ?? [])}
            onChange={(e) =>
              updateSection(index, {
                ...section,
                bullets: bulletsFromTextarea(e.target.value),
              })
            }
          />
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addSection} className="rounded-2xl">
        <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
        Adicionar seção
      </Button>
    </div>
  );
}

function DonationsEditor({
  value,
  onChange,
}: {
  value: DonationsSiteContent;
  onChange: (next: DonationsSiteContent) => void;
}) {
  const patch = (partial: Partial<DonationsSiteContent>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="space-y-5 card-surface p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Título da página"
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <Input
          label="Subtítulo"
          value={value.subtitle}
          onChange={(e) => patch({ subtitle: e.target.value })}
        />
      </div>
      <Textarea
        label="Introdução"
        value={value.intro}
        onChange={(e) => patch({ intro: e.target.value })}
      />
      <Input
        label="Título da seção de Imposto de Renda"
        value={value.irTitle}
        onChange={(e) => patch({ irTitle: e.target.value })}
      />
      <Textarea
        label="Parágrafos sobre IR (separe com linha em branco)"
        value={paragraphsToTextarea(value.irParagraphs)}
        onChange={(e) =>
          patch({ irParagraphs: paragraphsFromTextarea(e.target.value) })
        }
        className="min-h-[220px]"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Antes do link do termo"
          value={value.aceiteBeforeLink}
          onChange={(e) => patch({ aceiteBeforeLink: e.target.value })}
        />
        <Input
          label="Texto do link"
          value={value.aceiteLinkText}
          onChange={(e) => patch({ aceiteLinkText: e.target.value })}
        />
        <Input
          label="Depois do link"
          value={value.aceiteAfterLink}
          onChange={(e) => patch({ aceiteAfterLink: e.target.value })}
        />
      </div>
      <p className="text-xs text-gray-400">
        O formulário de doação (valores, campos e pagamento) não é editável aqui.
      </p>
    </div>
  );
}
