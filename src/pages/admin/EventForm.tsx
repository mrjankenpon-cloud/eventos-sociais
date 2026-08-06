import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { eventService } from '../../services/event.service';
import { Event } from '../../types';
import { ROUTES } from '../../config';
import { PageHeader } from '../../components/admin/PageHeader';
import { Input, Textarea, Button, Alert, PageLoader } from '../../components/ui';

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Event>>({
    titulo: '',
    descricaoCurta: '',
    descricaoCompleta: '',
    data: '',
    horaInicio: '',
    horaFim: '',
    local: '',
    endereco: '',
    googleMaps: '',
    banner:
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069',
    galeria: [],
    valor: 0,
    gratuito: false,
    mostrarValor: true,
    vagas: 100,
    mostrarVagas: true,
    textoBotao: 'Garantir minha vaga',
    linkPagamento: '',
    publicado: false,
    eventoDestaque: false,
    permitirInscricao: true,
  });

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await eventService.getById(id);
        if (data) setFormData(data);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar o evento.');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  const update = <K extends keyof Event>(key: K, value: Event[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        valor: formData.gratuito ? 0 : formData.valor,
      };
      if (id) {
        await eventService.update(id, payload);
      } else {
        await eventService.create(payload as Omit<Event, 'id' | 'createdAt' | 'updatedAt'>);
      }
      navigate(ROUTES.ADMIN.EVENTS);
    } catch {
      setError('Erro ao salvar evento. Verifique os campos e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Carregando dados do evento..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 min-w-0">
      <PageHeader
        title={id ? 'Editar Evento' : 'Novo Evento'}
        subtitle={`Preencha as informações para ${id ? 'atualizar' : 'criar'} o seu evento.`}
        backTo={ROUTES.ADMIN.EVENTS}
        backLabel="Voltar para listagem"
      />

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Informações Gerais"
          subtitle="Identidade e conteúdo do evento"
        >
          <Input
            label="Título do Evento"
            required
            value={formData.titulo || ''}
            onChange={(e) => update('titulo', e.target.value)}
            placeholder="Ex: Almoço Beneficente 2024"
          />
          <Input
            label="Pequena descrição (Feed)"
            required
            value={formData.descricaoCurta || ''}
            onChange={(e) => update('descricaoCurta', e.target.value)}
            placeholder="Uma frase impactante para o card..."
          />
          <Textarea
            label="Descrição completa"
            required
            rows={8}
            value={formData.descricaoCompleta || ''}
            onChange={(e) => update('descricaoCompleta', e.target.value)}
            placeholder="Conte todos os detalhes do evento..."
          />
          <Input
            label="Banner (URL da Imagem)"
            required
            type="url"
            value={formData.banner || ''}
            onChange={(e) => update('banner', e.target.value)}
            className="font-mono text-xs"
          />
          {formData.banner && (
            <div className="relative rounded-2xl overflow-hidden border border-gray-100">
              <img
                src={formData.banner}
                alt="Preview do banner"
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </FormSection>

        <FormSection title="Data e Horário" subtitle="Quando o evento acontecerá">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Input
                label="Data"
                required
                type="date"
                value={formData.data || ''}
                onChange={(e) => update('data', e.target.value)}
              />
            </div>
            <Input
              label="Hora de início"
              required
              type="time"
              value={formData.horaInicio || ''}
              onChange={(e) => update('horaInicio', e.target.value)}
            />
            <Input
              label="Hora de término"
              required
              type="time"
              value={formData.horaFim || ''}
              onChange={(e) => update('horaFim', e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title="Local" subtitle="Onde os participantes devem ir">
          <Input
            label="Nome do Local"
            required
            value={formData.local || ''}
            onChange={(e) => update('local', e.target.value)}
            placeholder="Ex: Salão Paroquial"
          />
          <Input
            label="Endereço completo"
            required
            value={formData.endereco || ''}
            onChange={(e) => update('endereco', e.target.value)}
            placeholder="Rua, Número, Bairro, Cidade"
          />
          <Input
            label="Link Google Maps"
            type="url"
            value={formData.googleMaps || ''}
            onChange={(e) => update('googleMaps', e.target.value)}
            placeholder="https://maps.google.com/..."
            className="font-mono text-xs"
          />
        </FormSection>

        <FormSection title="Ingressos" subtitle="Valores e disponibilidade">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Valor do Ingresso (R$)"
              type="number"
              min={0}
              step="0.01"
              disabled={formData.gratuito}
              value={formData.gratuito ? 0 : formData.valor ?? 0}
              onChange={(e) => update('valor', Number(e.target.value))}
              hint={formData.gratuito ? 'Desabilitado para evento gratuito' : undefined}
            />
            <Input
              label="Quantidade de vagas"
              required
              type="number"
              min={1}
              value={formData.vagas ?? 100}
              onChange={(e) => update('vagas', Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              id="gratuito"
              checked={Boolean(formData.gratuito)}
              onChange={(e) => update('gratuito', e.target.checked)}
              className="w-5 h-5 rounded accent-brand"
            />
            <span className="text-sm font-bold text-gray-700">
              Evento Gratuito (ignora o valor acima)
            </span>
          </label>
        </FormSection>

        <FormSection title="Configurações" subtitle="Visibilidade e ações">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ToggleCard
              title="Publicado"
              description="Visível no site"
              checked={Boolean(formData.publicado)}
              onChange={(v) => update('publicado', v)}
              activeClass="bg-brand-muted border-brand/20"
            />
            <ToggleCard
              title="Destaque"
              description="Banner principal"
              checked={Boolean(formData.eventoDestaque)}
              onChange={(v) => update('eventoDestaque', v)}
              activeClass="bg-yellow-50 border-yellow-100"
            />
          </div>
          <Input
            label="Texto do Botão de Inscrição"
            value={formData.textoBotao || ''}
            onChange={(e) => update('textoBotao', e.target.value)}
          />
          <Input
            label="Link de Pagamento Externo (Opcional)"
            type="url"
            value={formData.linkPagamento || ''}
            onChange={(e) => update('linkPagamento', e.target.value)}
            placeholder="https://pagseguro.uol.com.br/..."
            className="font-mono text-xs"
          />
        </FormSection>

        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md md:static md:border-0 md:bg-transparent md:backdrop-blur-none">
          <div className="max-w-3xl mx-auto p-4 md:p-0 md:pt-2">
            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="w-full h-14 sm:h-16 rounded-2xl text-base sm:text-lg"
            >
              <Save size={22} aria-hidden="true" />
              {isSubmitting ? 'Salvando...' : 'Finalizar e Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormSection({
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

function ToggleCard({
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
      className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
        checked ? activeClass : 'bg-gray-50 border-gray-100'
      }`}
    >
      <div className="space-y-0.5 pr-3">
        <span className="text-sm font-black uppercase tracking-tight block">
          {title}
        </span>
        <p className="text-[10px] font-bold text-gray-400">{description}</p>
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
