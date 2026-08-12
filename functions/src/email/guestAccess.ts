import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { randomBytes, timingSafeEqual } from 'crypto';
import { db, getAppUrl, sha256 } from '../mp/helpers';
import { sendEmailViaResend } from './resend';

/** Validade do link de acesso guest (horas). */
export const GUEST_LINK_TTL_HOURS = 48;

const COLLECTION = 'guestAccessTokens';

export function hashGuestToken(raw: string): string {
  return sha256(raw);
}

export function generateRawGuestToken(): string {
  return randomBytes(32).toString('hex');
}

export function guestAccessUrl(rawToken: string): string {
  return `${getAppUrl()}/meus-ingressos?t=${encodeURIComponent(rawToken)}`;
}

/**
 * Cria token opaco (doc id = hash). Retorna o token cru só para o e-mail.
 */
export async function createGuestAccessToken(input: {
  email: string;
  purpose: 'recovery' | 'confirmation';
  pedidoId?: string;
}): Promise<{ rawToken: string; expiresAt: string; accessUrl: string }> {
  const email = input.email.trim().toLowerCase();
  const rawToken = generateRawGuestToken();
  const tokenHash = hashGuestToken(rawToken);
  const expiresAt = new Date(
    Date.now() + GUEST_LINK_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  await db()
    .collection(COLLECTION)
    .doc(tokenHash)
    .set({
      email,
      purpose: input.purpose,
      pedidoId: input.pedidoId || null,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      revoked: false,
    });

  return {
    rawToken,
    expiresAt,
    accessUrl: guestAccessUrl(rawToken),
  };
}

export async function resolveGuestToken(rawToken: string): Promise<{
  email: string;
  purpose: string;
  pedidoId?: string | null;
} | null> {
  const token = String(rawToken || '').trim();
  if (token.length < 48) return null;

  const tokenHash = hashGuestToken(token);
  const snap = await db().collection(COLLECTION).doc(tokenHash).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  if (data.revoked === true) return null;

  const expiresAt = new Date(String(data.expiresAt || 0)).getTime();
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;

  const email = String(data.email || '')
    .trim()
    .toLowerCase();
  if (!email.includes('@')) return null;

  // Confirma que o hash bate (defesa em profundidade)
  const storedId = snap.id;
  try {
    const a = Buffer.from(storedId, 'hex');
    const b = Buffer.from(tokenHash, 'hex');
    if (a.length === b.length && !timingSafeEqual(a, b)) return null;
  } catch {
    if (storedId !== tokenHash) return null;
  }

  return {
    email,
    purpose: String(data.purpose || 'recovery'),
    pedidoId: data.pedidoId || null,
  };
}

export async function findPedidosByEmail(
  email: string
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const normalized = email.trim().toLowerCase();
  const snap = await db()
    .collection('pedidos')
    .where('email', '==', normalized)
    .limit(50)
    .get();

  const rows: Array<Record<string, unknown> & { id: string }> = snap.docs.map(
    (d) => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, ...data };
    }
  );

  return rows.filter((p) => {
    const status = String(p.status || '');
    return (
      status === 'confirmado' ||
      Boolean(p.ticketsEmitidos) ||
      status === 'pendente'
    );
  });
}

function ticketsEmailHtml(input: {
  accessUrl: string;
  hours: number;
  nome?: string;
}): string {
  const nome = input.nome ? `Olá, ${input.nome}!` : 'Olá!';
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>${nome}</p>
  <p>Seu pagamento foi confirmado. Use o link abaixo para ver e imprimir seus ingressos com QR Code de check-in. Não é necessário criar conta.</p>
  <p style="margin: 24px 0;">
    <a href="${input.accessUrl}"
       style="background:#1655a3;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">
      Ver e imprimir ingressos
    </a>
  </p>
  <p style="font-size:13px;color:#555;">
    Neste link você encontra o QR Code que será lido no dia do evento.
    O acesso é pessoal, seguro e vale por ${input.hours} horas.
    Se você não solicitou, ignore este e-mail.
  </p>
  <p style="font-size:12px;color:#888;">DELPHOS — Eventos</p>
</body>
</html>`;
}

export async function sendGuestAccessEmail(input: {
  email: string;
  purpose: 'recovery' | 'confirmation';
  nome?: string;
  pedidoId?: string;
}): Promise<{ queued: boolean; sent: boolean }> {
  const { accessUrl } = await createGuestAccessToken({
    email: input.email,
    purpose: input.purpose,
    pedidoId: input.pedidoId,
  });

  const subject =
    input.purpose === 'confirmation'
      ? 'Seus ingressos DELPHOS — acesso seguro'
      : 'Acesso aos seus ingressos DELPHOS';

  try {
    const result = await sendEmailViaResend({
      to: input.email,
      subject,
      html: ticketsEmailHtml({
        accessUrl,
        hours: GUEST_LINK_TTL_HOURS,
        nome: input.nome,
      }),
      text: `${input.nome ? `Olá, ${input.nome}!\n\n` : ''}Acesse seus ingressos: ${accessUrl}\n\nLink válido por ${GUEST_LINK_TTL_HOURS}h.`,
      tags: [
        { name: 'purpose', value: input.purpose },
        { name: 'product', value: 'delphos' },
      ],
    });

    await db().collection('logs').add({
      acao: result.sent ? 'email_sent' : 'email_queued',
      colecao: 'guestAccessTokens',
      documentoId: input.email,
      descricao: result.sent
        ? `E-mail ${input.purpose} enviado via Resend`
        : `E-mail ${input.purpose} enfileirado (Resend ainda não configurado)`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { sent: Boolean(result.sent), queued: Boolean(result.queued) };
  } catch (err) {
    functions.logger.error('[sendGuestAccessEmail]', err);
    await db().collection('logs').add({
      acao: 'email_failed',
      colecao: 'guestAccessTokens',
      documentoId: input.email,
      descricao: err instanceof Error ? err.message : 'falha no envio',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Não propaga — compra/webhook não devem falhar por e-mail
    return { sent: false, queued: true };
  }
}

/** Pós-pagamento / gratuito — best-effort. */
export async function sendOrderConfirmationEmail(pedido: {
  id: string;
  email?: string;
  nomeComprador?: string;
}): Promise<void> {
  const email = String(pedido.email || '')
    .trim()
    .toLowerCase();
  if (!email.includes('@')) return;

  await sendGuestAccessEmail({
    email,
    purpose: 'confirmation',
    nome: String(pedido.nomeComprador || ''),
    pedidoId: pedido.id,
  });
}
