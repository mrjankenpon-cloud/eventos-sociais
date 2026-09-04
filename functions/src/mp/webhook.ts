import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  db,
  extractMpFees,
  extractNumericPaymentIdFromUrl,
  isMercadoPagoSandbox,
  mapOrderStatusToMp,
  MpOrderPix,
  mpFetch,
  pixFromOrder,
  roundMoney,
  searchPaymentsByExternalReference,
} from './helpers';
import {
  emitTicketsForPedido,
  reserveStockLines,
  transitionPedidoReleaseStock,
} from './stock';
import { sendOrderConfirmationEmail } from '../email/guestAccess';
import { sendDonationCertificateEmail } from '../email/donationCertificate';
import { applyTicketUpgrade } from './createTicketUpgradeSession';
import {
  extractWebhookDataId,
  verifyMpWebhookSignature,
} from './webhookSignature';

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
    isMercadoPagoSandbox();

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
  const dataId = extractWebhookDataId(
    req as { query?: Record<string, unknown>; body?: unknown }
  );
  const ok = verifyMpWebhookSignature({
    secret,
    xSignature,
    xRequestId,
    dataId,
  });
  if (!ok) {
    functions.logger.warn('[mpWebhook] assinatura inválida', {
      hasSignature: Boolean(xSignature),
      hasRequestId: Boolean(xRequestId),
      dataIdLength: dataId.length,
    });
  }
  return ok;
}

/**
 * Se a assinatura HMAC falhar (secret do painel Webhooks != Client Secret),
 * ainda autenticamos buscando o recurso com o Access Token do vendedor.
 * Só processa se a API MP devolver o pagamento/pedido.
 */
async function authenticateWebhookPayload(
  req: functions.Request
): Promise<{ ok: boolean; via: 'signature' | 'api' | 'none' }> {
  if (verifyWebhookSignature(req)) {
    return { ok: true, via: 'signature' };
  }

  const dataId = extractWebhookDataId(
    req as { query?: Record<string, unknown>; body?: unknown }
  );
  if (!dataId) return { ok: false, via: 'none' };

  try {
    if (dataId.toUpperCase().startsWith('ORD')) {
      await mpFetch(`/v1/orders/${dataId}`);
    } else {
      await mpFetch(`/v1/payments/${dataId}`);
    }
    functions.logger.warn(
      '[mpWebhook] assinatura inválida, mas recurso autenticado via API — revise MERCADOPAGO_WEBHOOK_SECRET no painel Webhooks (não use Client Secret)'
    );
    return { ok: true, via: 'api' };
  } catch {
    return { ok: false, via: 'none' };
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

    if (status === 'reembolsado') {
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

    // pendente, expirado (pagamento tardio) ou cancelado por recusa anterior
    if (
      status === 'pendente' ||
      status === 'expirado' ||
      status === 'cancelado'
    ) {
      tx.update(pedidoRef, {
        ...mpFields,
        status: 'confirmado',
        estoqueReservado:
          status === 'pendente' ? true : Boolean(pedido.estoqueReservado),
        updatedAt: now,
      });
      return 'confirmed' as const;
    }

    tx.update(pedidoRef, { ...mpFields, updatedAt: now });
    return 'skipped' as const;
  });
}

