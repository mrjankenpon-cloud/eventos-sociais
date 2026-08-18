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

export type MpPixPayment = {
  id?: number | string;
  status?: string;
  date_of_expiration?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

export function pixFromPayment(payment: MpPixPayment) {
  const td = payment.point_of_interaction?.transaction_data || {};
  return {
    qrCode: String(td.qr_code || ''),
    qrCodeBase64: String(td.qr_code_base64 || ''),
    ticketUrl: String(td.ticket_url || ''),
    paymentId: String(payment.id || ''),
    expiresAt: String(payment.date_of_expiration || ''),
    status: String(payment.status || ''),
  };
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

/** Checkout Pro: cartão (e saldo MP). PIX fica no Transparente. */
export function checkoutProPaymentMethods() {
  return {
    excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
    excluded_payment_methods: [{ id: 'pix' }],
    installments: 1,
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
  notificationUrl: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
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

  try {
    const payment = await mpFetch<MpPixPayment>('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        transaction_amount: input.valor,
        description: input.description.slice(0, 255),
        payment_method_id: 'pix',
        payer,
        external_reference: input.pedidoId,
        notification_url: input.notificationUrl,
        date_of_expiration: input.expiresAt,
        metadata: input.metadata,
      }),
    });
    const pix = pixFromPayment(payment);
    if (!pix.qrCode) {
      throw new Error('Mercado Pago não devolveu o código PIX');
    }
    return pix;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/401|unauthorized|live credentials/i.test(msg)) {
      throw new Error(
        'O Mercado Pago recusou gerar PIX com estas credenciais. Ative PIX/pagamentos via API na aplicação de produção.'
      );
    }
    throw error;
  }
}

