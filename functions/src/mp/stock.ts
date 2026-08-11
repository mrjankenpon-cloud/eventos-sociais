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

type PedidoItemLine = {
  ingressoId: string;
  nome?: string;
  key?: string;
  natureza?: string;
  quantidade: number;
  valorUnitario?: number;
};

function normalizePedidoItems(
  pedido: Record<string, unknown>
): PedidoItemLine[] {
  const raw = Array.isArray(pedido.itens) ? pedido.itens : [];
  const fromItens: PedidoItemLine[] = [];
  for (const row of raw) {
    const item = (row || {}) as Record<string, unknown>;
    const ingressoId = String(item.ingressoId || '').trim();
    const quantidade = Math.floor(Number(item.quantidade) || 0);
    if (!ingressoId || quantidade < 1) continue;
    fromItens.push({
      ingressoId,
      nome: String(item.nome || pedido.ingressoNome || 'Ingresso'),
      key: String(item.key || pedido.ingressoKey || ''),
      natureza: String(item.natureza || pedido.natureza || 'entrada'),
      quantidade,
      valorUnitario: Number(item.valorUnitario) || undefined,
    });
  }
  if (fromItens.length > 0) return fromItens;

  const ingressoId = String(pedido.ingressoId || '').trim();
  const quantidade = Math.floor(Number(pedido.quantidade) || 0);
  if (!ingressoId || quantidade < 1) return [];
  return [
    {
      ingressoId,
      nome: String(pedido.ingressoNome || 'Ingresso'),
      key: String(pedido.ingressoKey || ''),
      natureza: String(pedido.natureza || 'entrada'),
      quantidade,
      valorUnitario: Number(pedido.valorUnitario) || undefined,
    },
  ];
}

/**
 * Emite tickets de forma atômica: só um caller vence o claim de `ticketsEmitidos`.
 * Impede duplicação sob webhooks concorrentes.
 * Suporta vários tipos de ingresso no mesmo pedido (`itens[]`).
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

    const lines = normalizePedidoItems(pedido);
    const qty = lines.reduce((s, l) => s + l.quantidade, 0);
    if (qty < 1) {
      tx.update(pedidoRef, {
        ticketsEmitidos: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { count: 0, firstQr: '', skipped: false };
    }

    let firstQr = '';
    let ordem = 0;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const createdAtIso = new Date().toISOString();

    for (const line of lines) {
      for (let i = 0; i < line.quantidade; i++) {
        ordem += 1;
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
          ingressoId: line.ingressoId || null,
          ingressoKey: line.key || null,
          ingressoNome: line.nome || null,
          natureza: line.natureza || 'entrada',
          status: 'Disponível',
          ordem,
          checkinRealizado: false,
          retiradaRealizada: false,
          ativo: true,
          createdAt: now,
          updatedAt: now,
        });
      }
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
 * Libera todos os tipos em `itens[]` quando presentes.
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
    const lines = normalizePedidoItems(pedido);
    const ingressoSnaps: Array<{
      ref: admin.firestore.DocumentReference;
      snap: admin.firestore.DocumentSnapshot;
      qty: number;
    }> = [];

    if (shouldRelease) {
      for (const line of lines) {
        const ref = db().collection('ingressos').doc(line.ingressoId);
        const isnap = await tx.get(ref);
        ingressoSnaps.push({ ref, snap: isnap, qty: line.quantidade });
      }
    }

    tx.update(pedidoRef, {
      status: input.toStatus,
      estoqueReservado: false,
      ...(input.extra || {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let releasedQty = 0;
    if (shouldRelease) {
      for (const row of ingressoSnaps) {
        if (!row.snap.exists || row.qty <= 0) continue;
        const data = row.snap.data() || {};
        const total = Number(data.quantidade) || 0;
        const vendida = Math.max(
          0,
          (Number(data.quantidadeVendida) || 0) - row.qty
        );
        tx.update(row.ref, {
          ...stockFields(total, vendida),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        releasedQty += row.qty;
      }
    }

    return {
      applied: true,
      released: releasedQty > 0,
      qty: releasedQty,
    };
  });
}
