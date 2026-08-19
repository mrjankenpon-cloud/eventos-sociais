import * as admin from 'firebase-admin';
import { createHash, randomBytes } from 'crypto';

export const RESERVE_MINUTES = 15;
export const MP_API = 'https://api.mercadopago.com';

export function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }
  return token;
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    'https://eventos-sociais.vercel.app'
  ).replace(/\/$/, '');
}

export function isMercadoPagoSandbox(): boolean {
  return (process.env.MERCADOPAGO_MODE || '').toLowerCase() === 'sandbox';
}

/** Token de produção (APP_USR-…). TEST- é sandbox. */
export function isLiveMpAccessToken(): boolean {
  return getAccessToken().startsWith('APP_USR-');
}

/**
 * Em sandbox o payer do Checkout Pro deve ser o TESTUSER comprador.
 * E-mail real no formulário DELPHOS continua no pedido Firestore.
 */
export function getSandboxPayerEmail(fallbackEmail: string): string {
  if (!isMercadoPagoSandbox()) return fallbackEmail;
  const fromEnv = String(process.env.MP_TEST_BUYER_EMAIL || '').trim().toLowerCase();
  if (fromEnv.includes('@')) return fromEnv;
  const user = String(process.env.MP_TEST_BUYER_USERNAME || '').trim();
  // TESTUSER7715... → test_user_7715...@testuser.com
  if (user.toUpperCase().startsWith('TESTUSER')) {
    const digits = user.replace(/^TESTUSER/i, '');
    if (digits) return `test_user_${digits}@testuser.com`;
  }
  return fallbackEmail;
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateCodigo(): string {
  return `DEL-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;
}

export function buildQrPayload(data: {
  ticketId: string;
  codigo: string;
  hash: string;
  status: string;
  createdAt: string;
}): string {
  return JSON.stringify({
    t: data.ticketId,
    c: data.codigo,
    h: data.hash,
    s: data.status,
    ts: data.createdAt,
  });
}

export function stockFields(quantidade: number, vendida: number) {
  const quantidadeVendida = Math.max(0, vendida);
  const quantidadeDisponivel = Math.max(0, quantidade - quantidadeVendida);
  return { quantidadeVendida, quantidadeDisponivel };
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function mpFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Mercado Pago ${res.status}: ${body.message || body.error || res.statusText}`
    );
  }
  return body;
}

/** Extrai taxas efetivas do pagamento MP (nunca estima). */
export function extractMpFees(payment: Record<string, unknown>): {
  transactionAmount: number;
  feeAmount: number;
  netReceivedAmount: number;
} {
  const transactionAmount = Number(payment.transaction_amount) || 0;
  const feeDetails = Array.isArray(payment.fee_details)
    ? (payment.fee_details as Array<{ amount?: number }>)
    : [];
  const feeFromDetails = feeDetails.reduce(
    (sum, f) => sum + (Number(f.amount) || 0),
    0
  );
  const transactionDetails = (payment.transaction_details || {}) as Record<
    string,
    unknown
  >;
  const netReceivedAmount =
    Number(transactionDetails.net_received_amount) ||
    Number(payment.net_received_amount) ||
    0;
  const feeAmount =
    feeFromDetails > 0
      ? feeFromDetails
      : netReceivedAmount > 0
        ? roundMoney(transactionAmount - netReceivedAmount)
        : 0;

  return {
    transactionAmount,
    feeAmount,
    netReceivedAmount:
      netReceivedAmount > 0
        ? netReceivedAmount
        : roundMoney(transactionAmount - feeAmount),
  };
}

export function db() {
  return admin.firestore();
}

/** PIX no MP exige no mínimo ~30 min. */
export const PIX_MINUTES = 30;

