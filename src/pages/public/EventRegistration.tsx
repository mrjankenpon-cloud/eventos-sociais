import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  User,
  Mail,
  Hash,
  Phone,
  Ticket,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import type { Event, TicketType } from '../../types';
import { Input, CPFInput, PhoneInput, Button, Alert, PageLoader } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { validateEmail } from '../../lib/validation';
import { formatCurrency, formatEventDate, cn } from '../../lib/utils';
import {
  formatTicketValue,
  getActiveTicketTypes,
  getTicketStatus,
} from '../../lib/eventData';
import { DB_KEYS, subscribeDb } from '../../lib/persist';
import { THEME } from '../../theme';

export default function EventRegistration() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nomeError, setNomeError] = useState<string | undefined>();
  const [ticketTypeId, setTicketTypeId] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    quantidadeIngressos: 1,
    termosAceitos: false,
  });

  const [fieldValidity, setFieldValidity] = useState({
    nome: false,
    cpf: false,
    telefone: false,
    email: false,
    quantidadeIngressos: true,
    termosAceitos: false,
    ticketType: false,
  });

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await eventService.getById(id);
      setEvent(data ?? null);
      if (data) {
        const active = getActiveTicketTypes(data).filter((t) => getTicketStatus(t).available);
        setTicketTypeId((prev) => {
          if (prev && active.some((t) => t.id === prev)) return prev;
          const next = active[0]?.id ?? '';
          setFieldValidity((v) => ({ ...v, ticketType: Boolean(next) }));
          return next;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    return subscribeDb(DB_KEYS.events, () => {
      void loadEvent();
    });
  }, [loadEvent]);

  const activeTickets = useMemo(
    () => (event ? getActiveTicketTypes(event) : []),
    [event]
  );

  const selectedTicket: TicketType | undefined = useMemo(
    () => activeTickets.find((t) => t.id === ticketTypeId),
    [activeTickets, ticketTypeId]
  );

  const isFormValid =
    Object.values(fieldValidity).every(Boolean) && Boolean(selectedTicket);

  const missingHints = useMemo(() => {
    const hints: string[] = [];
    if (!fieldValidity.ticketType) hints.push('tipo de ingresso');
    if (!fieldValidity.nome) hints.push('nome completo');
    if (!fieldValidity.cpf) hints.push('CPF válido');
    if (!fieldValidity.telefone) hints.push('telefone');
    if (!fieldValidity.email) hints.push('e-mail');
    if (!fieldValidity.quantidadeIngressos) hints.push('quantidade');
    if (!fieldValidity.termosAceitos) hints.push('aceite dos termos');
    return hints;
  }, [fieldValidity]);

  const total = useMemo(() => {
    if (!selectedTicket) return 0;
    return selectedTicket.valor * formData.quantidadeIngressos;
  }, [selectedTicket, formData.quantidadeIngressos]);

  const maxQty = selectedTicket
    ? Math.min(10, Math.max(1, selectedTicket.quantidade))
    : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !isFormValid || !selectedTicket) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await purchaseService.create({
        eventId: event.id,
        ticketTypeId: selectedTicket.id,
        ticketTypeNome: selectedTicket.nome,
        compradorNome: formData.nome.trim(),
        compradorCPF: formData.cpf,
        compradorTelefone: formData.telefone,
        compradorEmail: formData.email.trim(),
        quantidadeIngressos: formData.quantidadeIngressos,
        valorTotal: total,
        linkPagamento: event.linkPagamento,
      });

      setSubmitted(true);

      if (event.linkPagamento) {
        window.setTimeout(() => {
          window.location.href = event.linkPagamento;
        }, 3000);
      }
    } catch {
      setSubmitError('Não foi possível concluir a inscrição. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <PageLoader label="Carregando inscrição..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-container py-20">
        <EmptyState
          title="Evento não encontrado"
          description="Não foi possível abrir a inscrição para este evento."
          action={
            <Link to="/">
              <Button>Voltar à home</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-16 sm:py-24 min-h-[60vh] bg-surface-muted flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
          className="card-surface p-8 sm:p-12 max-w-lg w-full text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle2 className="w-14 h-14 text-green-500" aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
            Inscrição realizada!
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed text-sm sm:text-base">
            Seus dados foram registrados com sucesso.
            {event.linkPagamento
              ? ' Você será redirecionado para o pagamento em instantes.'
              : ' Em breve você receberá um e-mail com as instruções.'}
          </p>

          {event.linkPagamento && (
            <a
              href={event.linkPagamento}
              className="inline-flex items-center gap-2 bg-brand text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-dark transition-all"
            >
              Ir para Pagamento
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
            </a>
          )}

          <div className="mt-8">
            <Link
              to="/"
              className="text-gray-400 hover:text-brand font-bold transition-colors text-sm"
            >
              Voltar para a Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-32 min-h-[60vh] bg-surface-muted">
      <div className="page-container max-w-3xl pt-8 sm:pt-12">
        <Link
          to={`/evento/${event.id}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand mb-6 transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Voltar para o evento
        </Link>

        <div className="card-surface overflow-hidden">
          <div className="bg-brand p-6 sm:p-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-black mb-2">Inscrição</h1>
            <p className="opacity-90 text-sm sm:text-base">{event.titulo}</p>
            {event.subtitulo?.trim() ? (
              <p className="mt-1 text-white/70 text-sm">{event.subtitulo}</p>
            ) : null}
            <p className="mt-3 text-white/70 text-xs font-bold uppercase tracking-wider">
              {formatEventDate(event.data)} · {event.horaInicio}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 md:p-10 space-y-6" noValidate>
            {submitError && (
              <Alert variant="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}

            <div className="space-y-3">
              <p className="label-micro">Tipo de ingresso</p>
              {activeTickets.length === 0 ? (
                <Alert variant="error">
                  Nenhum tipo de ingresso disponível para este evento.
                </Alert>
              ) : (
                <ul className="space-y-2">
                  {activeTickets.map((type) => {
                    const status = getTicketStatus(type);
                    const descricao = type.descricao?.trim();
                    const selected = ticketTypeId === type.id;
                    return (
                      <li key={type.id}>
                        <button
                          type="button"
                          disabled={!status.available}
                          onClick={() => {
                            setTicketTypeId(type.id);
                            setFieldValidity((prev) => ({ ...prev, ticketType: true }));
                            if (formData.quantidadeIngressos > type.quantidade) {
                              setFormData((prev) => ({
                                ...prev,
                                quantidadeIngressos: Math.max(1, type.quantidade),
                              }));
                            }
                          }}
                          className={cn(
                            'w-full text-left rounded-2xl border p-4 transition-all',
                            selected
                              ? 'border-brand bg-brand-muted/40 ring-2 ring-brand/20'
                              : 'border-gray-100 bg-white hover:border-brand/30',
                            !status.available && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-black text-gray-900">{type.nome}</p>
                              {descricao ? (
                                <p className="text-sm text-gray-500 mt-1">{descricao}</p>
                              ) : null}
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-2">
                                {status.label} · {type.quantidade} disponíveis
                              </p>
                            </div>
                            <p className="font-black text-brand tabular-nums shrink-0">
                              {formatTicketValue(type)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <Input
                label="Nome Completo"
                icon={<User size={18} />}
                placeholder="Seu nome completo"
                value={formData.nome}
                isValid={fieldValidity.nome}
                error={nomeError}
                onChange={(e) => {
                  const val = e.target.value;
                  const valid = val.trim().length > 3;
                  setFormData((prev) => ({ ...prev, nome: val }));
                  setFieldValidity((prev) => ({ ...prev, nome: valid }));
                  setNomeError(
                    val.length > 0 && !valid
                      ? 'Informe o nome completo (mín. 4 caracteres).'
                      : undefined
                  );
                }}
                autoComplete="name"
              />

              <CPFInput
                label="CPF"
                icon={<Hash size={18} />}
                value={formData.cpf}
                onChange={(val, isValid) => {
                  setFormData((prev) => ({ ...prev, cpf: val }));
                  setFieldValidity((prev) => ({ ...prev, cpf: isValid }));
                }}
              />

              <PhoneInput
                label="Telefone Celular"
                icon={<Phone size={18} />}
                value={formData.telefone}
                onChange={(val, isValid) => {
                  setFormData((prev) => ({ ...prev, telefone: val }));
                  setFieldValidity((prev) => ({ ...prev, telefone: isValid }));
                }}
              />

              <Input
                label="E-mail"
                type="email"
                icon={<Mail size={18} />}
                placeholder="seu@email.com"
                value={formData.email}
                isValid={fieldValidity.email}
                error={
                  formData.email.length > 0 && !validateEmail(formData.email)
                    ? 'Informe um e-mail válido.'
                    : undefined
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, email: val }));
                  setFieldValidity((prev) => ({
                    ...prev,
                    email: validateEmail(val),
                  }));
                }}
                autoComplete="email"
              />

              <Input
                label="Quantidade de Ingressos"
                type="number"
                min={1}
                max={maxQty}
                icon={<Ticket size={18} />}
                value={formData.quantidadeIngressos}
                isValid={fieldValidity.quantidadeIngressos}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData((prev) => ({ ...prev, quantidadeIngressos: val }));
                  setFieldValidity((prev) => ({
                    ...prev,
                    quantidadeIngressos: val >= 1 && val <= maxQty,
                  }));
                }}
              />
            </div>

            {selectedTicket && (
              <div className="rounded-2xl bg-brand-muted/60 border border-brand/10 px-5 py-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-gray-600">{selectedTicket.nome}</span>
                  <span className="text-sm text-gray-500 tabular-nums">
                    {formatTicketValue(selectedTicket)} × {formData.quantidadeIngressos}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="label-micro text-brand">Total</span>
                  <span className="text-xl font-black text-brand tabular-nums">
                    {total === 0 ? 'Gratuito' : formatCurrency(total)}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`flex items-start gap-3 p-4 rounded-2xl transition-all border ${
                formData.termosAceitos
                  ? 'bg-green-50 border-green-100'
                  : 'bg-gray-50 border-transparent'
              }`}
            >
              <input
                required
                type="checkbox"
                id="terms"
                checked={formData.termosAceitos}
                onChange={(e) => {
                  const val = e.target.checked;
                  setFormData((prev) => ({ ...prev, termosAceitos: val }));
                  setFieldValidity((prev) => ({ ...prev, termosAceitos: val }));
                }}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 font-medium leading-relaxed">
                Aceito os termos e condições do evento e concordo com a política de
                privacidade.
              </label>
            </div>

            {!isFormValid && (
              <p className="text-[11px] text-gray-400 font-medium text-center">
                Preencha: {missingHints.join(', ')}.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              disabled={!isFormValid}
              className="w-full h-14 sm:h-16 rounded-2xl text-lg"
            >
              {isSubmitting ? 'Processando...' : event.textoBotao || 'Confirmar Inscrição'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
