import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Ticket } from 'lucide-react';
import { checkoutApi, type GuestTicketsResult } from '../../services/checkout.api';
import { Button, Alert, PageLoader, Badge } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { ROUTES } from '../../config';

/**
 * Acesso guest via link do e-mail (?t=token).
 * Somente leitura — sem Auth.
 */
export default function MyTickets() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GuestTicketsResult | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setError('Link incompleto. Solicite um novo acesso por e-mail.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await checkoutApi.getGuestTickets(token);
      setData(result);
      setError(null);
    } catch (err) {
      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Link inválido ou expirado.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <PageLoader label="Carregando seus ingressos..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container py-20">
        <EmptyState
          title="Acesso indisponível"
          description={
            error ||
            'Este link pode ter expirado. Solicite um novo envio por e-mail.'
          }
          action={
            <Link to={ROUTES.PUBLIC.ORDER_LOOKUP}>
              <Button>Receber novos ingressos por e-mail</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const hasTickets = data.orders.some((o) => o.tickets.length > 0);

  return (
    <div className="py-12 min-h-[60vh] bg-surface-muted">
      <div className="page-container max-w-lg space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Home
        </Link>

        <div className="card-surface p-6 sm:p-8 space-y-2">
          <h1 className="text-2xl font-black text-gray-900">Meus ingressos</h1>
          <p className="text-sm text-gray-500">
            Acesso seguro para <span className="font-bold">{data.email}</span>
          </p>
          <p className="text-xs text-gray-400">Somente visualização — sem login.</p>
        </div>

        {!hasTickets ? (
          <Alert variant="info">
            Não há ingressos válidos para exibir neste momento (pedidos
            pendentes ou cancelados).
          </Alert>
        ) : null}

        {data.orders.map((order) => (
          <section key={order.id} className="card-surface p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">
                  {order.eventoTitulo || 'Evento'}
                </p>
                <p className="text-sm text-gray-500">
                  {order.ingressoNome}
                  {order.quantidade
                    ? ` · ${order.quantidade} ingresso(s)`
                    : ''}
                </p>
                <p className="text-xs text-gray-400 mt-1 tabular-nums">
                  {typeof order.valorTotal === 'number'
                    ? order.valorTotal === 0
                      ? 'Gratuito'
                      : formatCurrency(Number(order.valorTotal))
                    : null}
                </p>
              </div>
              <Badge
                variant={
                  order.status === 'confirmado'
                    ? 'success'
                    : order.status === 'pendente'
                      ? 'warning'
                      : 'danger'
                }
              >
                {String(order.status)}
              </Badge>
            </div>

            {order.tickets.length === 0 ? (
              <p className="text-sm text-gray-400">
                {order.status === 'pendente'
                  ? 'Aguardando confirmação do pagamento.'
                  : 'Sem tickets ativos neste pedido.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {order.tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="label-micro flex items-center gap-1">
                        <Ticket size={12} aria-hidden="true" />
                        Ticket {String(t.ordem).padStart(3, '0')}
                      </p>
                      <p className="font-mono font-black text-gray-900 truncate">
                        {t.codigo}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.status}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-xl shrink-0"
                      onClick={() => void copyCode(t.codigo)}
                    >
                      <Copy size={14} aria-hidden="true" />
                      {copied ? 'OK' : 'Copiar'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="text-center text-sm">
          <Link
            to={ROUTES.PUBLIC.ORDER_LOOKUP}
            className="text-brand font-bold hover:underline"
          >
            Solicitar novo link por e-mail
          </Link>
        </p>
      </div>
    </div>
  );
}
