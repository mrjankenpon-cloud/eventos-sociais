import * as admin from 'firebase-admin';
import {
  buildQrPayload,
  db,
  generateCodigo,
  randomToken,
  sha256,
  stockFields,
} from './helpers';

function typeCompetesForEventSeats(data: {
  competeVagasEvento?: unknown;
  natureza?: unknown;
  key?: unknown;
}): boolean {
  if (typeof data.competeVagasEvento === 'boolean') return data.competeVagasEvento;
  const nat = String(data.natureza || '').toLowerCase();
  const key = String(data.key || '').toLowerCase();
  if (nat === 'retirada' || key === 'retirada' || key.startsWith('retirada')) {
    return false;
  }
  return true;
}

function ingressoSoldFields(
  data: Record<string, unknown>,
  nextVendida: number
): Record<string, number> {
  const cap = Number(data.quantidade) || 0;
  const compete = typeCompetesForEventSeats(data);
  if (compete && cap <= 0) {
    return {
      quantidadeVendida: Math.max(0, nextVendida),
      quantidadeDisponivel: 0,
    };
  }
  return stockFields(cap, nextVendida);
}

function soldOutError(disponivel: number, salon?: boolean): Error {
  if (disponivel <= 0) {
    return new Error(salon ? 'Vagas do evento esgotadas' : 'Ingresso ESGOTADO');
  }
  return new Error(
    salon
      ? `Apenas ${disponivel} vaga(s) no salão`
      : `Apenas ${disponivel} ingresso(s) disponível(is)`
  );
}

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

    if (String(pedido.tipo || '') === 'doacao') {
      tx.update(pedidoRef, {
        ticketsEmitidos: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { count: 0, firstQr: '', skipped: true };
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

export async function releaseStockLines(
  lines: Array<{ ingressoId: string; quantidade: number }>,
  tx?: Tx
): Promise<void> {
  const valid = lines.filter((l) => l.ingressoId && l.quantidade > 0);
  if (valid.length === 0) return;

  const apply = async (transaction: Tx) => {
    const rows: Array<{
      ref: admin.firestore.DocumentReference;
      snap: admin.firestore.DocumentSnapshot;
      qty: number;
    }> = [];
    for (const line of valid) {
      const ref = db().collection('ingressos').doc(line.ingressoId);
      const snap = await transaction.get(ref);
      rows.push({ ref, snap, qty: line.quantidade });
    }

    const first = rows.find((r) => r.snap.exists);
    const eventoId = String(first?.snap.data()?.eventoId || '');
    const eventoRef = eventoId ? db().collection('eventos').doc(eventoId) : null;
    const eventoSnap = eventoRef ? await transaction.get(eventoRef) : null;

    let competingQty = 0;
    for (const row of rows) {
      if (!row.snap.exists) continue;
      const data = row.snap.data() || {};
      if (typeCompetesForEventSeats(data)) competingQty += row.qty;
      const vendida = Math.max(
        0,
        (Number(data.quantidadeVendida) || 0) - row.qty
      );
      transaction.update(row.ref, {
        ...ingressoSoldFields(data, vendida),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (eventoSnap?.exists && competingQty > 0 && eventoRef) {
      const ev = eventoSnap.data() || {};
      const vagas = Math.max(0, Number(ev.quantidadeMaxima) || 0);
      const vendidas = Math.max(
        0,
        (Number(ev.vagasVendidasCompetindo) || 0) - competingQty
      );
      transaction.update(eventoRef, {
        vagasVendidasCompetindo: vendidas,
        quantidadeRestante: Math.max(0, vagas - vendidas),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  };

  if (tx) {
    await apply(tx);
    return;
  }
  await db().runTransaction(apply);
}

export async function releaseStock(
  ingressoId: string,
  qty: number,
  tx?: Tx
): Promise<void> {
  await releaseStockLines([{ ingressoId, quantidade: qty }], tx);
}

export async function reserveStockLines(
  lines: Array<{ ingressoId: string; quantidade: number }>
): Promise<void> {
  const valid = lines.filter((l) => l.ingressoId && l.quantidade > 0);
  if (valid.length === 0) return;

  await db().runTransaction(async (tx) => {
    const rows: Array<{
      ref: admin.firestore.DocumentReference;
      snap: admin.firestore.DocumentSnapshot;
      qty: number;
    }> = [];
    for (const line of valid) {
      const ref = db().collection('ingressos').doc(line.ingressoId);
      const snap = await tx.get(ref);
      rows.push({ ref, snap, qty: line.quantidade });
    }

    const first = rows[0];
    if (!first.snap.exists) throw new Error('Ingresso não encontrado');
    const eventoId = String(first.snap.data()?.eventoId || '');
    if (!eventoId) throw new Error('Evento do ingresso não encontrado');
    const eventoRef = db().collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) throw new Error('Evento não encontrado');
    const evento = eventoSnap.data() || {};

    const vagas = Math.max(0, Number(evento.quantidadeMaxima) || 0);
    const vendidas = Math.max(0, Number(evento.vagasVendidasCompetindo) || 0);

    let competingQty = 0;
    for (const row of rows) {
      if (!row.snap.exists) throw new Error('Ingresso não encontrado');
      const data = row.snap.data() || {};
      if (data.ativo === false) throw new Error('Ingresso indisponível');
      if (typeCompetesForEventSeats(data)) competingQty += row.qty;
    }

    const salonAvail = Math.max(0, vagas - vendidas);
    if (competingQty > salonAvail) {
      throw soldOutError(salonAvail, true);
    }

    for (const row of rows) {
      const data = row.snap.data() || {};
      const typeSold = Number(data.quantidadeVendida) || 0;
      const cap = Number(data.quantidade) || 0;
      const compete = typeCompetesForEventSeats(data);
      if (compete) {
        if (cap > 0 && typeSold + row.qty > cap) {
          throw soldOutError(Math.max(0, cap - typeSold));
        }
      } else if (row.qty > Math.max(0, cap - typeSold)) {
        throw soldOutError(Math.max(0, cap - typeSold));
      }
    }

    for (const row of rows) {
      const data = row.snap.data() || {};
      const typeSold = Number(data.quantidadeVendida) || 0;
      tx.update(row.ref, {
        ...ingressoSoldFields(data, typeSold + row.qty),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (competingQty > 0) {
      const nextVendidas = vendidas + competingQty;
      tx.update(eventoRef, {
        vagasVendidasCompetindo: nextVendidas,
        quantidadeRestante: Math.max(0, vagas - nextVendidas),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}

export async function reserveStock(
  ingressoId: string,
  qty: number
): Promise<void> {
  await reserveStockLines([{ ingressoId, quantidade: qty }]);
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

    const eventoId = String(pedido.eventoId || '');
    const eventoRef = eventoId ? db().collection('eventos').doc(eventoId) : null;
    const eventoSnap =
      shouldRelease && eventoRef ? await tx.get(eventoRef) : null;

    tx.update(pedidoRef, {
      status: input.toStatus,
      estoqueReservado: false,
      ...(input.extra || {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let releasedQty = 0;
    let competingQty = 0;
    if (shouldRelease) {
      for (const row of ingressoSnaps) {
        if (!row.snap.exists || row.qty <= 0) continue;
        const data = row.snap.data() || {};
        if (typeCompetesForEventSeats(data)) competingQty += row.qty;
        const vendida = Math.max(
          0,
          (Number(data.quantidadeVendida) || 0) - row.qty
        );
        tx.update(row.ref, {
          ...ingressoSoldFields(data, vendida),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        releasedQty += row.qty;
      }

      if (eventoSnap?.exists && eventoRef && competingQty > 0) {
        const ev = eventoSnap.data() || {};
        const vagas = Math.max(0, Number(ev.quantidadeMaxima) || 0);
        const vendidas = Math.max(
          0,
          (Number(ev.vagasVendidasCompetindo) || 0) - competingQty
        );
        tx.update(eventoRef, {
          vagasVendidasCompetindo: vendidas,
          quantidadeRestante: Math.max(0, vagas - vendidas),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return {
      applied: true,
      released: releasedQty > 0,
      qty: releasedQty,
    };
  });
}
