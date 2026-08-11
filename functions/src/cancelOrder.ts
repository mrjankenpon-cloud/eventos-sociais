import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * Cancela pedido e libera estoque.
 * TODO: estorno no gateway de pagamento.
 */
export const cancelOrder = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação obrigatória');
  }

  const pedidoId = String(request.data?.pedidoId || '');
  if (!pedidoId) {
    throw new functions.https.HttpsError('invalid-argument', 'pedidoId obrigatório');
  }

  const ref = admin.firestore().collection('pedidos').doc(pedidoId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Pedido não encontrado');
  }

  functions.logger.info('[cancelOrder] stub', { pedidoId, uid: request.auth.uid });

  return {
    ok: true,
    stub: true,
    message: 'cancelOrder preparado — liberação de estoque/estorno pendentes',
    pedidoId,
  };
});