async function processOrder(orderId: string): Promise<void> {
  const order = (await mpFetch(`/v1/orders/${orderId}`)) as MpOrderPix;
  const pix = pixFromOrder(order);
  const numericId = extractNumericPaymentIdFromUrl(pix.ticketUrl);
  if (numericId) {
    try {
      await processPayment(numericId);
      return;
    } catch (err) {
      functions.logger.warn('[mpWebhook] order→payment fallback', {
        orderId,
        numericId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const pedidoId = String(order.external_reference || '').trim();
  if (!pedidoId) {
    functions.logger.warn('[mpWebhook] order sem external_reference', {
      orderId,
    });
    return;
  }

  const mpStatus = mapOrderStatusToMp(order.status, order.status_detail);
  const amount = roundMoney(Number(order.total_amount) || 0);
  const synthetic = {
    id: pix.paymentId || orderId,
    status: mpStatus,
    status_detail: order.status_detail,
    transaction_amount: amount,
    external_reference: pedidoId,
    metadata: {},
  } as Record<string, unknown>;

  const fees = extractMpFees(synthetic);
  const isNewEvent = await recordPagamentoOnce({
    pedidoId,
    eventoId: '',
    mpPaymentId: String(pix.paymentId || orderId),
    tipo: 'order',
    status: mpStatus,
    payloadResumo: {
      status: mpStatus,
      status_detail: order.status_detail || null,
      transaction_amount: fees.transactionAmount,
      order_id: orderId,
    },
  });

  if (!isNewEvent && mpStatus !== 'approved') return;

  const pedidoSnap = await db().collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) return;

  const mpFields = {
    mpPaymentId: String(pix.paymentId || orderId),
    mpOrderId: String(order.id || orderId),
    mpStatus,
    mpStatusDetail: String(order.status_detail || ''),
    mpTransactionAmount: fees.transactionAmount,
    mpFeeAmount: fees.feeAmount,
    mpNetReceivedAmount: fees.netReceivedAmount,
  };

  if (mpStatus === 'approved') {
    await processPaymentApproved(pedidoId, mpFields, fees.transactionAmount, isNewEvent, String(pix.paymentId || orderId));
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

async function processPaymentApproved(
  pedidoId: string,
  mpFields: Record<string, unknown>,
  paidAmount: number,
  isNewEvent: boolean,
  paymentId: string
): Promise<void> {
  const pedidoSnap = await db().collection('pedidos').doc(pedidoId).get();
  const pedidoTipo = String(pedidoSnap.data()?.tipo || '');
  const currentPedido = pedidoSnap.data() || {};
  if (
    pedidoTipo !== 'doacao' &&
    String(currentPedido.status || '') === 'cancelado' &&
    currentPedido.estoqueReservado !== true
  ) {
    const itens = Array.isArray(currentPedido.itens)
      ? (currentPedido.itens as Array<Record<string, unknown>>)
      : [];
    const lines = itens
      .map((row) => ({
        ingressoId: String(row.ingressoId || ''),
        quantidade: Math.max(0, Math.floor(Number(row.quantidade) || 0)),
      }))
      .filter((l) => l.ingressoId && l.quantidade > 0);
    if (lines.length > 0) {
      try {
        await reserveStockLines(lines);
      } catch (err) {
        functions.logger.error('[mpWebhook] re-reserva após cancelado', {
          pedidoId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  if (pedidoTipo === 'doacao') {
    const outcome = await confirmPedidoApproved(
      pedidoId,
      mpFields,
      roundMoney(paidAmount)
    );
    if (outcome === 'mismatch') {
      functions.logger.error('[mpWebhook] doação valor ≠ esperado', {
        pedidoId,
        paymentId,
      });
      return;
    }
    if (outcome === 'confirmed' || !isNewEvent) {
      const pdata = (await db().collection('pedidos').doc(pedidoId).get()).data() || {};
      const needsEmail =
        String(pdata.status || '') === 'confirmado' &&
        !pdata.confirmationEmailSentAt &&
        !['sent', 'queued', 'delayed'].includes(
          String(pdata.emailDelivery || '')
        ) &&
        String(pdata.email || '').includes('@');
      if (needsEmail) {
        await sendDonationCertificateEmail({
          id: pedidoId,
          email: String(pdata.email || ''),
          nomeComprador: String(pdata.nomeComprador || ''),
          cpf: String(pdata.cpf || ''),
          documentoTipo: String(pdata.documentoTipo || 'cpf'),
          valorTotal: Number(pdata.valorTotal) || 0,
          dataCompra: String(pdata.dataCompra || ''),
          certificadoNumero: String(pdata.certificadoNumero || ''),
          accessToken: String(pdata.accessToken || ''),
        }).catch((err) => {
          functions.logger.warn('[mpWebhook] e-mail doação (best-effort)', err);
        });
      }
    }
    return;
  }
  if (pedidoTipo === 'upgrade') {
    const outcome = await confirmPedidoApproved(
      pedidoId,
      mpFields,
      roundMoney(paidAmount)
    );
    if (outcome === 'mismatch') {
      functions.logger.error('[mpWebhook] upgrade valor ≠ esperado', {
        pedidoId,
        paymentId,
      });
      return;
    }
    if (outcome === 'confirmed' || !isNewEvent) {
      await applyTicketUpgrade(pedidoId);
    }
    return;
  }

  const outcome = await confirmPedidoApproved(
    pedidoId,
    mpFields,
    roundMoney(paidAmount)
  );
  if (outcome === 'mismatch') {
    functions.logger.error('[mpWebhook] valor pago ≠ valor congelado', {
      pedidoId,
      paymentId,
      paid: paidAmount,
    });
    return;
  }
  if (outcome === 'confirmed' || !isNewEvent) {
    await emitTicketsForPedido(pedidoId);
    const pedidoAfter = await db().collection('pedidos').doc(pedidoId).get();
    const pdata = pedidoAfter.data() || {};
    const statusOk = String(pdata.status || '') === 'confirmado';
    const needsEmail =
      statusOk &&
      !pdata.confirmationEmailSentAt &&
      !['sent', 'queued', 'delayed'].includes(
        String(pdata.emailDelivery || '')
      ) &&
      String(pdata.email || '').includes('@');
    if (needsEmail) {
      await sendOrderConfirmationEmail({
        id: pedidoId,
        email: String(pdata.email || ''),
        nomeComprador: String(pdata.nomeComprador || ''),
        eventoId: String(pdata.eventoId || ''),
      }).catch((err) => {
        functions.logger.warn('[mpWebhook] e-mail ingresso (best-effort)', err);
      });
    }
  }
}

async function processPayment(paymentId: string): Promise<void> {
  const id = String(paymentId);
  if (id.startsWith('ORD')) {
    await processOrder(id);
    return;
  }
  if (id.startsWith('PAY')) {
    const snap = await db()
      .collection('pedidos')
      .where('mpOrderPaymentId', '==', id)
      .limit(1)
      .get();
    const orderId = String(snap.docs[0]?.data()?.mpOrderId || '');
    if (orderId.startsWith('ORD')) {
      await processOrder(orderId);
      return;
    }
    functions.logger.warn('[mpWebhook] PAY sem pedido vinculado', {
      paymentId: id,
    });
    return;
  }
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
      status_detail: payment.status_detail || null,
      transaction_amount: fees.transactionAmount,
      fee_amount: fees.feeAmount,
      net_received_amount: fees.netReceivedAmount,
      payment_type_id: payment.payment_type_id || null,
      date_approved: payment.date_approved || null,
      metadata: {
        pedidoId: meta.pedidoId || pedidoId,
        eventoId: meta.eventoId || null,
        ingressoId: meta.ingressoId || null,
        natureza: meta.natureza || null,
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
    await processPaymentApproved(
      pedidoId,
      mpFields,
      fees.transactionAmount,
      isNewEvent,
      String(paymentId)
    );
    return;
  }

  if (mpStatus === 'rejected') {
    await db()
      .collection('pedidos')
      .doc(pedidoId)
      .update({
        ...mpFields,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    return;
  }

  if (mpStatus === 'cancelled' || mpStatus === 'canceled') {
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

/** Recibo/polling: confirma no MP se o webhook atrasou (PIX ou cartão). */
export async function syncPendingPedidoFromMp(
  pedidoId: string,
  pedido: Record<string, unknown>,
  hintPaymentId?: string
): Promise<void> {
  if (String(pedido.status || '') !== 'pendente') return;
  const orderId = String(pedido.mpOrderId || '');
  const paymentId = String(hintPaymentId || pedido.mpPaymentId || '').trim();
  try {
    if (orderId.toUpperCase().startsWith('ORD')) {
      await processOrder(orderId);
      return;
    }
    if (paymentId && !paymentId.startsWith('sandbox_')) {
      const payment = (await mpFetch(
        `/v1/payments/${paymentId}`
      )) as Record<string, unknown>;
      const ref = String(payment.external_reference || '').trim();
      if (ref === pedidoId) {
        await processPayment(paymentId);
        const afterHint = await db().collection('pedidos').doc(pedidoId).get();
        if (String(afterHint.data()?.status || '') !== 'pendente') return;
      }
    }
    const found = await searchPaymentsByExternalReference(pedidoId);
    const approved = found.find((p) => String(p.status || '') === 'approved');
    const next = approved || found[0];
    if (next?.id) {
      await processPayment(String(next.id));
    }
  } catch (err) {
    functions.logger.warn('[syncPendingPedidoFromMp]', {
      pedidoId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export const mpWebhook = functions.https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const auth = await authenticateWebhookPayload(req);
    if (!auth.ok) {
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
    const action = String(
      (req.body as { action?: string })?.action || req.query.action || ''
    );
    const dataId = extractWebhookDataId(
      req as { query?: Record<string, unknown>; body?: unknown }
    );

    if (
      (topic === 'order' ||
        topic === 'orders' ||
        action.startsWith('order.') ||
        String(dataId).toUpperCase().startsWith('ORD')) &&
      dataId
    ) {
      await processOrder(dataId);
    } else if (
      (topic === 'payment' ||
        topic === 'payments' ||
        action.startsWith('payment.') ||
        !topic) &&
      dataId
    ) {
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
    res.status(500).json({ ok: false });
  }
});
