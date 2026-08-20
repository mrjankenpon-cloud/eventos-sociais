import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { randomBytes, timingSafeEqual } from 'crypto';
import { db, getAppUrl, sha256 } from '../mp/helpers';
import { sendEmailViaResend } from './resend';
import { persistPedidoEmailDelivery } from './emailDelivery';

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
    if (String(p.tipo || '') === 'doacao') return false;
    const status = String(p.status || '');
    return (
      status === 'confirmado' ||
      Boolean(p.ticketsEmitidos) ||
      status === 'pendente'
    );
  });
}

type EmailTicketRow = {
  codigo: string;
  ordem: number;
  ingressoNome: string;
  natureza: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ticketsEmailHtml(input: {
  accessUrl: string;
  hours: number;
  nome?: string;
  eventoTitulo?: string;
  tickets: EmailTicketRow[];
}): string {
  const nome = input.nome ? `Olá, ${escapeHtml(input.nome)}!` : 'Olá!';
  const evento = input.eventoTitulo
    ? `<p style="margin:0 0 12px;"><strong>Evento:</strong> ${escapeHtml(input.eventoTitulo)}</p>`
    : '';

  const rows =
    input.tickets.length > 0
      ? input.tickets
          .map(
            (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:ui-monospace,monospace;font-size:13px;">${escapeHtml(t.codigo)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:13px;">${escapeHtml(t.ingressoNome || 'Ingresso')}${t.natureza ? ` <span style="color:#888;">(${escapeHtml(t.natureza)})</span>` : ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${String(t.ordem).padStart(3, '0')}</td>
      </tr>`
          )
          .join('')
      : `<tr><td colspan="3" style="padding:12px;color:#666;font-size:13px;">Seus ingressos estão disponíveis no link abaixo.</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>${nome}</p>
  <p>Seu pagamento foi confirmado. Seguem os ingressos adquiridos no e-mail cadastrado na inscrição.</p>
  ${evento}
  <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fafafa;border:1px solid #eee;border-radius:8px;">
    <thead>
      <tr style="background:#f0f4f8;text-align:left;">
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;">Código</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;">Tipo</th>
        <th style="padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555;text-align:center;">Nº</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p style="font-size:14px;color:#333;">Para ver e imprimir cada QR Code (check-in individual), use o botão abaixo:</p>
  <p style="margin: 24px 0;">
    <a href="${input.accessUrl}"
       style="background:#1655a3;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">
      Ver e imprimir ingressos
    </a>
  </p>
  <p style="font-size:13px;color:#555;">
    Cada QR libera um ingresso. No dia do evento, cada pessoa apresenta o seu.
    O link é pessoal e vale por ${input.hours} horas.
    Se você não solicitou, ignore este e-mail.
  </p>
  <p style="font-size:12px;color:#888;">DELPHOS — Eventos</p>
</body>
</html>`;
}

async function loadTicketsForPedido(pedidoId: string): Promise<EmailTicketRow[]> {
  let snap = await db()
    .collection('tickets')
    .where('pedidoId', '==', pedidoId)
    .get();
  if (snap.empty) {
    snap = await db()
      .collection('tickets')
      .where('compraId', '==', pedidoId)
      .get();
  }

  return snap.docs
    .map((d) => {
      const t = d.data();
      return {
        codigo: String(t.codigo || ''),
        ordem: Number(t.ordem) || 0,
        ingressoNome: String(t.ingressoNome || 'Ingresso'),
        natureza: String(t.natureza || ''),
      };
    })
    .filter((t) => t.codigo)
    .sort((a, b) => a.ordem - b.ordem);
}

async function loadEventoTitulo(eventoId: string): Promise<string> {
  if (!eventoId) return '';
  const snap = await db().collection('eventos').doc(eventoId).get();
  if (!snap.exists) return '';
  return String(snap.data()?.titulo || '');
}

export async function sendGuestAccessEmail(input: {
  email: string;
  purpose: 'recovery' | 'confirmation';
  nome?: string;
  pedidoId?: string;
  eventoTitulo?: string;
  tickets?: EmailTicketRow[];
}): Promise<{ queued: boolean; sent: boolean; delayed?: boolean }> {
  const { accessUrl } = await createGuestAccessToken({
    email: input.email,
    purpose: input.purpose,
    pedidoId: input.pedidoId,
  });

  const tickets = input.tickets || [];
  const subject =
    input.purpose === 'confirmation'
      ? tickets.length > 1
        ? `Seus ${tickets.length} ingressos DELPHOS`
        : 'Seu ingresso DELPHOS'
      : 'Acesso aos seus ingressos DELPHOS';

  const ticketLines =
    tickets.length > 0
      ? tickets
          .map(
            (t) =>
              `- ${t.codigo} · ${t.ingressoNome}${t.natureza ? ` (${t.natureza})` : ''} · nº ${String(t.ordem).padStart(3, '0')}`
          )
          .join('\n')
      : '';

  try {
    const result = await sendEmailViaResend({
      to: input.email,
      subject,
      html: ticketsEmailHtml({
        accessUrl,
        hours: GUEST_LINK_TTL_HOURS,
        nome: input.nome,
        eventoTitulo: input.eventoTitulo,
        tickets,
      }),
      text: `${input.nome ? `Olá, ${input.nome}!\n\n` : ''}Pagamento confirmado.${
        input.eventoTitulo ? `\nEvento: ${input.eventoTitulo}` : ''
      }\n\nIngressos:\n${ticketLines || '(veja no link)'}\n\nVer e imprimir QR Codes: ${accessUrl}\n\nLink válido por ${GUEST_LINK_TTL_HOURS}h.`,
      tags: [
        { name: 'purpose', value: input.purpose },
        { name: 'product', value: 'delphos' },
      ],
    });

    await db().collection('logs').add({
      acao: result.sent
        ? 'email_sent'
        : result.delayed
          ? 'email_delayed'
          : 'email_queued',
      colecao: 'guestAccessTokens',
      documentoId: input.email,
      descricao: result.sent
        ? `E-mail ${input.purpose} enviado via Resend (${tickets.length} ingresso(s))`
        : result.delayed
          ? `E-mail ${input.purpose} adiado (cota Resend — janela 24h)`
          : `E-mail ${input.purpose} enfileirado (Resend ainda não configurado)`,
      metadata: { pedidoId: input.pedidoId || null, tickets: tickets.length },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      sent: Boolean(result.sent),
      queued: Boolean(result.queued),
      delayed: Boolean(result.delayed),
    };
  } catch (err) {
    functions.logger.error('[sendGuestAccessEmail]', err);
    await db().collection('logs').add({
      acao: 'email_failed',
      colecao: 'guestAccessTokens',
      documentoId: input.email,
      descricao: err instanceof Error ? err.message : 'falha no envio',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { sent: false, queued: true, delayed: false };
  }
}

/** Pós-pagamento / gratuito — best-effort. Inclui lista dos ingressos no corpo. */
export async function sendOrderConfirmationEmail(pedido: {
  id: string;
  email?: string;
  nomeComprador?: string;
  eventoId?: string;
}): Promise<{ sent: boolean; delayed?: boolean }> {
  const email = String(pedido.email || '')
    .trim()
    .toLowerCase();
  if (!email.includes('@')) return { sent: false };

  const [tickets, eventoTitulo] = await Promise.all([
    loadTicketsForPedido(pedido.id),
    loadEventoTitulo(String(pedido.eventoId || '')),
  ]);

  const result = await sendGuestAccessEmail({
    email,
    purpose: 'confirmation',
    nome: String(pedido.nomeComprador || ''),
    pedidoId: pedido.id,
    eventoTitulo,
    tickets,
  });

  await persistPedidoEmailDelivery(pedido.id, result, {
    confirmationEmailTicketCount: tickets.length,
  });

  return { sent: result.sent, delayed: result.delayed };
}
