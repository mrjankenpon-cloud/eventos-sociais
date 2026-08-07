import * as functions from 'firebase-functions';

/**
 * Gera tickets/QR para um pedido (alternativa server-side).
 * TODO: mover geração criptográfica do client para cá em produção.
 */
export const generateTickets = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação obrigatória');
  }

  const pedidoId = String(request.data?.pedidoId || '');
  if (!pedidoId) {
    throw new functions.https.HttpsError('invalid-argument', 'pedidoId obrigatório');
  }

  functions.logger.info('[generateTickets] stub', {
    pedidoId,
    uid: request.auth.uid,
  });

  return {
    ok: true,
    stub: true,
    message: 'generateTickets preparado — emissão server-side pendente',
    pedidoId,
    tickets: [],
  };
});
