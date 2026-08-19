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
    'https://institutodelphos.com.br'
  ).replace(/\/$/, '');
}

export function isMercadoPagoSandbox(): boolean {
  return (process.env.MERCADOPAGO_MODE || '').toLowerCase() === 'sandbox';
}

/** Token de produção (APP_USR-…). TEST- é sandbox. */
export function isLiveMpAccessToken(): boolean {
  return getAccessToken().startsWith('APP_USR-');
}

/** Impede misturar MODE=production com token TEST- e o inverso. */
export function assertMercadoPagoCredentials(): void {
  const mode = (process.env.MERCADOPAGO_MODE || '').toLowerCase();
  const live = isLiveMpAccessToken();
  if (mode === 'production' && !live) {
    throw new Error(
      'Credenciais Mercado Pago inconsistentes: MODE=production exige token APP_USR.'
    );
  }
  if (mode === 'sandbox' && live) {
    throw new Error(
      'Credenciais Mercado Pago inconsistentes: MODE=sandbox exige token TEST-.'
    );
  }
  if (live && !String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim()) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET obrigatório em produção');
  }
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

export function parseDeviceSessionId(raw: unknown): string | undefined {
  const s = String(raw || '').trim();
  if (!s || s.length > 512 || !/^[A-Za-z0-9._-]+$/.test(s)) return undefined;
  return s;
}

export function mpDeviceHeaders(
  deviceSessionId?: string
): Record<string, string> {
  const id = parseDeviceSessionId(deviceSessionId);
  if (!id) return {};
  return { 'X-meli-session-id': id };
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
    errors?: Array<{ code?: string; message?: string; details?: unknown }>;
  };
  if (!res.ok) {
    const fromList = Array.isArray(body.errors)
      ? body.errors
          .map((e) => {
            const detail = Array.isArray(e.details)
              ? e.details.map(String).join(', ')
              : '';
            return [e.code, e.message, detail].filter(Boolean).join(' — ');
          })
          .filter(Boolean)
          .join('; ')
      : '';
    throw new Error(
      `Mercado Pago ${res.status}: ${fromList || body.message || body.error || res.statusText}`
    );
  }
  return body;
}

export async function searchPaymentsByExternalReference(
  externalReference: string
): Promise<Array<Record<string, unknown>>> {
  const ref = String(externalReference || '').trim();
  if (!ref) return [];
  const qs = new URLSearchParams({
    sort: 'date_created',
    criteria: 'desc',
    external_reference: ref,
  });
  const result = (await mpFetch(
    `/v1/payments/search?${qs.toString()}`
  )) as { results?: Array<Record<string, unknown>> };
  return Array.isArray(result.results) ? result.results : [];
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

/** Mensagem segura para o cliente — não devolve corpo da API nem tokens. */
export function clientSafeMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message.trim();
  if (!msg) return fallback;
  if (
    /APP_USR-|TEST-[a-z0-9]|Bearer |re_[A-Za-z0-9]|BEGIN |access.?token|vapid|webhook.?secret/i.test(
      msg
    )
  ) {
    return fallback;
  }
  if (msg.includes('{') || /^Mercado Pago \d/i.test(msg) || msg.length > 180) {
    return fallback;
  }
  return msg;
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

export function splitBrPhone(
  raw: string
): { area_code: string; number: string } | null {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('55') && n.length >= 12) n = n.slice(2);
  if (n.length < 10 || n.length > 11) return null;
  return { area_code: n.slice(0, 2), number: n.slice(2) };
}

export function splitPersonName(nome: string): {
  first_name: string;
  last_name: string;
} {
  const parts = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return { first_name: 'Comprador', last_name: 'Delphos' };
  }
  if (parts.length === 1) {
    return { first_name: parts[0].slice(0, 60), last_name: 'Delphos' };
  }
  return {
    first_name: parts[0].slice(0, 60),
    last_name: parts.slice(1).join(' ').slice(0, 60),
  };
}

