import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db, extractMpFees, mpFetch } from './helpers';
import { transitionPedidoReleaseStock } from './stock';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/** Reembolso: somente admin / master (não editor). */
async function requireAdmin(req: functions.Request): Promise<string> {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Autenticação obrigatória');

  const decoded = await admin.auth().verifyIdToken(match[1]);
  if (decoded.uid === MASTER_UID || decoded.master === true) {
    return decoded.uid;
  }

  const role = String(decoded.role || '');
  if (role === 'admin' && decoded.ativo !== false) {
    return decoded.uid;
  }

  const userSnap = await db().collection('usuarios').doc(decoded.uid).get();
  const user = userSnap.data();
  if (user && user.ativo !== false && String(user.role || '') === 'admin') {
    return decoded.uid;
  }

  throw new Error('Sem permissão para reembolso (somente administrador)');
}

async function cancelTickets(pedidoId: string): Promise<void> {
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
  const batch = db().batch();
  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      status: 'Cancelado',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  if (!snap.empty) await batch.commit();
}

export const refundPayment = functions.https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const uid = await requireAdmin(req);
    const pedidoId = String(req.body?.pedidoId || '').trim();
    if (!pedidoId) {
      res.status(400).json({ error: 'pedidoId obrigatório' });
      return;
    }

    const pedidoRef = db().collection('pedidos').doc(pedidoId);

    // Claim atômico: impede reembolso duplicado concorrente
    const claim = await db().runTransaction(async (tx) => {
      const snap = await tx.get(pedidoRef);
      if (!snap.exists) throw new Error('Pedido não encontrado');
      const pedido = snap.data() || {};

      if (pedido.status === 'reembolsado' || pedido.refundInProgress === true) {
        return { already: true as const, pedido };
      }
      if (pedido.status !== 'confirmado') {
        throw new Error('Só é possível reembolsar pedidos confirmados');
      }
      const mpPaymentId = String(pedido.mpPaymentId || '');
      if (!mpPaymentId) {
        throw new Error('Pedido sem mpPaymentId (gratuito ou legado)');
      }

      tx.update(pedidoRef, {
        refundInProgress: true,
        refundRequestedBy: uid,
        refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { already: false as const, pedido, mpPaymentId };
    });

    if (claim.already) {
      res.json({ ok: true, already: true, pedidoId });
      return;
    }

    const mpPaymentId = claim.mpPaymentId!;

    let refund: Record<string, unknown>;
    try {
      refund = (await mpFetch(`/v1/payments/${mpPaymentId}/refunds`, {
        method: 'POST',
        body: JSON.stringify({}),
      })) as Record<string, unknown>;
    } catch (mpErr) {
      await pedidoRef.update({
        refundInProgress: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw mpErr;
    }

    let fees = {
      transactionAmount: Number(claim.pedido.mpTransactionAmount) || 0,
      feeAmount: Number(claim.pedido.mpFeeAmount) || 0,
      netReceivedAmount: Number(claim.pedido.mpNetReceivedAmount) || 0,
    };
    try {
      const payment = (await mpFetch(
        `/v1/payments/${mpPaymentId}`
      )) as Record<string, unknown>;
      fees = extractMpFees(payment);
    } catch {
      /* mantém */
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    await db()
      .collection('pagamentos')
      .doc(`${mpPaymentId}_refund_${String(refund.id || Date.now())}`)
      .set({
        pedidoId,
        eventoId: String(claim.pedido.eventoId || ''),
        mpPaymentId,
        tipo: 'refund',
        status: String(refund.status || 'refunded'),
        payloadResumo: {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
        byUid: uid,
        receivedAt: now,
        processedAt: now,
      });

    await transitionPedidoReleaseStock({
      pedidoId,
      fromStatuses: ['confirmado'],
      toStatus: 'reembolsado',
      extra: {
        mpStatus: 'refunded',
        mpTransactionAmount: fees.transactionAmount,
        mpFeeAmount: fees.feeAmount,
        mpNetReceivedAmount: fees.netReceivedAmount,
        refundInProgress: false,
        refundedBy: uid,
        refundedAt: new Date().toISOString(),
      },
    });

    await cancelTickets(pedidoId);

    await db().collection('logs').add({
      acao: 'refund',
      colecao: 'pedidos',
      documentoId: pedidoId,
      descricao: `Reembolso MP ${mpPaymentId} por ${uid}`,
      createdAt: now,
    });

    res.json({ ok: true, pedidoId, mpPaymentId, refundId: refund.id });
  } catch (error) {
    functions.logger.error('[refundPayment]', error);
    const msg = error instanceof Error ? error.message : 'erro';
    const status =
      msg.includes('Autenticação') || msg.includes('permissão') ? 403 : 500;
    res.status(status).json({ error: msg });
  }
});