export function isoWithOffset(date: Date): string {
  const pad = (n: number) => String(Math.trunc(n)).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(offsetMin) / 60));
  const om = pad(Math.abs(offsetMin) % 60);
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}${sign}${oh}:${om}`;
}

export type MpOrderPix = {
  id?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string;
  external_reference?: string;
  transactions?: {
    payments?: Array<{
      id?: string;
      status?: string;
      status_detail?: string;
      date_of_expiration?: string;
      amount?: string;
      payment_method?: {
        id?: string;
        type?: string;
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    }>;
  };
};

export function extractNumericPaymentIdFromUrl(url: string): string {
  const match = String(url || '').match(/\/payments\/(\d+)/);
  return match?.[1] || '';
}

export function mapOrderStatusToMp(
  status?: string,
  statusDetail?: string
): string {
  const s = String(status || '').toLowerCase();
  const d = String(statusDetail || '').toLowerCase();
  if (s === 'processed' || d === 'accredited') return 'approved';
  if (s === 'refunded' || d === 'refunded' || d === 'partially_refunded') {
    return 'refunded';
  }
  if (s === 'canceled' || s === 'cancelled' || s === 'expired') {
    return 'cancelled';
  }
  if (s === 'action_required' || s === 'created') return 'pending';
  return s || 'pending';
}

export function pixFromOrder(order: MpOrderPix) {
  const pay = order.transactions?.payments?.[0];
  const pm = pay?.payment_method || {};
  const ticketUrl = String(pm.ticket_url || '');
  const numericId = extractNumericPaymentIdFromUrl(ticketUrl);
  return {
    qrCode: String(pm.qr_code || ''),
    qrCodeBase64: String(pm.qr_code_base64 || ''),
    ticketUrl,
    paymentId: numericId || String(pay?.id || order.id || ''),
    orderId: String(order.id || ''),
    orderPaymentId: String(pay?.id || ''),
    expiresAt: String(pay?.date_of_expiration || ''),
    status: mapOrderStatusToMp(order.status, order.status_detail),
  };
}

export function moneyString(n: number): string {
  return roundMoney(n).toFixed(2);
}

export type CheckoutMetodo = 'pix' | 'checkout_pro';

export function parseCheckoutMetodo(raw: unknown): CheckoutMetodo {
  return String(raw || '').trim().toLowerCase() === 'pix'
    ? 'pix'
    : 'checkout_pro';
}

export function mpWebhookUrl(): string {
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    'eventosociais-c057d';
  return `https://us-central1-${projectId}.cloudfunctions.net/mpWebhook`;
}

/**
 * Checkout Pro: crédito (Visa, Master, Elo, Amex) e saldo MP.
 * Débito nesta conta: só Elo (`debelo`). PIX fica no site (API Orders).
 * O teto de 12x deixa o MP oferecer parcelamento no crédito quando permitir.
 */
export function checkoutProPaymentMethods() {
  return {
    excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
    excluded_payment_methods: [{ id: 'pix' }],
    installments: 12,
    default_installments: 1,
  };
}

export async function createPixCharge(input: {
  pedidoId: string;
  valor: number;
  description: string;
  email: string;
  nome: string;
  documento: string;
  documentoTipo?: 'cpf' | 'cnpj';
  expiresAt: string;
  idempotencyKey: string;
}) {
  if (!isLiveMpAccessToken()) {
    throw new Error(
      'PIX exige credenciais de produção do Mercado Pago (APP_USR). Ative pagamentos PIX na aplicação.'
    );
  }

  const email = String(input.email || '').trim().toLowerCase();
  const digits = String(input.documento || '').replace(/\D/g, '');
  const payer: Record<string, unknown> = {
    email: email.includes('@') ? email : 'ingressos@institutodelphos.com.br',
    first_name: (input.nome || 'Pagador').slice(0, 60),
  };
  if (input.documentoTipo === 'cnpj' && digits.length === 14) {
    payer.identification = { type: 'CNPJ', number: digits };
  } else if (digits.length === 11) {
    payer.identification = { type: 'CPF', number: digits };
  }

  const amount = moneyString(input.valor);
  const holdMs = Math.max(
    30 * 60 * 1000,
    new Date(input.expiresAt).getTime() - Date.now()
  );
  const holdMinutes = Math.max(30, Math.round(holdMs / 60000));

  try {
    const order = await mpFetch<MpOrderPix>('/v1/orders', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        type: 'online',
        processing_mode: 'automatic',
        total_amount: amount,
        external_reference: input.pedidoId,
        description: input.description.slice(0, 255),
        expiration_time: `PT${holdMinutes}M`,
        payer,
        transactions: {
          payments: [
            {
              amount,
              payment_method: {
                id: 'pix',
                type: 'bank_transfer',
              },
            },
          ],
        },
      }),
    });
    const pix = pixFromOrder(order);
    if (!pix.qrCode) {
      throw new Error('Mercado Pago não devolveu o código PIX');
    }
    return pix;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/401|unauthorized|live credentials|PA_UNAUTHORIZED|403/i.test(msg)) {
      throw new Error(
        'O Mercado Pago recusou gerar PIX com estas credenciais. Confirme PIX na aplicação de produção (API Orders).'
      );
    }
    throw error;
  }
}

