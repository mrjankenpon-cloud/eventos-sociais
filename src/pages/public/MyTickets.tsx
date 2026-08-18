import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { checkoutApi, type GuestTicketsResult } from '../../services/checkout.api';
import { Button, Alert, PageLoader, Badge } from '../../components/ui';
import { EmptyState } from '../../components/ui/EmptyState';
import { TicketPassList } from '../../components/public/TicketPass';
import { formatCurrency } from '../../lib/utils';
import { ROUTES } from '../../config';

/**
 * Acesso guest via link do e-mail (?t=token).
 * Somente leitura — sem Auth. Exibe QR para check-in/impressão.
 */
export default function MyTickets() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GuestTicketsResult | null>(null);

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
    <div className="py-10 sm:py-14 lg:py-16 min-h-[60vh] bg-surface-muted">
      <div className="page-container-readable space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-brand font-bold text-sm print:hidden"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          Home
        </Link>

        <div className="card-surface p-6 sm:p-8 space-y-2 print:hidden">
          <h1 className="text-2xl font-black text-gray-900">Meus ingressos</h1>
          <p className="text-sm text-gray-500">
            Acesso seguro para <span className="font-bold">{data.email}</span>
          </p>
          <p className="text-xs text-gray-400">
            QR Code para check-in no dia do evento — sem login.
          </p>
        </div>

        {!hasTickets ? (
          <Alert variant="info">
            Não há ingressos válidos para exibir neste momento (pedidos
            pendentes ou cancelados).
          </Alert>
        ) : null}

        {data.orders.map((order) => (
          <section key={order.id} className="space-y-4">
            <div className="card-surface p-5 space-y-3 print:hidden">
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
            </div>

            {order.tickets.length === 0 ? (
              <p className="text-sm text-gray-400 print:hidden">
                {order.status === 'pendente'
                  ? 'Aguardando confirmação do pagamento.'
                  : 'Sem tickets ativos neste pedido.'}
              </p>
            ) : (
              <TicketPassList
                tickets={order.tickets}
                evento={{
                  titulo: order.eventoTitulo,
                  data: order.eventoData,
                  horaInicio: order.eventoHoraInicio,
                  horaFim: order.eventoHoraFim,
                  local: order.eventoLocal,
                  endereco: order.eventoEndereco,
                  cidade: order.eventoCidade,
                }}
                comprador={{
                  nome: order.nomeComprador,
                  email: order.email || data.email,
                  telefone: order.telefone,
                  cpf: order.cpf,
                }}
                title="Ingressos com QR"
              />
            )}
          </section>
        ))}

        <p className="text-center text-sm print:hidden">
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
