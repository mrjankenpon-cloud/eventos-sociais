import * as functions from 'firebase-functions';

/**
 * Envio de e-mail (confirmação, ingresso, etc.).
 * TODO: integrar provedor (SendGrid / SES / Resend).
 */
export const sendEmail = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação obrigatória');
  }

  const to = String(request.data?.to || '');
  const template = String(request.data?.template || 'generic');

  if (!to) {
    throw new functions.https.HttpsError('invalid-argument', 'Destinatário obrigatório');
  }

  functions.logger.info('[sendEmail] stub', {
    to,
    template,
    uid: request.auth.uid,
  });

  return {
    ok: true,
    stub: true,
    message: 'sendEmail preparado — provedor externo pendente',
    to,
    template,
  };
});
