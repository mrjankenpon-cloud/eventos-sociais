import * as admin from 'firebase-admin';
import {
  buildQrPayload,
  db,
  generateCodigo,
  randomToken,
  sha256,
  stockFields,
} from './helpers';

type Tx = admin.firestore.Transaction;

/**
 * Emite tickets de forma atômica: só um caller vence o claim de `ticketsEmitidos`.
 * Impede duplicação sob webhooks concorrentes.
 */
export async function emitTicketsForPedido(
  pedidoId: string,
  pedidoHint?: Record<string, unknown>
): Promise<{ count: number; firstQr: string; skipped: boolean }> {
  const pedidoRef = db().collection('pedidos').doc(pedidoId);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) throw new Error('Pedido não encontrado');
    const pedido = snap.data() || {};

    if (pedido.ticketsEmitidos === true) {
      return {
        count: 0,
        firstQr: String(pedido.qrCode || pedidoHint?.qrCode || ''),
        skipped: true,
      };
    }

    const status = String(pedido.status || '');
    if (
      status === 'reembolsado' ||
      status === 'cancelado' ||
      status === 'expirado'
    ) {
      throw new Error(`Pedido ${status} não pode emitir tickets`);
    }

    const qty = Number(pedido.quantidade) || 0;
    if (qty < 1) {
      tx.update(pedidoRef, {
        ticketsEmitidos: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { count: 0, firstQr: '', skipped: false };
    }

    let firstQr = '';
    const now = admin.firestore.FieldValue.serverTimestamp();
    const createdAtIso = new Date().toISOString();

    for (let ordem = 1; ordem <= qty; ordem++) {
      const ticketRef = db().collection('tickets').doc();
      const codigo = generateCodigo();
      const hash = sha256(
        `${ticketRef.id}|${codigo}|${randomToken(8)}|${createdAtIso}`
      );
      const qrPayload = buildQrPayload({
        ticketId: ticketRef.id,
        codigo,
        hash,
        status: 'Disponível',
        createdAt: createdAtIso,
      });
      if (ordem === 1) firstQr = qrPayload;

      tx.set(ticketRef, {
        codigo,
        hash,
        qrPayload,
        eventoId: pedido.eventoId,
        compraId: pedidoId,
        pedidoId,
        ingressoId: pedido.ingressoId || null,
        ingressoKey: pedido.ingressoKey || null,
        ingressoNome: pedido.ingressoNome || null,
        natureza: pedido.natureza || 'entrada',
        status: 'Disponível',
        ordem,
        checkinRealizado: false,
        retiradaRealizada: false,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    tx.update(pedidoRef, {
      ticketsEmitidos: true,
      qrCode: firstQr,
      updatedAt: now,
    });

    return { count: qty, firstQr, skipped: false };
  });
}

export async function releaseStock(
  ingressoId: string,
  qty: number,
  tx?: Tx
): Promise<void> {
  if (!ingressoId || qty <= 0) return;
  const ref = db().collection('ingressos').doc(ingressoId);

  const apply = async (transaction: Tx) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    const data = snap.data() || {};
    const total = Number(data.quantidade) || 0;
    const vendida = Math.max(0, (Number(data.quantidadeVendida) || 0) - qty);
    transaction.update(ref, {
      ...stockFields(total, vendida),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  };

  if (tx) {
    await apply(tx);
    return;
  }
  await db().runTransaction(apply);
}

export async function reserveStock(
  ingressoId: string,
  qty: number
): Promise<void> {
  const ref = db().collection('ingressos').doc(ingressoId);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Ingresso não encontrado');
    const data = snap.data() || {};
    if (data.ativo === false) throw new Error('Ingresso indisponível');
    const total = Number(data.quantidade) || 0;
    const vendida = Number(data.quantidadeVendida) || 0;
    const disponivel = Math.max(0, total - vendida);
    if (qty > disponivel) {
      throw new Error(
        disponivel <= 0
          ? 'Ingresso ESGOTADO'
          : `Apenas ${disponivel} ingresso(s) disponível(is)`
      );
    }
    tx.update(ref, {
      ...stockFields(total, vendida + qty),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Transição de status + liberação de estoque atômica.
 * Só libera se `estoqueReservado` ainda for true no momento do commit.
 */
export async function transitionPedidoReleaseStock(input: {
  pedidoId: string;
  fromStatuses: string[];
  toStatus: string;
  extra?: Record<string, unknown>;
}): Promise<{ applied: boolean; released: boolean; qty: number }> {
  const pedidoRef = db().collection('pedidos').doc(input.pedidoId);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) return { applied: false, released: false, qty: 0 };
    const pedido = snap.data() || {};
    const status = String(pedido.status || '');

    if (!input.fromStatuses.includes(status)) {
      return { applied: false, released: false, qty: 0 };
    }

    const shouldRelease = Boolean(pedido.estoqueReservado);
    const ingressoId = String(pedido.ingressoId || '');
    const qty = Number(pedido.quantidade) || 0;

    tx.update(pedidoRef, {
      status: input.toStatus,
      estoqueReservado: false,
      ...(input.extra || {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (shouldRelease && ingressoId && qty > 0) {
      await releaseStock(ingressoId, qty, tx);
      return { applied: true, released: true, qty };
    }

    return { applied: true, released: false, qty: 0 };
  });
}
