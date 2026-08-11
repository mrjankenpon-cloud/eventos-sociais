import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { createHmac, timingSafeEqual } from 'crypto';
import { db, extractMpFees, mpFetch, roundMoney } from './helpers';
import {
  emitTicketsForPedido,
  transitionPedidoReleaseStock,
} from './stock';
import { sendOrderConfirmationEmail } from '../email/guestAccess';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    'Content-Type, x-signature, x-request-id'
  );
}

function verifyWebhookSignature(req: functions.Request): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
  const skip =
    process.env.MERCADOPAGO_WEBHOOK_SKIP_VERIFY === 'true' ||
    process.env.MERCADOPAGO_MODE === 'sandbox';

  if (!secret) {
    if (skip) {
      functions.logger.warn(
        '[mpWebhook] secret ausente — aceito apenas por MODE=sandbox / SKIP_VERIFY'
      );
      return true;
    }
    functions.logger.error(
      '[mpWebhook] MERCADOPAGO_WEBHOOK_SECRET obrigatório em produção'
    );
    return false;
  }

  const xSignature = String(req.headers['x-signature'] || '');
  const xRequestId = String(req.headers['x-request-id'] || '');
  if (!xSignature) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(',')) {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const dataId =
    String(req.query['data.id'] || '') ||
    String((req.body as { data?: { id?: string } })?.data?.id || '') ||
    '';

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return expected === hash;
  }
}

/** Idempotência forte: doc id determinístico por payment+status. */
async function recordPagamentoOnce(input: {
  pedidoId: string;
  eventoId: string;
  mpPaymentId: string;
  tipo: string;
  status: string;
  payloadResumo: Record<string, unknown>;
}): Promise<boolean> {
  const docId = `${input.mpPaymentId}_${input.status}`.replace(
    /[^a-zA-Z0-9_\-]/g,
    '_'
  );
  const ref = db().collection('pagamentos').doc(docId);
  try {
    await ref.create({
      ...input,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: number | string })?.code;
    // ALREADY_EXISTS
    if (code === 6 || code === 'already-exists') return false;
    throw err;
  }
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

async function confirmPedidoApproved(
  pedidoId: string,
  mpFields: Record<string, unknown>,
  paidAmount: number
): Promise<'confirmed' | 'skipped' | 'mismatch'> {
  const pedidoRef = db().collection('pedidos').doc(pedidoId);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) return 'skipped' as const;
    const pedido = snap.data() || {};
    const status = String(pedido.status || '');
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (status === 'reembolsado' || status === 'cancelado') {
      tx.update(pedidoRef, { ...mpFields, updatedAt: now });
      return 'skipped' as const;
    }

    const expected = roundMoney(Number(pedido.valorTotal) || 0);
    if (Math.abs(expected - paidAmount) > 0.01) {
      tx.update(pedidoRef, {
        ...mpFields,
        mpAmountMismatch: true,
        mpExpectedAmount: expected,
        updatedAt: now,
      });
      return 'mismatch' as const;
    }

    // Já confirmado: só atualiza campos MP (retry de emissão fora da tx)
    if (status === 'confirmado') {
      tx.update(pedidoRef, { ...mpFields, updatedAt: now });
      return 'confirmed' as const;
    }

    // pendente (fluxo normal) ou expirado com pagamento tardio: confirma
    if (status === 'pendente' || status === 'expirado') {
      tx.update(pedidoRef, {
        ...mpFields,
        status: 'confirmado',
        estoqueReservado: status === 'pendente' ? true : Boolean(pedido.estoqueReservado),
        updatedAt: now,
      });
      return 'confirmed' as const;
    }

    tx.update(pedidoRef, { ...mpFields, updatedAt: now });
    return 'skipped' as const;
  });
}

