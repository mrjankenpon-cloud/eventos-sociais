import { firebaseConfig } from '../firebase/config';
import { auth } from '../firebase/auth';

const PROJECT_ID = firebaseConfig.projectId || 'eventosociais-c057d';
const REGION =
  String(import.meta.env.VITE_FUNCTIONS_REGION || '').trim() || 'us-central1';

function functionsBaseUrl(): string {
  const override = String(import.meta.env.VITE_FUNCTIONS_URL || '').trim();
  if (override) return override.replace(/\/$/, '');
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;
}

async function postJson<T>(
  name: string,
  body: unknown,
  opts?: { auth?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (opts?.auth) {
    const user = auth.currentUser;
    if (!user) throw new Error('Autenticação obrigatória');
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${functionsBaseUrl()}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'Checkout indisponível no momento (servidor de pagamento não publicado). Contate o administrador.'
      );
    }
    throw new Error(data.error || `Falha em ${name} (${res.status})`);
  }
  return data;
}

export type CheckoutSessionResult = {
  ok: boolean;
  gratuito: boolean;
  pedidoId: string;
  accessToken: string;
  preferenceId?: string;
  initPoint?: string;
  receiptUrl: string;
};

export type CheckoutCartItem = {
  ingressoId: string;
  quantidade: number;
};

export type OrderReceiptResult = {
  ok: boolean;
  accessToken?: string;
  sandbox?: boolean;
  pedido: {
    id: string;
    status: string;
    nomeComprador: string;
    email: string;
    telefone?: string;
    cpf?: string;
    documentoTipo?: 'cpf' | 'cnpj';
    certificadoNumero?: string;
    mensagemDoador?: string;
    tipo?: string;
    eventoId: string;
    eventoTitulo: string;
    eventoData?: string;
    eventoHoraInicio?: string;
    eventoHoraFim?: string;
    eventoLocal?: string;
    eventoEndereco?: string;
    eventoCidade?: string;
    ingressoNome?: string;
    natureza?: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    formaPagamento?: string;
    mpStatus?: string | null;
    ticketsEmitidos: boolean;
    dataCompra?: string;
    reservaExpiraEm?: string | null;
    guestCheckout?: boolean;
    linkPagamento?: string | null;
    itens?: Array<{
      ingressoId: string;
      nome: string;
      quantidade: number;
      valorUnitario: number;
      natureza?: string;
    }>;
  };
  tickets: Array<{
    id: string;
    codigo: string;
    qrPayload: string;
    status: string;
    ordem: number;
    natureza?: string;
    ingressoNome?: string;
    checkinRealizado: boolean;
    retiradaRealizada: boolean;
  }>;
};

export type GuestTicketsResult = {
  ok: boolean;
  email: string;
  readOnly: true;
  orders: Array<{
    id: string;
    status: string;
    nomeComprador?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    eventoTitulo: string;
    eventoData?: string;
    eventoHoraInicio?: string;
    eventoHoraFim?: string;
    eventoLocal?: string;
    eventoEndereco?: string;
    eventoCidade?: string;
    ingressoNome?: string;
    quantidade: number;
    valorTotal: number;
    dataCompra?: string;
    tickets: OrderReceiptResult['tickets'];
  }>;
};

export const checkoutApi = {
  createSession(input: {
    eventoId: string;
    itens: CheckoutCartItem[];
    comprador: {
      nome: string;
      cpf: string;
      telefone: string;
      email: string;
    };
  }): Promise<CheckoutSessionResult> {
    return postJson<CheckoutSessionResult>('createCheckoutSession', input);
  },

  getReceipt(
    pedidoId: string,
    opts: { token: string }
  ): Promise<OrderReceiptResult> {
    return postJson<OrderReceiptResult>('getOrderReceipt', {
      pedidoId,
      token: opts.token,
    });
  },

  /** Solicita e-mail com link seguro (resposta sempre genérica). */
  requestTicketsEmail(email: string): Promise<{ ok: boolean; message: string }> {
    return postJson('requestGuestTicketsEmail', { email });
  },

  getGuestTickets(token: string): Promise<GuestTicketsResult> {
    return postJson<GuestTicketsResult>('getGuestTickets', { token });
  },

  /** Somente sandbox: aprova pedido sem webhook do Mercado Pago. */
  sandboxApprove(
    pedidoId: string,
    token: string
  ): Promise<{ ok: boolean; tickets?: number; simulated?: boolean }> {
    return postJson('sandboxApproveOrder', { pedidoId, token });
  },

  refund(
    pedidoId: string,
    opts?: { ticketId?: string; amount?: number }
  ): Promise<{
    ok: boolean;
    pedidoId: string;
    amount?: number;
    partial?: boolean;
    fullyRefunded?: boolean;
    ticketId?: string | null;
  }> {
    return postJson(
      'refundPayment',
      {
        pedidoId,
        ticketId: opts?.ticketId,
        amount: opts?.amount,
      },
      { auth: true }
    );
  },

  createTicketUpgrade(ticketId: string): Promise<{
    ok: boolean;
    pix?: boolean;
    pedidoId: string;
    ticketId: string;
    diff: number;
    fromValor?: number;
    toValor?: number;
    toIngressoNome?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    expiresAt?: string;
    confirmed?: boolean;
    already?: boolean;
    initPoint?: string;
  }> {
    return postJson(
      'createTicketUpgradeSession',
      { ticketId },
      { auth: true }
    );
  },

  createDonationSession(input: {
    valor: number;
    doador: {
      nome: string;
      documento: string;
      documentoTipo: 'cpf' | 'cnpj';
      email: string;
      telefone: string;
    };
    mensagem?: string;
  }): Promise<{
    ok: boolean;
    pedidoId: string;
    accessToken: string;
    initPoint?: string;
    receiptUrl: string;
  }> {
    return postJson('createDonationSession', input);
  },
};
