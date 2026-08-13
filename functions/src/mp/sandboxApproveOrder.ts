import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { timingSafeEqual } from 'crypto';
import {
  db,
  isMercadoPagoSandbox,
  roundMoney,
} from './helpers';
import { emitTicketsForPedido } from './stock';
import { sendOrderConfirmationEmail } from '../email/guestAccess';
import { sendDonationCertificateEmail } from '../email/donationCertificate';

function cors(res: functions.Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Contingência de teste: aprova pedido pendente sem webhook do MP.
 * Só funciona com MERCADOPAGO_MODE=sandbox + accessToken do pedido.
 *
 * Útil quando o Checkout Pro sandbox deixa o botão Pagar cinza
 * (conta compradora sem app / UI do MP).
 */
export const sandboxApproveOrder = functions.https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  if (!isMercadoPagoSandbox()) {
    res.status(403).json({ error: 'Disponível apenas em sandbox' });
    return;
  }

  try {
    const body = (req.body || {}) as { pedidoId?: string; token?: string };
    const pedidoId = String(body.pedidoId || '').trim();
    const token = String(body.token || '').trim();

    if (!pedidoId || token.length < 32) {
      res.status(400).json({ error: 'pedidoId e token obrigatórios' });
      return;
    }

    const pedidoRef = db().collection('pedidos').doc(pedidoId);
    const snap = await pedidoRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Pedido não encontrado' });
      return;
    }

    const pedido = snap.data() || {};
    if (!tokensEqual(String(pedido.accessToken || ''), token)) {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }

    const status = String(pedido.status || '');
    if (status === 'confirmado') {
      res.json({ ok: true, alreadyConfirmed: true, pedidoId });
      return;
    }
    if (status !== 'pendente' && status !== 'expirado') {
      res.status(400).json({ error: `Status atual não permite aprovação: ${status}` });
      return;
    }

    const valorTotal = roundMoney(Number(pedido.valorTotal) || 0);
    const fakePaymentId = `sandbox_${pedidoId}_${Date.now()}`;
    const now = admin.firestore.FieldValue.serverTimestamp();

    await pedidoRef.update({
      status: 'confirmado',
      mpStatus: 'approved',
      mpPaymentId: fakePaymentId,
      mpTransactionAmount: valorTotal,
      mpFeeAmount: 0,
      mpNetReceivedAmount: valorTotal,
      mpSandboxSimulated: true,
      estoqueReservado: true,
      updatedAt: now,
    });

    await db()
      .collection('pagamentos')
      .doc(`${fakePaymentId}_approved`)
      .set({
        pedidoId,
        eventoId: String(pedido.eventoId || ''),
        mpPaymentId: fakePaymentId,
        tipo: 'payment',
        status: 'approved',
        payloadResumo: { simulated: true, source: 'sandboxApproveOrder' },
        receivedAt: now,
        processedAt: now,
      });

    if (String(pedido.tipo || '') === 'doacao') {
      await sendDonationCertificateEmail({
        id: pedidoId,
        email: String(pedido.email || ''),
        nomeComprador: String(pedido.nomeComprador || ''),
        cpf: String(pedido.cpf || ''),
        documentoTipo: String(pedido.documentoTipo || 'cpf'),
        valorTotal,
        dataCompra: String(pedido.dataCompra || ''),
        certificadoNumero: String(pedido.certificadoNumero || ''),
        accessToken: String(pedido.accessToken || ''),
      }).catch((err) => {
        functions.logger.warn('[sandboxApproveOrder] e-mail doação', err);
      });

      functions.logger.info('[sandboxApproveOrder] doação ok', { pedidoId });
      res.json({ ok: true, pedidoId, tickets: 0, simulated: true });
      return;
    }

    const emit = await emitTicketsForPedido(pedidoId, {
      ...pedido,
      status: 'confirmado',
      ticketsEmitidos: false,
    });

    await sendOrderConfirmationEmail({
      id: pedidoId,
      email: String(pedido.email || ''),
      nomeComprador: String(pedido.nomeComprador || ''),
      eventoId: String(pedido.eventoId || ''),
    }).catch((err) => {
      functions.logger.warn('[sandboxApproveOrder] e-mail', err);
    });

    functions.logger.info('[sandboxApproveOrder] ok', {
      pedidoId,
      tickets: emit.count,
    });

    res.json({
      ok: true,
      pedidoId,
      tickets: emit.count,
      simulated: true,
    });
  } catch (error) {
    functions.logger.error('[sandboxApproveOrder]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha na aprovação sandbox',
    });
  }
});