async function processPayment(paymentId: string): Promise<void> {
  const payment = (await mpFetch(
    `/v1/payments/${paymentId}`
  )) as Record<string, unknown>;

  const meta = (payment.metadata || {}) as Record<string, unknown>;
  const pedidoId = String(
    payment.external_reference || meta.pedidoId || ''
  ).trim();
  if (!pedidoId) {
    functions.logger.warn('[mpWebhook] payment sem external_reference', {
      paymentId,
    });
    return;
  }

  const mpStatus = String(payment.status || '');
  const fees = extractMpFees(payment);

  const isNewEvent = await recordPagamentoOnce({
    pedidoId,
    eventoId: String(meta.eventoId || ''),
    mpPaymentId: String(paymentId),
    tipo: 'payment',
    status: mpStatus,
    payloadResumo: {
      status: mpStatus,
      status_detail: payment.status_detail,
      transaction_amount: fees.transactionAmount,
      fee_amount: fees.feeAmount,
      net_received_amount: fees.netReceivedAmount,
      payment_type_id: payment.payment_type_id,
      date_approved: payment.date_approved,
      metadata: {
        pedidoId: meta.pedidoId,
        eventoId: meta.eventoId,
        ingressoId: meta.ingressoId,
        natureza: meta.natureza,
      },
    },
  });

  // Idempotência: mesmo payment+status já processado — só retenta emissão se approved
  if (!isNewEvent && mpStatus !== 'approved') {
    return;
  }

  const pedidoSnap = await db().collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) {
    functions.logger.warn('[mpWebhook] pedido não encontrado', { pedidoId });
    return;
  }

  const mpFields = {
    mpPaymentId: String(paymentId),
    mpStatus,
    mpStatusDetail: String(payment.status_detail || ''),
    mpTransactionAmount: fees.transactionAmount,
    mpFeeAmount: fees.feeAmount,
    mpNetReceivedAmount: fees.netReceivedAmount,
  };

  if (mpStatus === 'approved') {
    const outcome = await confirmPedidoApproved(
      pedidoId,
      mpFields,
      roundMoney(fees.transactionAmount)
    );
    if (outcome === 'mismatch') {
      functions.logger.error('[mpWebhook] valor pago ≠ valor congelado', {
        pedidoId,
        paymentId,
        paid: fees.transactionAmount,
      });
      return;
    }
    if (outcome === 'confirmed' || !isNewEvent) {
      await emitTicketsForPedido(pedidoId);
      const pedidoAfter = await db().collection('pedidos').doc(pedidoId).get();
      const pdata = pedidoAfter.data() || {};
      if (outcome === 'confirmed' && isNewEvent) {
        await sendOrderConfirmationEmail({
          id: pedidoId,
          email: String(pdata.email || ''),
          nomeComprador: String(pdata.nomeComprador || ''),
        });
      }
    }
    return;
  }

  if (
    mpStatus === 'rejected' ||
    mpStatus === 'cancelled' ||
    mpStatus === 'canceled'
  ) {
    await transitionPedidoReleaseStock({
      pedidoId,
      fromStatuses: ['pendente'],
      toStatus: 'cancelado',
      extra: mpFields,
    });
    return;
  }

  if (mpStatus === 'refunded' || mpStatus === 'charged_back') {
    const transition = await transitionPedidoReleaseStock({
      pedidoId,
      fromStatuses: ['confirmado', 'pendente'],
      toStatus: 'reembolsado',
      extra: mpFields,
    });
    if (transition.applied) {
      await cancelTickets(pedidoId);
    } else {
      await db()
        .collection('pedidos')
        .doc(pedidoId)
        .update({
          ...mpFields,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return;
  }

  await db()
    .collection('pedidos')
    .doc(pedidoId)
    .update({
      ...mpFields,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

export const mpWebhook = functions.https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    if (!verifyWebhookSignature(req)) {
      res.status(401).json({ error: 'Assinatura inválida' });
      return;
    }

    const topic = String(
      req.query.topic ||
        req.query.type ||
        (req.body as { type?: string; topic?: string })?.type ||
        (req.body as { topic?: string })?.topic ||
        ''
    );
    const dataId = String(
      req.query.id ||
        req.query['data.id'] ||
        (req.body as { data?: { id?: string | number } })?.data?.id ||
        (req.body as { id?: string | number })?.id ||
        ''
    );

    if ((topic === 'payment' || topic === 'payments' || !topic) && dataId) {
      await processPayment(dataId);
    } else if (topic === 'merchant_order' && dataId) {
      const order = (await mpFetch(`/merchant_orders/${dataId}`)) as {
        payments?: Array<{ id?: number | string }>;
      };
      for (const p of order.payments || []) {
        if (p.id) await processPayment(String(p.id));
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    functions.logger.error('[mpWebhook]', error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'erro',
    });
  }
});
