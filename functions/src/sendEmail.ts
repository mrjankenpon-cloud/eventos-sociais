/**
 * Stub legado — envio real via Resend em `email/resend.ts` + `email/guestAccess.ts`.
 * Preferir `sendOrderConfirmationEmail` / `requestGuestTicketsEmail`.
 */
import * as functions from 'firebase-functions/v1';
import { isResendConfigured, sendEmailViaResend } from './email/resend';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

export const sendEmail = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Autenticação obrigatória'
    );
  }

  const uid = request.auth.uid;
  const claims = request.auth.token as { role?: string; master?: boolean };
  const isAdmin =
    uid === MASTER_UID ||
    claims.master === true ||
    claims.role === 'admin';
  if (!isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Sem permissão'
    );
  }

  const to = String(request.data?.to || '');
  const subject = String(request.data?.subject || 'DELPHOS');
  const html = String(request.data?.html || '<p>Mensagem DELPHOS</p>');

  if (!to) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Destinatário obrigatório'
    );
  }

  if (!isResendConfigured()) {
    functions.logger.info('[sendEmail] Resend ainda não configurado', { to });
    return {
      ok: true,
      stub: true,
      queued: true,
      message: 'E-mail enfileirado.',
      to,
    };
  }

  const result = await sendEmailViaResend({ to, subject, html });
  return { ok: true, ...result, to };
});
