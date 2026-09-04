import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { checkoutApi, type OrderReceiptResult } from '../../services/checkout.api';
import {
  persistGuestCheckoutSession,
  readGuestCheckoutToken,
} from '../../lib/guestCheckout';
import { Button, Alert, Badge, ProcessingOverlay } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { TicketPassList } from '../../components/public/TicketPass';
import { DeliveryKeepCopyCard } from '../../components/public/DeliveryKeepCopyCard';
import { PixCheckoutPanel } from '../../components/public/PixCheckoutPanel';
import { PaymentThankYou } from '../../components/public/PaymentThankYou';
import { formatCurrency } from '../../lib/utils';
import { explainMpRejection, readMpReturn } from '../../lib/mpReturn';
import {
  cardCooldownRemainingSec,
  formatCooldownHint,
  recordCardRejection,
  shouldPreferPixAfterCardRisk,
} from '../../lib/checkoutAttemptGuard';
import { CARD_CHECKOUT_ENABLED } from '../../components/public/PaymentMethodPicker';
import { THEME } from '../../theme';
import { ROUTES } from '../../config';

export default function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const mpReturn = readMpReturn(searchParams);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OrderReceiptResult | null>(null);
  const [sandboxApproving, setSandboxApproving] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const resolveToken = useCallback(() => {
    if (tokenFromUrl) return tokenFromUrl;
    if (id) return readGuestCheckoutToken(id);
    return '';
  }, [tokenFromUrl, id]);

  const load = useCallback(async () => {
    if (!id) {
      setError('Pedido inválido.');
      setLoading(false);
      return;
    }
    const token = resolveToken();
    if (!token) {
      setReceipt(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const data = await checkoutApi.getReceipt(id, {
        token,
        paymentId: mpReturn.paymentId || undefined,
      });
      setReceipt(data);
      setError(null);
      persistGuestCheckoutSession(id, token);
      if (!tokenFromUrl) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('token', token);
            return next;
          },
          { replace: true }
        );
      }
    } catch (err) {
      setReceipt(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o pedido.'
      );
    } finally {
      setLoading(false);
    }
  }, [id, resolveToken, setSearchParams, tokenFromUrl, mpReturn.paymentId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!receipt) return;
    const pedido = receipt.pedido;
    const status = pedido.status;
    const isPending = status === 'pendente';
    const isCancelled = status === 'cancelado';
    const rejected =
      (mpReturn.failed || String(pedido.mpStatus || '') === 'rejected') &&
      (isPending || isCancelled);
    if (!rejected || !pedido.eventoId || !pedido.cpf) return;
    const detail = String(
      mpReturn.statusDetail || pedido.mpStatusDetail || ''
    ).toLowerCase();
    if (
      !detail.includes('high_risk') &&
      !detail.includes('blacklist') &&
      !detail.includes('cc_rejected')
    ) {
      return;
    }
    recordCardRejection(
      String(pedido.eventoId),
      String(pedido.cpf),
      detail
    );
  }, [receipt, mpReturn.failed, mpReturn.statusDetail]);

  useEffect(() => {
    if (!receipt) return;
    const status = receipt.pedido.status;
    const waitingPayment = status === 'pendente';
    const waitingTickets =
      status === 'confirmado' &&
      receipt.pedido.tipo !== 'doacao' &&
      receipt.tickets.length === 0;
    const waitingEmailMeta =
      status === 'confirmado' &&
      receipt.pedido.emailDelivery == null &&
      String(receipt.pedido.email || '').includes('@');
    if (!waitingPayment && !waitingTickets && !waitingEmailMeta) return;

    const ms = waitingPayment
      ? mpReturn.fromMp
        ? 2000
        : 4000
      : 2500;
    const t = window.setInterval(() => {
      void load();
    }, ms);
    return () => window.clearInterval(t);
  }, [receipt, load, mpReturn.fromMp]);

  const handleSandboxApprove = async () => {
    if (!id) return;
    const token = resolveToken();
    if (!token) return;
    setSandboxApproving(true);
    setSandboxError(null);
    try {
      await checkoutApi.sandboxApprove(id, token);
      await load();
    } catch (err) {
      setSandboxError(
        err instanceof Error ? err.message : 'Falha ao simular aprovação.'
      );
    } finally {
      setSandboxApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] relative">
        <ProcessingOverlay
          open
          label="Processando"
          detail="Carregando seu pedido..."
        />
      </div>
    );
  }

  if (!receipt && !resolveToken()) {
    return (
      <div className="page-container py-16 max-w-md text-center space-y-4">
        <h1 className="text-2xl font-black text-gray-900">
          Acesse seus ingressos por e-mail
        </h1>
        <p className="text-sm text-gray-600">
          Compras são feitas sem cadastro. Solicite um link seguro no e-mail da
          compra para ver seus QR Codes.
        </p>
        <Link to={ROUTES.PUBLIC.ORDER_LOOKUP}>
          <Button className="rounded-2xl w-full">
            Já comprou? Receber ingressos por e-mail
          </Button>
        </Link>
        <Link to="/" className="block text-sm text-gray-400 hover:text-brand">
          Voltar à home
        </Link>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="page-container py-20">
        <EmptyState
          title="Pedido não encontrado"
          description={
            error ||
            'Use o link do e-mail ou solicite um novo acesso.'
          }
          action={
            <Link to={ROUTES.PUBLIC.ORDER_LOOKUP}>
              <Button>Receber ingressos por e-mail</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { pedido, tickets } = receipt;
  const status = pedido.status;
  const isConfirmed = status === 'confirmado';
  const isPending = status === 'pendente';
  const isFailed =
    status === 'cancelado' || status === 'expirado' || status === 'reembolsado';
  const showPaidThanks = isConfirmed;
  const cardRejected =
    (mpReturn.failed || String(pedido.mpStatus || '') === 'rejected') &&
    (isPending || status === 'cancelado');
  const rejectionDetail =
    mpReturn.statusDetail || pedido.mpStatusDetail || undefined;
  const rejectionHint = explainMpRejection(rejectionDetail);
  const isHighRisk =
    String(rejectionDetail || '')
      .toLowerCase()
      .includes('high_risk') ||
    String(rejectionDetail || '')
      .toLowerCase()
      .includes('blacklist');

  const preferPix =
    Boolean(pedido.eventoId && pedido.cpf) &&
    shouldPreferPixAfterCardRisk(
      String(pedido.eventoId || ''),
      String(pedido.cpf || '')
    );
  const cooldownSec = cardCooldownRemainingSec(
    String(pedido.eventoId || ''),
    String(pedido.cpf || '')
  );
  const cooldownHint = formatCooldownHint(cooldownSec);

  return (
    <div className="py-12 sm:py-20 min-h-[60vh] bg-surface-muted">
      <div className="page-container-readable">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand mb-6 transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Voltar para a Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: THEME.motion.duration, ease: THEME.motion.ease }}
          className="card-surface p-6 sm:p-8 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div
                className={`p-4 rounded-full ${
                  showPaidThanks
                    ? 'bg-green-100'
                    : cardRejected
                      ? 'bg-red-100'
                    : isPending
                      ? 'bg-amber-100'
                      : 'bg-red-100'
                }`}
              >
                {showPaidThanks ? (
                  <CheckCircle2
                    className="w-12 h-12 text-green-500"
                    aria-hidden="true"
                  />
                ) : cardRejected ? (
                  <XCircle className="w-12 h-12 text-red-500" aria-hidden="true" />
                ) : isPending ? (
                  <Clock className="w-12 h-12 text-amber-500" aria-hidden="true" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-500" aria-hidden="true" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {showPaidThanks
                ? 'Pagamento confirmado'
                : cardRejected
                  ? 'Pagamento recusado'
                : isPending
                  ? mpReturn.fromMp || mpReturn.approved
                    ? 'Confirmando seu pagamento'
                    : 'Aguardando pagamento'
                  : status === 'expirado'
                    ? 'Pedido expirado'
                    : status === 'reembolsado'
                      ? 'Pedido reembolsado'
                      : 'Pedido cancelado'}
            </h1>
            <PaymentThankYou
              kind="ingresso"
              nome={pedido.nomeComprador}
              confirmed={isConfirmed}
              fromMp={mpReturn.fromMp}
              mpApproved={mpReturn.approved}
            />
            <p className="text-sm text-gray-600">
              {pedido.eventoTitulo || 'Evento'}
              {pedido.ingressoNome ? ` · ${pedido.ingressoNome}` : ''}
            </p>
            <Badge
              variant={
                showPaidThanks ? 'success' : isPending ? 'warning' : 'danger'
              }
            >
              {showPaidThanks && isPending ? 'confirmando' : status}
            </Badge>
          </div>

          {cardRejected && (
            <div className="space-y-3">
              <Alert variant="error">
                {rejectionHint ||
                  'Não foi possível aprovar este pagamento. Tente PIX, outro cartão ou aguarde alguns minutos.'}
                {preferPix
                  ? ' Recomendamos concluir com PIX após as tentativas recentes.'
                  : ` ${cooldownHint}`}
              </Alert>
              <div className="flex flex-col sm:flex-row gap-2 print:hidden">
                {pedido.eventoId ? (
                  <Link
                    to={`/evento/${pedido.eventoId}/inscricao?metodo=pix`}
                    className="flex-1"
                  >
                    <Button className="w-full rounded-2xl">Pagar com Pix</Button>
                  </Link>
                ) : null}
                {!preferPix && pedido.eventoId && CARD_CHECKOUT_ENABLED ? (
                  <Link
                    to={`/evento/${pedido.eventoId}/inscricao?metodo=checkout_pro`}
                    className="flex-1"
                  >
                    <Button
                      variant="secondary"
                      className="w-full rounded-2xl"
                    >
                      Tentar com outro cartão
                    </Button>
                  </Link>
                ) : null}
                <Link to="/" className="flex-1">
                  <Button variant="secondary" className="w-full rounded-2xl">
                    Tentar novamente mais tarde
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {isPending && !showPaidThanks && !cardRejected && (
            <Alert variant="info">
              {pedido.pixQrCode
                ? 'Pague o PIX abaixo. Após a confirmação, os ingressos aparecem aqui e no e-mail.'
                : 'Após a confirmação do Mercado Pago, você também receberá um e-mail com link seguro para os ingressos (quando o Resend estiver ativo).'}
            </Alert>
          )}

          {isPending && (pedido.pixQrCode || pedido.pixQrCodeBase64) ? (
            <PixCheckoutPanel
              amount={pedido.valorTotal}
              qrCode={pedido.pixQrCode}
              qrCodeBase64={pedido.pixQrCodeBase64}
              ticketUrl={pedido.pixTicketUrl}
              expiresAt={pedido.pixExpiresAt || pedido.reservaExpiraEm}
              hint="Abra o app do banco, escaneie o QR ou cole o código. Os ingressos são emitidos automaticamente após a confirmação."
            />
          ) : null}

          {/* Após high_risk, não reabrir o mesmo checkout — evita tentativas idênticas em sequência. */}
          {isPending &&
          !showPaidThanks &&
          !cardRejected &&
          !isHighRisk &&
          !pedido.pixQrCode &&
          pedido.linkPagamento ? (
            <a href={pedido.linkPagamento} className="block print:hidden">
              <Button className="w-full rounded-2xl">
                Continuar pagamento no Mercado Pago
              </Button>
            </a>
          ) : null}

          {isPending && receipt.sandbox && (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 font-medium">
                Modo sandbox: se o botão Pagar do Mercado Pago ficar cinza, use
                a simulação abaixo para concluir o pedido e emitir ingressos.
              </p>
              {sandboxError && (
                <Alert variant="error">{sandboxError}</Alert>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                {pedido.linkPagamento ? (
                  <a href={pedido.linkPagamento} className="flex-1">
                    <Button variant="secondary" className="w-full rounded-2xl">
                      Reabrir Mercado Pago
                    </Button>
                  </a>
                ) : null}
                <Button
                  className="flex-1 rounded-2xl"
                  isLoading={sandboxApproving}
                  onClick={() => void handleSandboxApprove()}
                >
                  Simular pagamento aprovado
                </Button>
              </div>
            </div>
          )}

          {isFailed && (
            <Alert variant="error">
              {status === 'expirado'
                ? 'O tempo de reserva expirou. Faça uma nova inscrição se ainda houver vagas.'
                : 'Este pedido não está mais ativo.'}
            </Alert>
          )}

          <div className="rounded-2xl bg-brand-muted/40 border border-brand/10 px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Comprador</span>
              <span className="font-bold text-gray-900">{pedido.nomeComprador}</span>
            </div>
            {pedido.itens && pedido.itens.length > 0
              ? pedido.itens.map((item) => (
                  <div
                    key={`${item.ingressoId}-${item.nome}`}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600">{item.nome}</span>
                    <span className="font-bold tabular-nums text-gray-900">
                      {item.quantidade}×{' '}
                      {item.valorUnitario === 0
                        ? 'Gratuito'
                        : formatCurrency(item.valorUnitario)}
                    </span>
                  </div>
                ))
              : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Quantidade</span>
                    <span className="font-bold tabular-nums">{pedido.quantidade}</span>
                  </div>
                )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-black text-brand tabular-nums">
                {pedido.valorTotal === 0
                  ? 'Gratuito'
                  : formatCurrency(pedido.valorTotal)}
              </span>
            </div>
          </div>

          {isConfirmed && tickets.length > 0 ? (
            <>
              <DeliveryKeepCopyCard
                kind="ingresso"
                emailMayDelay={pedido.emailDelivery === 'delayed'}
                onSavePdf={() => window.print()}
                canShare={typeof navigator !== 'undefined' && Boolean(navigator.share)}
                onShare={() => {
                  void navigator
                    .share?.({
                      title: pedido.eventoTitulo || 'Meus ingressos DELPHOS',
                      text: 'Meus ingressos DELPHOS — guarde este link ou o PDF salvo no aparelho.',
                      url: window.location.href,
                    })
                    .catch(() => {
                      /* usuário cancelou */
                    });
                }}
              />
              <TicketPassList
                tickets={tickets}
                evento={{
                  titulo: pedido.eventoTitulo,
                  data: pedido.eventoData,
                  horaInicio: pedido.eventoHoraInicio,
                  horaFim: pedido.eventoHoraFim,
                  local: pedido.eventoLocal,
                  endereco: pedido.eventoEndereco,
                  cidade: pedido.eventoCidade,
                }}
                comprador={{
                  nome: pedido.nomeComprador,
                  email: pedido.email,
                  telefone: pedido.telefone,
                  cpf: pedido.cpf,
                }}
              />
            </>
          ) : isConfirmed ? (
            <Alert variant="info">
              Pagamento confirmado. Ingressos sendo gerados…
            </Alert>
          ) : null}

          {isConfirmed ? (
            <Alert variant="success" className="print:hidden">
              Obrigado por participar. Guarde o PDF no aparelho ou imprima o
              ingresso. Depois você também pode recuperar os QR Codes em{' '}
              <Link
                to={ROUTES.PUBLIC.ORDER_LOOKUP}
                className="font-bold text-brand underline"
              >
                Já comprou? Receber por e-mail
              </Link>
              .
            </Alert>
          ) : null}

          {isPending ? (
            <Button
              className="w-full rounded-2xl"
              variant="secondary"
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              Atualizar status
            </Button>
          ) : null}

          <button
            type="button"
            className="w-full text-xs text-gray-400 hover:text-brand"
            onClick={() => navigate(ROUTES.PUBLIC.ORDER_LOOKUP)}
          >
            Já comprou? Receber ingressos por e-mail
          </button>
        </motion.div>
      </div>

      <ProcessingOverlay
        open={sandboxApproving}
        label="Processando"
        detail="Confirmando o pagamento de teste..."
      />
    </div>
  );
}
