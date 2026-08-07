import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Confirma pagamento de um pedido.
 * TODO: integrar gateway (PIX/cartão) e webhooks.
 */
export const confirmPayment = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação obrigatória');
  }

  const pedidoId = String(request.data?.pedidoId || '');
  if (!pedidoId) {
    throw new functions.https.HttpsError('invalid-argument', 'pedidoId obrigatório');
  }

  // Stub: apenas marca estrutura; lógica completa virá com o gateway.
  const ref = admin.firestore().collection('pedidos').doc(pedidoId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Pedido não encontrado');
  }

  functions.logger.info('[confirmPayment] stub', { pedidoId, uid: request.auth.uid });

  return {
    ok: true,
    stub: true,
    message: 'confirmPayment preparado — integração externa pendente',
    pedidoId,
  };
});
