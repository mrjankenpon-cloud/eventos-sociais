/**
 * Stub legado — envio real via Resend em `email/resend.ts` + `email/guestAccess.ts`.
 * Preferir `sendOrderConfirmationEmail` / `requestGuestTicketsEmail`.
 */
import * as functions from 'firebase-functions/v1';
import { isResendConfigured, sendEmailViaResend } from './email/resend';

export const sendEmail = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Autenticação obrigatória'
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
      message:
        'Resend não configurado — e-mail enfileirado. Defina RESEND_API_KEY e EMAIL_FROM.',
      to,
    };
  }

  const result = await sendEmailViaResend({ to, subject, html });
  return { ok: true, ...result, to };
});
