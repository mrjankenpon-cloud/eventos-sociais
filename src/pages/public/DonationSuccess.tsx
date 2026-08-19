import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Printer, XCircle } from 'lucide-react';
import { checkoutApi, type OrderReceiptResult } from '../../services/checkout.api';
import {
  persistGuestCheckoutSession,
  readGuestCheckoutToken,
} from '../../lib/guestCheckout';
import { DonationCertificate } from '../../components/public/DonationCertificate';
import { PixCheckoutPanel } from '../../components/public/PixCheckoutPanel';
import { PaymentThankYou } from '../../components/public/PaymentThankYou';
import { donationCertificateNumber } from '../../lib/orgInfo';
import { Alert, Button, ProcessingOverlay } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { explainMpRejection, readMpReturn } from '../../lib/mpReturn';
import { ROUTES } from '../../config';

export default function DonationSuccess() {
  const { id } = useParams();
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
      setError('Doação inválida.');
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
      const data = await checkoutApi.getReceipt(id, { token });
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
        err instanceof Error ? err.message : 'Não foi possível carregar a doação.'
      );
    } finally {
      setLoading(false);
    }
  }, [id, resolveToken, setSearchParams, tokenFromUrl]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!receipt || receipt.pedido.status !== 'pendente') return;
    const t = window.setInterval(() => void load(), mpReturn.fromMp ? 2000 : 4000);
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
          detail="Carregando sua doação..."
        />
      </div>
    );
  }

  if (!receipt && !resolveToken()) {
    return (
      <div className="page-container py-16 max-w-md">
        <EmptyState
          title="Acesse o certificado pelo e-mail"
          description="Após o pagamento, enviamos o certificado para o e-mail informado. Se ainda não doou, use a página de doações."
          action={
            <Link to={ROUTES.PUBLIC.DONATIONS}>
              <Button>Fazer uma doação</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="page-container py-20">
        <EmptyState
          title="Doação não encontrada"
          description={error || 'Use o link do e-mail ou inicie uma nova doação.'}
          action={
            <Link to={ROUTES.PUBLIC.DONATIONS}>
              <Button>Voltar às doações</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { pedido } = receipt;
  const status = pedido.status;
  const isConfirmed = status === 'confirmado';
  const isPending = status === 'pendente';
  const showPaidThanks =
    isConfirmed || (mpReturn.fromMp && mpReturn.approved && isPending);
  const cardRejected = mpReturn.failed && !showPaidThanks;
  const rejectionHint = explainMpRejection(mpReturn.statusDetail);
  const numero =
    pedido.certificadoNumero ||
    donationCertificateNumber(pedido.id, pedido.dataCompra || new Date().toISOString());

  return (
    <div className="py-12 sm:py-16 min-h-[60vh] bg-surface-muted print:bg-white print:py-0">
      <div className="page-container-readable">
        <Link
          to={ROUTES.PUBLIC.DONATIONS}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand mb-6 transition-colors font-bold text-sm print:hidden"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Voltar às doações
        </Link>

        <div className="text-center space-y-3 mb-8 print:hidden">
          <div className="flex justify-center">
            <div
              className={`p-4 rounded-full ${
                showPaidThanks
                  ? 'bg-green-100'
                  : isPending
                    ? 'bg-amber-100'
                    : 'bg-red-100'
              }`}
            >
              {showPaidThanks ? (
                <CheckCircle2 className="w-12 h-12 text-green-500" aria-hidden="true" />
              ) : isPending ? (
                <Clock className="w-12 h-12 text-amber-500" aria-hidden="true" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500" aria-hidden="true" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900">
            {showPaidThanks
              ? 'Doação confirmada'
              : cardRejected
                ? 'Pagamento recusado'
              : isPending
                ? mpReturn.fromMp
                  ? 'Confirmando sua doação'
                  : 'Aguardando pagamento'
                : 'Doação não concluída'}
          </h1>
          <PaymentThankYou
            kind="doacao"
            nome={pedido.nomeComprador}
            confirmed={isConfirmed}
            fromMp={mpReturn.fromMp}
            mpApproved={mpReturn.approved}
          />
          {!showPaidThanks ? (
            <p className="text-sm text-gray-600">
              {cardRejected
                ? rejectionHint ||
                  'O cartão foi recusado. Tente PIX ou outro cartão na página de doações.'
                : isPending
                ? pedido.pixQrCode
                  ? 'Pague o PIX abaixo. Quando o Mercado Pago confirmar, o certificado aparece aqui e no seu e-mail.'
                  : 'Conclua o pagamento no Mercado Pago. Quando confirmar, o certificado aparece aqui e no seu e-mail.'
                : 'Esta doação não está ativa. Você pode tentar novamente.'}
            </p>
          ) : null}
        </div>

        {isPending && receipt.sandbox ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 print:hidden">
            <p className="text-sm text-amber-900 font-medium">
              Modo sandbox: se o pagamento de teste não concluir, simule a
              aprovação abaixo.
            </p>
            {sandboxError ? <Alert variant="error">{sandboxError}</Alert> : null}
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
        ) : null}

        {isConfirmed ? (
          <>
            <DonationCertificate
              data={{
                numero,
                doadorNome: pedido.nomeComprador,
                documento: pedido.cpf,
                documentoTipo: pedido.documentoTipo,
                email: pedido.email,
                valor: pedido.valorTotal,
                dataIso: pedido.dataCompra || new Date().toISOString(),
                mensagem: pedido.mensagemDoador,
              }}
            />
            <div className="mt-6 flex flex-col sm:flex-row gap-3 print:hidden">
              <Button
                className="flex-1 rounded-2xl"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
                Imprimir certificado
              </Button>
              <Link to={ROUTES.PUBLIC.HOME} className="flex-1">
                <Button variant="secondary" className="w-full rounded-2xl">
                  Voltar à home
                </Button>
              </Link>
            </div>
          </>
        ) : isPending ? (
          <>
            {pedido.pixQrCode || pedido.pixQrCodeBase64 ? (
              <PixCheckoutPanel
                kind="doacao"
                amount={pedido.valorTotal}
                qrCode={pedido.pixQrCode}
                qrCodeBase64={pedido.pixQrCodeBase64}
                ticketUrl={pedido.pixTicketUrl}
                expiresAt={pedido.pixExpiresAt || pedido.reservaExpiraEm}
              />
            ) : pedido.linkPagamento && !showPaidThanks ? (
              <a href={pedido.linkPagamento} className="block mb-6 print:hidden">
                <Button className="w-full rounded-2xl">
                  Continuar pagamento no Mercado Pago
                </Button>
              </a>
            ) : (
              <p className="text-sm text-gray-500 text-center mb-6 print:hidden">
                Aguardando confirmação do pagamento. Atualize a página em
                instantes.
              </p>
            )}
            <Button
              className="w-full rounded-2xl print:hidden"
              variant="secondary"
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              Atualizar status
            </Button>
          </>
        ) : (
          <Link to={ROUTES.PUBLIC.DONATIONS} className="print:hidden">
            <Button className="w-full rounded-2xl">Tentar outra doação</Button>
          </Link>
        )}
      </div>

      <ProcessingOverlay
        open={sandboxApproving}
        label="Processando"
        detail="Confirmando a doação de teste..."
      />
    </div>
  );
}
