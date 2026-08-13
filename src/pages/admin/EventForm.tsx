import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  Info,
  Ticket,
  Images,
  Handshake,
  HeartHandshake,
  Settings2,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { sponsorService } from '../../services/sponsor.service';
import { institutionService } from '../../services/institution.service';
import type { EventFormData, Institution, Sponsor } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { Input, Textarea, Button, Alert, PageLoader } from '../../components/ui';
import { GalleryManager } from '../../components/admin/event-form/GalleryManager';
import { TicketTypesEditor } from '../../components/admin/event-form/TicketTypesEditor';
import { EntityLinkPicker } from '../../components/admin/event-form/EntityLinkPicker';
import {
  createEmptyEventForm,
  EVENT_CATEGORIES,
  normalizeEvent,
  syncDerivedEventFields,
} from '../../lib/eventForm';
import { cn } from '../../lib/utils';
import { maskCEP } from '../../lib/validation';
import { typeCompetesForEventSeats } from '../../types/ingressoNatureza';

type TabId =
  | 'geral'
  | 'ingressos'
  | 'galeria'
  | 'patrocinadores'
  | 'instituicoes'
  | 'config';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'geral', label: 'Informações Gerais', icon: Info },
  { id: 'ingressos', label: 'Ingressos', icon: Ticket },
  { id: 'galeria', label: 'Galeria', icon: Images },
  { id: 'patrocinadores', label: 'Patrocinadores', icon: Handshake },
  { id: 'instituicoes', label: 'Instituições', icon: HeartHandshake },
  { id: 'config', label: 'Configurações', icon: Settings2 },
];

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('geral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<EventFormData>(createEmptyEventForm());
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    async function loadCatalogs() {
      setCatalogLoading(true);
      try {
        const [sp, inst] = await Promise.all([
          sponsorService.getAll(),
          institutionService.getAll(),
        ]);
        setSponsors(sp);
        setInstitutions(inst);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar patrocinadores/instituições.');
      } finally {
        setCatalogLoading(false);
      }
    }
    void loadCatalogs();
  }, []);

  useEffect(() => {
    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await eventService.getById(id);
        if (data) {
          const normalized = normalizeEvent(data);
          const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = normalized;
          setFormData(rest);
        } else {
          setError('Evento não encontrado.');
        }
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar o evento.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const update = useCallback(<K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
    setFormData((prev) => syncDerivedEventFields({ ...prev, [key]: value }));
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.titulo.trim()) errs.titulo = 'Informe o nome do evento.';
    if (!formData.data) errs.data = 'Informe a data.';
    if (!formData.horaInicio) errs.horaInicio = 'Informe o horário de início.';
    if (!formData.local.trim()) errs.local = 'Informe o local.';
    if (!formData.endereco.trim()) errs.endereco = 'Informe o endereço.';
    if (!formData.descricaoCurta.trim()) errs.descricaoCurta = 'Informe a descrição resumida.';
    if (!formData.descricaoCompleta.trim()) {
      errs.descricaoCompleta = 'Informe a descrição completa.';
    }
    if (!formData.imagens.length) errs.imagens = 'Envie ao menos uma imagem (capa).';

    const ativos = formData.tiposIngresso.filter((t) => t.ativo);
    const temCompetindo = ativos.some((t) => typeCompetesForEventSeats(t));
    if (temCompetindo && (!formData.vagas || formData.vagas < 1)) {
      errs.vagas = 'Informe as vagas do evento (salão).';
    }
    if (ativos.length === 0) {
      errs.tiposIngresso = 'Ative ao menos um tipo de ingresso.';
    } else {
      for (const t of ativos) {
        if (!t.nome.trim()) errs.tiposIngresso = 'Informe o nome de cada tipo ativo.';
        if (t.valor < 0) errs.tiposIngresso = `Valor inválido em ${t.nome || 'ingresso'}.`;
        if (t.quantidade < 0 || !Number.isFinite(t.quantidade)) {
          errs.tiposIngresso = `Quantidade inválida em ${t.nome || 'ingresso'}.`;
        }
        if (!typeCompetesForEventSeats(t) && t.quantidade < 1) {
          errs.tiposIngresso = `Informe a cota isolada de ${t.nome || 'ingresso'}.`;
        }
      }
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.titulo || errs.data || errs.local || errs.descricaoCurta || errs.descricaoCompleta) {
        setTab('geral');
      } else if (errs.tiposIngresso || errs.vagas) setTab('ingressos');
      else if (errs.imagens) setTab('galeria');
      setError('Revise os campos obrigatórios destacados.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = syncDerivedEventFields(formData);
      if (id) {
        await eventService.update(id, payload);
      } else {
        await eventService.create(payload);
      }
      navigate(ROUTES.ADMIN.EVENTS);
    } catch {
      setError('Erro ao salvar evento. Verifique os campos e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTicketsSummary = useMemo(() => {
    const ativos = formData.tiposIngresso.filter((t) => t.ativo);
    const isoladas = ativos
      .filter((t) => !typeCompetesForEventSeats(t))
      .reduce((s, t) => s + (t.quantidade || 0), 0);
    const extra = isoladas > 0 ? ` · ${isoladas} em cota isolada` : '';
    return `${ativos.length} tipo(s) · ${formData.vagas || 0} vagas do evento${extra}`;
  }, [formData.tiposIngresso, formData.vagas]);

  if (loading) return <PageLoader label="Carregando dados do evento..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 min-w-0">
      <PageHeader
        title={id ? 'Editar Evento' : 'Novo Evento'}
        subtitle="Gerencie todas as informações do evento em um só lugar."
        backTo={ROUTES.ADMIN.EVENTS}
        backLabel="Voltar para listagem"
      />

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors',
              tab === tabId
                ? 'bg-brand text-white shadow-lg shadow-brand/20'
                : 'bg-white text-gray-500 border border-gray-100 hover:border-brand/30'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {tab === 'geral' && (
          <SectionCard
            title="Dados do evento"
            subtitle="Identidade, local e conteúdo"
          >
            <Input
              label="Nome do evento"
              required
              value={formData.titulo}
              error={fieldErrors.titulo}
              onChange={(e) => update('titulo', e.target.value)}
              placeholder="Ex: Jantar Beneficente de Gala"
            />
            <Input
              label="Subtítulo"
              value={formData.subtitulo}
              onChange={(e) => update('subtitulo', e.target.value)}
              placeholder="Frase de apoio curta"
            />
            <div className="space-y-1.5">
              <label htmlFor="categoria" className="label-micro ml-1 block">
                Categoria
              </label>
              <select
                id="categoria"
                value={formData.categoria}
                onChange={(e) => update('categoria', e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                <option value="">Selecione...</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Data"
                type="date"
                required
                value={formData.data}
                error={fieldErrors.data}
                onChange={(e) => update('data', e.target.value)}
              />
              <Input
                label="Horário início"
                type="time"
                required
                value={formData.horaInicio}
                error={fieldErrors.horaInicio}
                onChange={(e) => update('horaInicio', e.target.value)}
              />
              <Input
                label="Horário término"
                type="time"
                value={formData.horaFim}
                onChange={(e) => update('horaFim', e.target.value)}
              />
            </div>

            <Input
              label="Local"
              required
              value={formData.local}
              error={fieldErrors.local}
              onChange={(e) => update('local', e.target.value)}
              placeholder="Ex: Palácio das Artes"
            />
            <Input
              label="Endereço completo"
              required
              value={formData.endereco}
              error={fieldErrors.endereco}
              onChange={(e) => update('endereco', e.target.value)}
              placeholder="Rua, número, bairro"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cidade"
                value={formData.cidade}
                onChange={(e) => update('cidade', e.target.value)}
                placeholder="São Paulo - SP"
              />
              <Input
                label="CEP"
                value={formData.cep}
                onChange={(e) => update('cep', maskCEP(e.target.value))}
                placeholder="00000-000"
                inputMode="numeric"
                maxLength={9}
              />
            </div>
            <Input
              label="Link do Google Maps"
              type="url"
              value={formData.googleMaps || ''}
              onChange={(e) => update('googleMaps', e.target.value)}
              placeholder="https://maps.google.com/..."
              className="font-mono text-xs"
            />
            <Input
              label="Descrição resumida"
              required
              value={formData.descricaoCurta}
              error={fieldErrors.descricaoCurta}
              onChange={(e) => update('descricaoCurta', e.target.value)}
              placeholder="Texto curto para cards e listagens"
            />
            <Textarea
              label="Descrição completa"
              required
              rows={8}
              value={formData.descricaoCompleta}
              error={fieldErrors.descricaoCompleta}
              onChange={(e) => update('descricaoCompleta', e.target.value)}
              placeholder="Detalhes completos do evento..."
            />
            <Textarea
              label="Regulamento (opcional)"
              rows={5}
              value={formData.regulamento}
              onChange={(e) => update('regulamento', e.target.value)}
              placeholder="Regras, restrições e orientações aos participantes"
            />
          </SectionCard>
        )}

        {tab === 'ingressos' && (
          <SectionCard
            title="Tipos de Ingresso"
            subtitle={activeTicketsSummary}
          >
            {fieldErrors.tiposIngresso && (
              <Alert variant="error">{fieldErrors.tiposIngresso}</Alert>
            )}
            <Input
              label="Vagas do evento (salão)"
              type="number"
              min={0}
              step={1}
              required
              value={formData.vagas || ''}
              error={fieldErrors.vagas}
              onChange={(e) =>
                update(
                  'vagas',
                  Math.max(0, Math.floor(Number(e.target.value) || 0))
                )
              }
              hint="Lugares de quem entra para sentar/comer. Inteira e meia disputam este total, salvo cota isolada."
            />
            <TicketTypesEditor
              types={formData.tiposIngresso}
              eventVagas={formData.vagas || 0}
              onChange={(tiposIngresso) => update('tiposIngresso', tiposIngresso)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <Input
                label="Texto do botão de inscrição"
                value={formData.textoBotao}
                onChange={(e) => update('textoBotao', e.target.value)}
              />
              <Input
                label="Link de pagamento externo"
                type="url"
                value={formData.linkPagamento}
                onChange={(e) => update('linkPagamento', e.target.value)}
                placeholder="https://"
                className="font-mono text-xs"
              />
            </div>
          </SectionCard>
        )}

        {tab === 'galeria' && (
          <SectionCard
            title="Galeria do Evento"
            subtitle="Capa e imagens adicionais"
          >
            {fieldErrors.imagens && (
              <Alert variant="error">{fieldErrors.imagens}</Alert>
            )}
            <GalleryManager
              images={formData.imagens}
              onChange={(imagens) => update('imagens', imagens)}
            />
          </SectionCard>
        )}

        {tab === 'patrocinadores' && (
          <SectionCard
            title="Patrocinadores"
            subtitle="Vincule empresas já cadastradas no módulo Patrocinadores"
          >
            <Toggle
              title="Exibir patrocinadores neste evento"
              description="Mostra a seção de patrocinadores na página pública"
              checked={formData.exibirPatrocinadores}
              onChange={(v) => update('exibirPatrocinadores', v)}
              activeClass="bg-brand-muted border-brand/20"
            />
            <EntityLinkPicker
              title="Selecione um ou vários patrocinadores. Arraste para reordenar."
              emptyLabel="Nenhum patrocinador vinculado a este evento."
              catalog={sponsors.map((s) => ({
                id: s.id,
                nome: s.nome,
                logo: s.logo,
                ativo: s.ativo,
                subtitle: s.site || undefined,
              }))}
              links={formData.patrocinadoresVinculados}
              onChange={(patrocinadoresVinculados) =>
                update('patrocinadoresVinculados', patrocinadoresVinculados)
              }
              catalogLoading={catalogLoading}
            />
          </SectionCard>
        )}

        {tab === 'instituicoes' && (
          <SectionCard
            title="Instituições Beneficiadas"
            subtitle="Vincule instituições já cadastradas no módulo Instituições"
          >
            <Toggle
              title="Exibir instituições neste evento"
              description="Mostra a seção institucional na página pública"
              checked={formData.exibirInstituicoes}
              onChange={(v) => update('exibirInstituicoes', v)}
              activeClass="bg-brand-muted border-brand/20"
            />
            <EntityLinkPicker
              title="Selecione uma ou várias instituições. Arraste para reordenar."
              emptyLabel="Nenhuma instituição vinculada a este evento."
              catalog={institutions.map((i) => ({
                id: i.id,
                nome: i.nome,
                logo: i.logo,
                ativo: i.ativo,
                subtitle: [i.cidade, i.estado].filter(Boolean).join(' · ') || undefined,
              }))}
              links={formData.instituicoesVinculadas}
              onChange={(instituicoesVinculadas) =>
                update('instituicoesVinculadas', instituicoesVinculadas)
              }
              catalogLoading={catalogLoading}
            />
          </SectionCard>
        )}

        {tab === 'config' && (
          <SectionCard
            title="Configurações"
            subtitle="Visibilidade e comportamento"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                title="Evento publicado"
                description="Visível no site público"
                checked={formData.publicado}
                onChange={(v) => update('publicado', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Evento em destaque"
                description="Aparece nos banners principais"
                checked={formData.eventoDestaque}
                onChange={(v) => update('eventoDestaque', v)}
                activeClass="bg-yellow-50 border-yellow-100"
              />
              <Toggle
                title="Permitir compra online"
                description="Habilita inscrição/pagamento"
                checked={formData.permitirCompraOnline}
                onChange={(v) => {
                  update('permitirCompraOnline', v);
                  update('permitirInscricao', v);
                }}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Permitir retirada gratuita"
                description="Habilita modalidade retirada"
                checked={formData.permitirRetiradaGratuita}
                onChange={(v) => update('permitirRetiradaGratuita', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Exibir patrocinadores"
                description="Mostra logos na página do evento"
                checked={formData.exibirPatrocinadores}
                onChange={(v) => update('exibirPatrocinadores', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Exibir instituições"
                description="Mostra instituições beneficiadas"
                checked={formData.exibirInstituicoes}
                onChange={(v) => update('exibirInstituicoes', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Exibir mapa"
                description="Mostra link do Google Maps"
                checked={formData.exibirMapa}
                onChange={(v) => update('exibirMapa', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Exibir galeria de imagens"
                description="Mostra galeria na página pública"
                checked={formData.exibirGaleria}
                onChange={(v) => update('exibirGaleria', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
              <Toggle
                title="Exibir quantidade disponível"
                description="Mostra vagas/quantidade de ingressos na área pública"
                checked={formData.mostrarVagas}
                onChange={(v) => update('mostrarVagas', v)}
                activeClass="bg-brand-muted border-brand/20"
              />
            </div>
          </SectionCard>
        )}

        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md md:static md:border-0 md:bg-transparent md:backdrop-blur-none">
          <div className="max-w-4xl mx-auto p-4 md:p-0 md:pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl sm:flex-1"
              onClick={() => navigate(ROUTES.ADMIN.EVENTS)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="w-full sm:flex-[2] h-14 rounded-2xl text-base"
            >
              <Save size={20} aria-hidden="true" />
              {isSubmitting ? 'Salvando...' : 'Salvar evento'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface p-6 sm:p-8 space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
          {title}
        </h2>
        <p className="label-micro">{subtitle}</p>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
  activeClass,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  activeClass: string;
}) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer',
        checked ? activeClass : 'bg-gray-50 border-gray-100'
      )}
    >
      <div className="min-w-0 pr-2">
        <span className="text-sm font-black uppercase tracking-tight block">
          {title}
        </span>
        <p className="text-[10px] font-bold text-gray-400 mt-0.5">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-brand shrink-0"
      />
    </label>
  );
}
