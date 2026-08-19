import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db, mpFetch } from './helpers';
import { transitionPedidoReleaseStock } from './stock';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

async function requireStaff(req: functions.Request): Promise<string> {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Autenticação obrigatória');

  const decoded = await admin.auth().verifyIdToken(match[1]);
  if (decoded.uid === MASTER_UID || decoded.master === true) {
    return decoded.uid;
  }

  const role = String(decoded.role || '');
  if (['admin', 'editor', 'operador'].includes(role) && decoded.ativo !== false) {
    return decoded.uid;
  }

  const userSnap = await db().collection('usuarios').doc(decoded.uid).get();
  const user = userSnap.data();
  if (
    user &&
    user.ativo !== false &&
    ['admin', 'editor', 'operador'].includes(String(user.role || ''))
  ) {
    return decoded.uid;
  }

  throw new Error('Sem permissão');
}

async function expireBatch(): Promise<{ expired: number; skipped: number }> {
  const nowIso = new Date().toISOString();
  const snap = await db()
    .collection('pedidos')
    .where('status', '==', 'pendente')
    .where('reservaExpiraEm', '<=', nowIso)
    .limit(50)
    .get();

  let expired = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const result = await transitionPedidoReleaseStock({
      pedidoId: doc.id,
      fromStatuses: ['pendente'],
      toStatus: 'expirado',
    });

    if (!result.applied) {
      skipped += 1;
      continue;
    }

    expired += 1;

    const data = doc.data() || {};
    if (String(data.tipo || '') === 'upgrade') {
      const ticketId = String(data.ticketId || '').trim();
      if (ticketId) {
        await db()
          .collection('tickets')
          .doc(ticketId)
          .update({
            upgradeStatus: 'expirado',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          .catch(() => undefined);
      }
    }

    const orderId = String(data.mpOrderId || '');
    if (orderId.startsWith('ORD')) {
      try {
        await mpFetch(`/v1/orders/${orderId}/cancel`, {
          method: 'POST',
          headers: {
            'X-Idempotency-Key': `expire-order-${doc.id}`,
          },
          body: JSON.stringify({}),
        });
      } catch (err) {
        functions.logger.warn('[expirePendingOrders] order', {
          orderId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const preferenceId = String(data.mpPreferenceId || '');
    if (preferenceId) {
      try {
        await mpFetch(`/checkout/preferences/${preferenceId}`, {
          method: 'PUT',
          body: JSON.stringify({
            expires: true,
            expiration_date_to: new Date().toISOString(),
          }),
        });
      } catch (err) {
        functions.logger.warn('[expirePendingOrders] preference', {
          preferenceId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { expired, skipped };
}

/** Agenda a cada 5 minutos — libera estoque de pedidos pendentes > 15 min. */
export const expirePendingOrders = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const result = await expireBatch();
    functions.logger.info('[expirePendingOrders]', result);
    return null;
  });

/** HTTP manual autenticado para forçar varredura. */
export const expirePendingOrdersHttp = functions.https.onRequest(
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    try {
      await requireStaff(req);
      const result = await expireBatch();
      res.json({ ok: true, ...result });
    } catch (error) {
      functions.logger.error('[expirePendingOrdersHttp]', error);
      const msg = error instanceof Error ? error.message : 'erro';
      const status =
        msg.includes('Autenticação') || msg.includes('permissão') ? 403 : 500;
      res.status(status).json({ error: msg });
    }
  }
);
