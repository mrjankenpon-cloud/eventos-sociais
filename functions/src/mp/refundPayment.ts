import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db, extractMpFees, moneyString, mpFetch, roundMoney } from './helpers';
import { releaseStock, transitionPedidoReleaseStock } from './stock';

const MASTER_UID = 'dNnYanNjrgWA5CXUfJjEZKCIJhm2';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

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

function unitPriceForTicket(
  pedido: Record<string, unknown>,
  ticket: Record<string, unknown>
): number {
  const ingressoId = String(ticket.ingressoId || '');
  const itens = Array.isArray(pedido.itens)
    ? (pedido.itens as Array<Record<string, unknown>>)
    : [];
  const line = itens.find((i) => String(i.ingressoId || '') === ingressoId);
  if (line && Number(line.valorUnitario) > 0) {
    return roundMoney(Number(line.valorUnitario));
  }
  const qty = Math.max(1, Number(pedido.quantidade) || 1);
  const total = Number(pedido.valorTotal) || 0;
  if (Number(pedido.valorUnitario) > 0) {
    return roundMoney(Number(pedido.valorUnitario));
  }
  return roundMoney(total / qty);
}

async function listTicketsForPedido(
  pedidoId: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
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
  return snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
}

/**
 * Reembolso integral (pedido) ou parcial (um ticket).
 * Body: { pedidoId, ticketId?, amount? }
 */
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
    const ticketId = String(req.body?.ticketId || '').trim();
    const amountRaw = req.body?.amount;

    if (!pedidoId) {
      res.status(400).json({ error: 'pedidoId obrigatório' });
      return;
    }

    const pedidoRef = db().collection('pedidos').doc(pedidoId);
    const snap = await pedidoRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Pedido não encontrado' });
      return;
    }
    const pedido = snap.data() || {};

    if (pedido.status === 'reembolsado') {
      res.json({ ok: true, already: true, pedidoId });
      return;
    }
    if (pedido.refundInProgress === true) {
      res.status(409).json({ error: 'Reembolso já em andamento' });
      return;
    }
    if (pedido.status !== 'confirmado') {
      throw new Error('Só é possível reembolsar pedidos confirmados');
    }

    const mpPaymentId = String(pedido.mpPaymentId || '');
    if (!mpPaymentId) {
      throw new Error('Pedido sem mpPaymentId (gratuito ou legado)');
    }
    if (mpPaymentId.startsWith('sandbox_') || pedido.mpSandboxSimulated) {
      throw new Error(
        'Este pedido foi aprovado por simulação sandbox (sem pagamento real no Mercado Pago). Reembolso via API não é possível — use um pagamento de teste real.'
      );
    }

    const valorTotal = roundMoney(Number(pedido.valorTotal) || 0);
    const alreadyRefunded = roundMoney(Number(pedido.refundedAmount) || 0);
    const remaining = roundMoney(Math.max(0, valorTotal - alreadyRefunded));
    if (remaining <= 0) {
      throw new Error('Não há valor restante para reembolsar neste pedido');
    }

    let refundAmount = remaining;
    let targetTicket:
      | { id: string; data: Record<string, unknown> }
      | null = null;
    let partial = false;

    if (ticketId) {
      partial = true;
      const ticketRef = db().collection('tickets').doc(ticketId);
      const ticketSnap = await ticketRef.get();
      if (!ticketSnap.exists) throw new Error('Ticket não encontrado');
      const ticket = ticketSnap.data() || {};
      const ticketPedido = String(ticket.pedidoId || ticket.compraId || '');
      if (ticketPedido !== pedidoId) {
        throw new Error('Ticket não pertence a este pedido');
      }
      const st = String(ticket.status || '');
      if (st === 'Cancelado' || st === 'Reembolsado') {
        throw new Error('Ticket já cancelado/reembolsado');
      }
      targetTicket = { id: ticketId, data: ticket };
      const unit = unitPriceForTicket(pedido, ticket);
      refundAmount =
        typeof amountRaw === 'number' && amountRaw > 0
          ? roundMoney(amountRaw)
          : unit;
      if (refundAmount <= 0) throw new Error('Valor de reembolso inválido');
      if (refundAmount > remaining + 0.001) {
        throw new Error(
          `Valor excede o restante reembolsável (${remaining.toFixed(2)})`
        );
      }
    } else if (typeof amountRaw === 'number' && amountRaw > 0) {
      refundAmount = roundMoney(amountRaw);
      if (refundAmount > remaining + 0.001) {
        throw new Error(
          `Valor excede o restante reembolsável (${remaining.toFixed(2)})`
        );
      }
      partial = refundAmount < remaining - 0.001;
    }

    await pedidoRef.update({
      refundInProgress: true,
      refundRequestedBy: uid,
      refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let refund: Record<string, unknown>;
    try {
      const orderId = String(pedido.mpOrderId || '');
      const partialBody =
        partial || refundAmount < remaining - 0.001
          ? { amount: refundAmount }
          : {};
      if (orderId.startsWith('ORD')) {
        const orderPayId = String(pedido.mpOrderPaymentId || '');
        const body =
          partialBody.amount != null
            ? {
                transactions: orderPayId
                  ? [{ id: orderPayId, amount: moneyString(refundAmount) }]
                  : [],
              }
            : {};
        refund = (await mpFetch(`/v1/orders/${orderId}/refund`, {
          method: 'POST',
          headers: {
            'X-Idempotency-Key': `refund-${pedidoId}-${ticketId || 'full'}`,
          },
          body: JSON.stringify(body),
        })) as Record<string, unknown>;
      } else {
        refund = (await mpFetch(`/v1/payments/${mpPaymentId}/refunds`, {
          method: 'POST',
          body: JSON.stringify(partialBody),
        })) as Record<string, unknown>;
      }
    } catch (mpErr) {
      await pedidoRef.update({
        refundInProgress: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw mpErr;
    }

    const refundedNow = roundMoney(
      Number(refund.amount) > 0 ? Number(refund.amount) : refundAmount
    );
    const newRefundedTotal = roundMoney(alreadyRefunded + refundedNow);
    const fullyRefunded = newRefundedTotal >= valorTotal - 0.01;

    const now = admin.firestore.FieldValue.serverTimestamp();
    await db()
      .collection('pagamentos')
      .doc(`${mpPaymentId}_refund_${String(refund.id || Date.now())}`)
      .set({
        pedidoId,
        eventoId: String(pedido.eventoId || ''),
        mpPaymentId,
        tipo: 'refund',
        status: String(refund.status || 'refunded'),
        ticketId: ticketId || null,
        payloadResumo: {
          refundId: refund.id,
          amount: refundedNow,
          status: refund.status,
          partial: !fullyRefunded,
        },
        byUid: uid,
        receivedAt: now,
        processedAt: now,
      });

    if (targetTicket) {
      await db()
        .collection('tickets')
        .doc(targetTicket.id)
        .update({
          status: 'Reembolsado',
          refundedAmount: refundedNow,
          refundedAt: new Date().toISOString(),
          refundedBy: uid,
          updatedAt: now,
        });
      const ingressoId = String(targetTicket.data.ingressoId || '');
      if (ingressoId) {
        await releaseStock(ingressoId, 1);
      }
    } else if (fullyRefunded) {
      const all = await listTicketsForPedido(pedidoId);
      const batch = db().batch();
      for (const t of all) {
        const st = String(t.data.status || '');
        if (st === 'Cancelado' || st === 'Reembolsado') continue;
        batch.update(db().collection('tickets').doc(t.id), {
          status: 'Reembolsado',
          refundedAt: new Date().toISOString(),
          refundedBy: uid,
          updatedAt: now,
        });
      }
      await batch.commit();
    }

    if (fullyRefunded) {
      await transitionPedidoReleaseStock({
        pedidoId,
        fromStatuses: ['confirmado'],
        toStatus: 'reembolsado',
        extra: {
          mpStatus: 'refunded',
          refundInProgress: false,
          refundedAmount: newRefundedTotal,
          refundedBy: uid,
          refundedAt: new Date().toISOString(),
          partialRefund: Boolean(alreadyRefunded > 0 || ticketId),
        },
      });
    } else {
      await pedidoRef.update({
        refundInProgress: false,
        refundedAmount: newRefundedTotal,
        partialRefund: true,
        lastRefundAt: new Date().toISOString(),
        lastRefundBy: uid,
        updatedAt: now,
      });
    }

    try {
      const payment = (await mpFetch(
        `/v1/payments/${mpPaymentId}`
      )) as Record<string, unknown>;
      const fees = extractMpFees(payment);
      await pedidoRef.update({
        mpTransactionAmount: fees.transactionAmount,
        mpFeeAmount: fees.feeAmount,
        mpNetReceivedAmount: fees.netReceivedAmount,
        mpStatus: String(payment.status || pedido.mpStatus || ''),
      });
    } catch {
      /* ignore */
    }

    await db().collection('logs').add({
      acao: 'refund',
      colecao: 'pedidos',
      documentoId: pedidoId,
      descricao: ticketId
        ? `Reembolso parcial ticket ${ticketId} R$ ${refundedNow} (MP ${mpPaymentId}) por ${uid}`
        : `Reembolso MP ${mpPaymentId} R$ ${refundedNow} por ${uid}`,
      createdAt: now,
    });

    res.json({
      ok: true,
      pedidoId,
      mpPaymentId,
      refundId: refund.id,
      amount: refundedNow,
      partial: !fullyRefunded,
      ticketId: ticketId || null,
      fullyRefunded,
    });
  } catch (error) {
    functions.logger.error('[refundPayment]', error);
    const msg = error instanceof Error ? error.message : 'erro';
    const status =
      msg.includes('Autenticação') || msg.includes('permissão')
        ? 403
        : msg.includes('não encontrad')
          ? 404
          : 500;
    res.status(status).json({ error: msg });
  }
});
