import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Hash,
  Phone,
  Minus,
  Plus,
} from 'lucide-react';
import { eventService } from '../../services/event.service';
import { purchaseService } from '../../services/purchase.service';
import { persistGuestCheckoutSession } from '../../lib/guestCheckout';
import type { Event, TicketType } from '../../types';
import { Input, CPFInput, PhoneInput, Button, Alert, ProcessingOverlay } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { validateEmail } from '../../lib/validation';
import { formatCurrency, formatEventDate, cn } from '../../lib/utils';
import {
  formatTicketValue,
  getActiveTicketTypes,
  getTicketAvailableQty,
  getTicketStatus,
} from '../../lib/eventData';
import {
  getEventDisplayStatus,
  isEventPastEnd,
} from '../../lib/eventDisplayStatus';
import { prefetchOrderSuccess } from '../../lib/prefetchPublic';
import { useSeoOverride } from '../../components/public/PublicSeo';
import { TicketTypeInfo } from '../../components/public/TicketTypeInfo';
import {
  PaymentMethodPicker,
  CARD_CHECKOUT_ENABLED,
  type CheckoutMetodo,
} from '../../components/public/PaymentMethodPicker';
import { ensureMpSecurityScript } from '../../lib/mpDeviceId';
import {
  cardCooldownRemainingSec,
  formatCooldownHint,
  shouldPreferPixAfterCardRisk,
} from '../../lib/checkoutAttemptGuard';
function maxQtyForType(
  type: TicketType,
  eventLimit: number,
  event: Event
): number {
  const available = getTicketAvailableQty(type, event);
  const typeLimit =
    typeof type.limitePorCompra === 'number' && type.limitePorCompra > 0
      ? type.limitePorCompra
      : eventLimit;
  return Math.max(0, Math.min(available, typeLimit, eventLimit));
}