/** Dados extras do pagador — o MP usa isso no antifraude do cartão. */
export function mpCheckoutPayer(input: {
  email: string;
  nome: string;
  documento: string;
  documentoTipo?: 'cpf' | 'cnpj';
  telefone?: string;
}): Record<string, unknown> {
  const names = splitPersonName(input.nome);
  const phone = splitBrPhone(input.telefone || '');
  const digits = String(input.documento || '').replace(/\D/g, '');
  const payer: Record<string, unknown> = {
    email: getSandboxPayerEmail(input.email),
    first_name: names.first_name,
    last_name: names.last_name,
    name: String(input.nome || '').slice(0, 120),
  };
  if (!isMercadoPagoSandbox() && digits.length >= 11) {
    payer.identification = {
      type: input.documentoTipo === 'cnpj' ? 'CNPJ' : 'CPF',
      number: digits,
    };
  }
  if (phone) {
    payer.phone = {
      area_code: phone.area_code,
      number: phone.number,
    };
  }
  return payer;
}

export function clientIpFromRequest(req: {
  headers: Record<string, unknown>;
  ip?: string;
}): string | undefined {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const raw = forwarded || String(req.ip || '').replace(/^::ffff:/, '');
  if (!raw || raw === '127.0.0.1' || raw === '::1') return undefined;
  return raw.slice(0, 45);
}

export function mpAdditionalInfoPayer(input: {
  nome: string;
  telefone?: string;
}): Record<string, unknown> {
  const names = splitPersonName(input.nome);
  const phone = splitBrPhone(input.telefone || '');
  return {
    first_name: names.first_name,
    last_name: names.last_name,
    ...(phone
      ? {
          phone: {
            area_code: phone.area_code,
            number: phone.number,
          },
        }
      : {}),
  };
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
  telefone?: string;
  expiresAt: string;
  idempotencyKey: string;
  deviceSessionId?: string;
  items?: Array<{
    title: string;
    description?: string;
    external_code?: string;
    category_id?: string;
    quantity: number;
    unit_price: number;
    event_date?: string;
  }>;
}) {
  if (!isLiveMpAccessToken()) {
    throw new Error(
      'PIX exige credenciais de produção do Mercado Pago (APP_USR). Ative pagamentos PIX na aplicação.'
    );
  }

  const email = String(input.email || '').trim().toLowerCase();
  const digits = String(input.documento || '').replace(/\D/g, '');
  const names = splitPersonName(input.nome);
  const payer: Record<string, unknown> = {
    email: email.includes('@') ? email : 'ingressos@institutodelphos.com.br',
    first_name: names.first_name,
    last_name: names.last_name,
  };
  if (input.documentoTipo === 'cnpj' && digits.length === 14) {
    payer.identification = { type: 'CNPJ', number: digits };
  } else if (digits.length === 11) {
    payer.identification = { type: 'CPF', number: digits };
  }
  const phone = splitBrPhone(input.telefone || '');
  if (phone) {
    payer.phone = { area_code: phone.area_code, number: phone.number };
  }

  const amount = moneyString(input.valor);
  const holdMs = Math.max(
    30 * 60 * 1000,
    new Date(input.expiresAt).getTime() - Date.now()
  );
  const holdMinutes = Math.max(30, Math.round(holdMs / 60000));
  const orderItems = (input.items || [])
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      title: String(item.title || input.description).slice(0, 256),
      description: String(item.description || item.title || '').slice(0, 256),
      quantity: item.quantity,
      unit_price: moneyString(item.unit_price),
      ...(item.external_code
        ? { external_code: String(item.external_code).slice(0, 64) }
        : {}),
      ...(item.category_id ? { category_id: item.category_id } : {}),
      ...(item.event_date ? { event_date: item.event_date } : {}),
    }));

  try {
    const order = await mpFetch<MpOrderPix>('/v1/orders', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': input.idempotencyKey,
        ...mpDeviceHeaders(input.deviceSessionId),
      },
      body: JSON.stringify({
        type: 'online',
        processing_mode: 'automatic',
        total_amount: amount,
        external_reference: input.pedidoId,
        description: input.description.slice(0, 255),
        expiration_time: `PT${holdMinutes}M`,
        payer,
        ...(orderItems.length ? { items: orderItems } : {}),
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

