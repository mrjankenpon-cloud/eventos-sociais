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