export default function EventRegistration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nomeError, setNomeError] = useState<string | undefined>();
  const metodoFromUrl = searchParams.get('metodo');
  const [metodo, setMetodo] = useState<CheckoutMetodo>('pix');
  /** Quantidade por tipo de ingresso (começa em 0). */
  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const submitLock = useRef(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    termosAceitos: false,
  });

  const [fieldValidity, setFieldValidity] = useState({
    nome: false,
    cpf: false,
    telefone: false,
    email: false,
    termosAceitos: false,
  });

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await eventService.getById(id);
      if (data && (data.status === 'arquivado' || data.arquivado)) {
        setEvent(null);
        return;
      }
      setEvent(data ?? null);
      if (data) {
        const active = getActiveTicketTypes(data);
        setQtyByType((prev) => {
          const next: Record<string, number> = {};
          for (const t of active) {
            next[t.id] = typeof prev[t.id] === 'number' ? prev[t.id] : 0;
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    ensureMpSecurityScript('checkout');
  }, []);

  useEffect(() => {
    if (metodoFromUrl === 'pix') {
      setMetodo('pix');
    }
    // Cartão temporariamente desativado — ignora ?metodo=checkout_pro
  }, [metodoFromUrl]);

  useEffect(() => {
    void prefetchOrderSuccess();
  }, []);

  useSeoOverride({
    title: event
      ? `Inscrição: ${event.titulo}`
      : 'Inscrição em evento beneficente',
    description: event
      ? `Inscreva-se no evento beneficente ${event.titulo}, do Instituto Delphos.`
      : 'Inscrição em evento beneficente do Instituto Delphos.',
    noIndex: true,
  });

  const activeTickets = useMemo(
    () => (event ? getActiveTicketTypes(event) : []),
    [event]
  );

  const eventLimit = useMemo(() => {
    if (!event) return 10;
    return event.limitePorCompra && event.limitePorCompra > 0
      ? event.limitePorCompra
      : 10;
  }, [event]);

  const cartLines = useMemo(() => {
    return activeTickets
      .map((type) => ({
        type,
        quantidade: Math.max(0, Math.floor(qtyByType[type.id] || 0)),
      }))
      .filter((line) => line.quantidade > 0);
  }, [activeTickets, qtyByType]);

  const totalQty = useMemo(
    () => cartLines.reduce((s, l) => s + l.quantidade, 0),
    [cartLines]
  );

  const total = useMemo(
    () =>
      cartLines.reduce((s, l) => s + l.type.valor * l.quantidade, 0),
    [cartLines]
  );

  const hasTickets = totalQty >= 1;
  const qtyWithinEventLimit = totalQty <= eventLimit;

  const isFormValid =
    Object.values(fieldValidity).every(Boolean) &&
    hasTickets &&
    qtyWithinEventLimit &&
    activeTickets.length > 0;

  const missingHints = useMemo(() => {
    const hints: string[] = [];
    if (!hasTickets) hints.push('quantidade de ingresso (ao menos 1)');
    if (hasTickets && !qtyWithinEventLimit) {
      hints.push(`máximo de ${eventLimit} ingressos por compra`);
    }
    if (!fieldValidity.nome) hints.push('nome completo');
    if (!fieldValidity.cpf) hints.push('CPF válido');
    if (!fieldValidity.telefone) hints.push('telefone');
    if (!fieldValidity.email) hints.push('e-mail');
    if (!fieldValidity.termosAceitos) hints.push('aceite dos termos');
    return hints;
  }, [fieldValidity, hasTickets, qtyWithinEventLimit, eventLimit]);

  const setTypeQty = (typeId: string, next: number) => {
    const type = activeTickets.find((t) => t.id === typeId);
    if (!type) return;
    const max = event ? maxQtyForType(type, eventLimit, event) : 0;
    const clamped = Math.max(0, Math.min(max, Math.floor(next)));

    setQtyByType((prev) => {
      const draft = { ...prev, [typeId]: clamped };
      const sumOthers = activeTickets
        .filter((t) => t.id !== typeId)
        .reduce((s, t) => s + Math.max(0, draft[t.id] || 0), 0);
      const room = Math.max(0, eventLimit - sumOthers);
      draft[typeId] = Math.min(clamped, room, max);
      return draft;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !isFormValid || cartLines.length === 0) return;
    if (isSubmitting || submitLock.current) return;
    if (getEventDisplayStatus(event).kind !== 'disponivel') {
      setSubmitError(
        isEventPastEnd(event)
          ? 'Este evento já encerrou.'
          : 'Inscrições indisponíveis para este evento.'
      );
      return;
    }

    const metodoEfetivo: CheckoutMetodo =
      CARD_CHECKOUT_ENABLED && metodo === 'checkout_pro'
        ? 'checkout_pro'
        : 'pix';

    const cpfDigits = formData.cpf.replace(/\D/g, '');
    if (total > 0 && metodoEfetivo === 'checkout_pro') {
      const remain = cardCooldownRemainingSec(event.id, cpfDigits);
      if (remain > 0) {
        setSubmitError(
          `Não foi possível iniciar outro pagamento com cartão agora. ${formatCooldownHint(remain)} Prefira PIX.`
        );
        setMetodo('pix');
        return;
      }
      if (shouldPreferPixAfterCardRisk(event.id, cpfDigits)) {
        setSubmitError(
          'Houve recusas recentes com cartão. Use PIX para concluir com mais segurança, ou aguarde alguns minutos.'
        );
        setMetodo('pix');
        return;
      }
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const itens = cartLines.map((l) => ({
        ingressoId: l.type.id,
        quantidade: l.quantidade,
      }));
      const result = await purchaseService.create({
        eventId: event.id,
        ticketTypeId: itens[0].ingressoId,
        ticketTypeNome: cartLines
          .map((l) =>
            l.quantidade > 1 ? `${l.type.nome} ×${l.quantidade}` : l.type.nome
          )
          .join(' · '),
        compradorNome: formData.nome.trim(),
        compradorCPF: formData.cpf,
        compradorTelefone: formData.telefone,
        compradorEmail: formData.email.trim(),
        quantidadeIngressos: totalQty,
        valorTotal: total,
        itens,
        metodo: total === 0 ? undefined : metodoEfetivo,
      });

      persistGuestCheckoutSession(result.id, result.accessToken);

      if (result.gratuito || result.pix || !result.initPoint) {
        navigate(
          `/pedido/${result.id}/sucesso?token=${encodeURIComponent(result.accessToken)}`
        );
        return;
      }

      window.location.href = result.initPoint;
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir a inscrição. Tente novamente.'
      );
      submitLock.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] relative">
        <ProcessingOverlay
          open
          label="Processando"
          detail="Preparando a inscrição..."
        />
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

  if (isEventPastEnd(event) || getEventDisplayStatus(event).kind === 'encerrado') {
    return (
      <div className="page-container py-20">
        <EmptyState
          title="Inscrições encerradas"
          description="Este evento já encerrou. Não é mais possível se inscrever."
          action={
            <Link to={`/evento/${event.id}`}>
              <Button>Voltar para o evento</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (getEventDisplayStatus(event).kind !== 'disponivel') {
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

  return (
    <div className="pb-8 sm:pb-12 lg:pb-16 min-h-[50vh] bg-surface-muted">
      <div className="page-container-readable pt-6 sm:pt-10 lg:pt-14">
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

          <form onSubmit={handleSubmit} className="p-4 sm:p-8 md:p-10 lg:p-12 space-y-6" noValidate>
            {submitError && (
              <Alert variant="error" onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 sm:gap-3">
                <p className="label-micro">Ingressos</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Até {eventLimit} por compra
                  {event.limitePorCpf && event.limitePorCpf > 0
                    ? ` · até ${event.limitePorCpf} por CPF`
                    : ''}
                </p>
              </div>
              {activeTickets.length === 0 ? (
                <Alert variant="error">
                  Nenhum tipo de ingresso disponível para este evento.
                </Alert>
              ) : (
                <ul className="space-y-2">
                  {activeTickets.map((type) => {
                    const status = getTicketStatus(type, event);
                    const qty = qtyByType[type.id] || 0;
                    const max = event ? maxQtyForType(type, eventLimit, event) : 0;
                    const selected = qty > 0;
                    const canIncrease =
                      status.available && qty < max && totalQty < eventLimit;

                    return (
                      <li key={type.id}>
                        <div
                          className={cn(
                            'w-full rounded-2xl border p-3 sm:p-4 transition-all min-w-0',
                            selected
                              ? 'border-brand bg-brand-muted/40 ring-2 ring-brand/20'
                              : 'border-gray-100 bg-white',
                            !status.available && 'opacity-50'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="font-black text-gray-900 truncate">
                                  {type.nome}
                                </p>
                                <TicketTypeInfo
                                  ticketKey={type.key}
                                  descricao={type.descricao}
                                  nome={type.nome}
                                />
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-2">
                                {status.label}
                                {event.mostrarVagas
                                  ? ` · ${getTicketAvailableQty(type, event)} disponíveis`
                                  : null}
                              </p>
                            </div>
                            <p className="font-black text-brand tabular-nums shrink-0">
                              {formatTicketValue(type)}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                              Quantidade
                            </span>
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Diminuir ${type.nome}`}
                                disabled={!status.available || qty <= 0}
                                onClick={() => setTypeQty(type.id, qty - 1)}
                                className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:border-brand hover:text-brand transition-colors"
                              >
                                <Minus className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <span
                                className="w-10 text-center text-lg font-black tabular-nums text-gray-900"
                                aria-live="polite"
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                aria-label={`Aumentar ${type.nome}`}
                                disabled={!canIncrease}
                                onClick={() => setTypeQty(type.id, qty + 1)}
                                className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:border-brand hover:text-brand transition-colors"
                              >
                                <Plus className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </div>
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
                label="Telefone"
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
            </div>

            {cartLines.length > 0 && (
              <div className="rounded-2xl bg-brand-muted/60 border border-brand/10 px-5 py-4 space-y-2">
                {cartLines.map((line) => (
                  <div
                    key={line.type.id}
                    className="flex items-center justify-between gap-3 min-w-0"
                  >
                    <span className="text-sm font-bold text-gray-600 min-w-0 truncate">
                      {line.type.nome}
                    </span>
                    <span className="text-sm text-gray-500 tabular-nums">
                      {formatTicketValue(line.type)} × {line.quantidade}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-brand/10">
                  <span className="label-micro text-brand">Total</span>
                  <span className="text-xl font-black text-brand tabular-nums">
                    {total === 0 ? 'Gratuito' : formatCurrency(total)}
                  </span>
                </div>
              </div>
            )}

            {cartLines.length > 0 && total > 0 ? (
              <PaymentMethodPicker value={metodo} onChange={setMetodo} />
            ) : null}

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
              disabled={!isFormValid || isSubmitting || cartLines.length === 0}
              className="w-full h-14 sm:h-16 rounded-2xl text-lg"
            >
              {isSubmitting
                ? 'Processando...'
                : total === 0
                  ? event.textoBotao || 'Confirmar Inscrição'
                  : !CARD_CHECKOUT_ENABLED || metodo === 'pix'
                    ? `Pagar ${formatCurrency(total)} via PIX`
                    : `Pagar ${formatCurrency(total)} com cartão`}
            </Button>
          </form>
        </div>
      </div>

      <ProcessingOverlay
        open={isSubmitting}
        label="Processando"
        detail="Reservando ingressos e preparando o pagamento..."
      />
    </div>
  );
}
